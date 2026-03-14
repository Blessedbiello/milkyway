use anchor_lang::prelude::*;
use anchor_lang::{AccountDeserialize, AccountSerialize};
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    errors::ElasticRestakingError,
    events::SlashFinalized,
    math::calculate_restaking_degree_bps,
    state::{
        AllocationState, AllocationStatus, NetworkConfig, ServiceState, SlashProposal,
        SlashRecord, ValidatorState,
    },
};

#[derive(Accounts)]
pub struct FinalizeSlash<'info> {
    #[account(mut)]
    pub executor: Signer<'info>,

    #[account(
        mut,
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
    )]
    pub network_config: Account<'info, NetworkConfig>,

    #[account(
        mut,
        seeds = [SLASH_PROPOSAL_SEED, &slash_proposal.proposal_id.to_le_bytes()],
        bump = slash_proposal.bump,
        constraint = !slash_proposal.is_vetoed @ ElasticRestakingError::SlashProposalAlreadyVetoed,
        constraint = !slash_proposal.is_finalized @ ElasticRestakingError::SlashProposalAlreadyFinalized,
    )]
    pub slash_proposal: Account<'info, SlashProposal>,

    #[account(
        mut,
        seeds = [SERVICE_SEED, &slash_proposal.service_id.to_le_bytes()],
        bump = service.bump,
    )]
    pub service: Account<'info, ServiceState>,

    #[account(
        init,
        payer = executor,
        space = 8 + SlashRecord::INIT_SPACE,
        seeds = [SLASH_RECORD_SEED, &slash_proposal.proposal_id.to_le_bytes()],
        bump,
    )]
    pub slash_record: Account<'info, SlashRecord>,

    #[account(
        mut,
        seeds = [STAKE_VAULT_SEED],
        bump,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    /// CHECK: validated against network_config.treasury below
    #[account(
        mut,
        constraint = treasury.key() == network_config.treasury @ ElasticRestakingError::Unauthorized,
    )]
    pub treasury: AccountInfo<'info>,

    /// SPL token account owned by the treasury that receives slashed tokens.
    #[account(
        mut,
        constraint = treasury_token_account.owner == network_config.treasury
            @ ElasticRestakingError::Unauthorized,
        constraint = treasury_token_account.mint == network_config.stake_mint
            @ ElasticRestakingError::InvalidConfiguration,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FinalizeSlash>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    // ── Validate: dispute window must have elapsed ────────────────────────────

    require!(
        now >= ctx.accounts.slash_proposal.dispute_end,
        ElasticRestakingError::SlashDisputeWindowNotElapsed
    );

    // ── Snapshot pre-slash global state ───────────────────────────────────────

    let pre_total_effective_stake = ctx.accounts.network_config.total_effective_stake;

    // ── Process validator/allocation pairs in remaining_accounts ──────────────
    //
    // Callers pack accounts as flat pairs: [validator_0, allocation_0,
    // validator_1, allocation_1, ...].  We iterate in chunks of two, deserialize
    // each account manually (bypassing the normal Anchor account validation so we
    // can handle a dynamic number of pairs), apply the slash, and write back.

    let remaining = &ctx.remaining_accounts;

    require!(
        remaining.len() % 2 == 0,
        ElasticRestakingError::InvalidConfiguration
    );

    let pair_count = remaining.len() / 2;
    require!(
        pair_count <= MAX_VALIDATORS_PER_SLASH,
        ElasticRestakingError::InvalidConfiguration
    );

    let service_id = ctx.accounts.slash_proposal.service_id;
    let proposal_id_u32 = ctx.accounts.slash_proposal.proposal_id;
    let mut total_slashed: u64 = 0;
    let mut validators_affected: u32 = 0;

    for chunk in remaining.chunks(2) {
        let validator_info = &chunk[0];
        let allocation_info = &chunk[1];

        // ── Deserialize ───────────────────────────────────────────────────────

        let mut validator_state: ValidatorState = {
            let data = validator_info.try_borrow_data()?;
            let mut slice: &[u8] = &data;
            ValidatorState::try_deserialize(&mut slice)?
        };

        let mut allocation_state: AllocationState = {
            let data = allocation_info.try_borrow_data()?;
            let mut slice: &[u8] = &data;
            AllocationState::try_deserialize(&mut slice)?
        };

        // ── Safety checks ─────────────────────────────────────────────────────

        // Only process allocations that target this slashed service.
        require!(
            allocation_state.service_id == service_id,
            ElasticRestakingError::InvalidConfiguration
        );

        // Allocation must belong to the validator in this pair.
        require!(
            allocation_state.validator == validator_state.authority,
            ElasticRestakingError::InvalidConfiguration
        );

        // Skip allocations that are already inactive (idempotency guard).
        if allocation_state.status == AllocationStatus::Inactive
            || allocation_state.effective_amount == 0
        {
            continue;
        }

        // ── Apply elastic slash ───────────────────────────────────────────────
        //
        // The validator's effective_stake is reduced by exactly the amount they
        // had effectively allocated to the Byzantine service.  Their other
        // allocations will be stretched via rebalance_allocations in a separate
        // call.

        let slash_amount = allocation_state.effective_amount;

        validator_state.effective_stake =
            validator_state.effective_stake.saturating_sub(slash_amount);

        validator_state.total_allocated = validator_state
            .total_allocated
            .saturating_sub(allocation_state.amount);

        validator_state.total_effective_allocated = validator_state
            .total_effective_allocated
            .saturating_sub(allocation_state.effective_amount);

        // Recompute restaking degree against the updated (lower) effective_stake.
        validator_state.restaking_degree_bps = calculate_restaking_degree_bps(
            validator_state.total_allocated,
            // Use raw stake as the denominator: effective_stake was slashed and
            // may now be lower than total_allocated which would produce an
            // artificially high degree.  The authoritative denominator for
            // degree calculation is the original raw stake.
            validator_state.stake,
        )
        .unwrap_or(0);

        // Zero out and deactivate the allocation.
        allocation_state.amount = 0;
        allocation_state.effective_amount = 0;
        allocation_state.status = AllocationStatus::Inactive;

        total_slashed = total_slashed
            .checked_add(slash_amount)
            .ok_or(ElasticRestakingError::MathOverflow)?;

        validators_affected = validators_affected
            .checked_add(1)
            .ok_or(ElasticRestakingError::MathOverflow)?;

        // ── Write back ────────────────────────────────────────────────────────

        {
            let mut data = validator_info.try_borrow_mut_data()?;
            let mut writer: &mut [u8] = &mut data;
            validator_state.try_serialize(&mut writer)?;
        }

        {
            let mut data = allocation_info.try_borrow_mut_data()?;
            let mut writer: &mut [u8] = &mut data;
            allocation_state.try_serialize(&mut writer)?;
        }
    }

    // ── Freeze the slashed service ────────────────────────────────────────────

    let service = &mut ctx.accounts.service;
    service.is_slashed = true;
    service.is_active = false;
    service.slashed_at = now;
    service.total_allocated = 0;
    service.total_effective_allocated = 0;
    service.slash_record = ctx.accounts.slash_record.key();

    // ── Finalize the proposal ─────────────────────────────────────────────────

    ctx.accounts.slash_proposal.is_finalized = true;

    // ── Transfer slashed tokens from vault to treasury ────────────────────────

    if total_slashed > 0 {
        let network_config_bump = ctx.accounts.network_config.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[NETWORK_CONFIG_SEED, &[network_config_bump]]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.stake_vault.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.network_config.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, total_slashed)?;
    }

    // ── Update global effective stake ─────────────────────────────────────────

    let network_config = &mut ctx.accounts.network_config;
    network_config.total_effective_stake =
        network_config.total_effective_stake.saturating_sub(total_slashed);

    let post_total_effective_stake = network_config.total_effective_stake;

    // ── Write slash record ────────────────────────────────────────────────────

    let slash_record = &mut ctx.accounts.slash_record;
    slash_record.slash_id = proposal_id_u32;
    slash_record.service_id = service_id;
    slash_record.executed_by = ctx.accounts.executor.key();
    slash_record.validators_affected = validators_affected;
    slash_record.total_slashed = total_slashed;
    slash_record.pre_total_effective_stake = pre_total_effective_stake;
    slash_record.post_total_effective_stake = post_total_effective_stake;
    slash_record.timestamp = now;
    slash_record.bump = ctx.bumps.slash_record;
    slash_record._reserved = [0u8; 64];

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(SlashFinalized {
        proposal_id: ctx.accounts.slash_proposal.key(),
        service_id: ctx.accounts.service.key(),
        slash_id: slash_record.key(),
        validators_affected,
        total_slashed,
    });

    Ok(())
}
