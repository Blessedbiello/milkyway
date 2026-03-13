use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    errors::ElasticRestakingError,
    events::WithdrawalCompleted,
    state::{NetworkConfig, ValidatorState, WithdrawalTicket},
};

#[derive(Accounts)]
pub struct CompleteWithdrawal<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
    )]
    pub network_config: Account<'info, NetworkConfig>,

    #[account(
        mut,
        seeds = [VALIDATOR_SEED, authority.key().as_ref()],
        bump = validator_state.bump,
        has_one = authority @ ElasticRestakingError::Unauthorized,
    )]
    pub validator_state: Account<'info, ValidatorState>,

    #[account(
        mut,
        seeds = [WITHDRAWAL_SEED, authority.key().as_ref(), &withdrawal_ticket.ticket_id.to_le_bytes()],
        bump = withdrawal_ticket.bump,
        constraint = withdrawal_ticket.validator == authority.key()
            @ ElasticRestakingError::Unauthorized,
        close = authority,
    )]
    pub withdrawal_ticket: Account<'info, WithdrawalTicket>,

    #[account(
        mut,
        seeds = [STAKE_VAULT_SEED],
        bump,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = authority_token_account.owner == authority.key()
            @ ElasticRestakingError::Unauthorized,
        constraint = authority_token_account.mint == network_config.stake_mint
            @ ElasticRestakingError::InvalidConfiguration,
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CompleteWithdrawal>) -> Result<()> {
    let network_config = &ctx.accounts.network_config;
    let withdrawal_ticket = &ctx.accounts.withdrawal_ticket;

    // ── Validate cooldown has elapsed ─────────────────────────────────────────

    let cooldown = network_config.withdrawal_cooldown_epochs as u64;
    let earliest_claimable_epoch = withdrawal_ticket
        .epoch_requested
        .checked_add(cooldown)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    require!(
        network_config.current_epoch >= earliest_claimable_epoch,
        ElasticRestakingError::WithdrawalCooldownNotElapsed
    );

    let amount = withdrawal_ticket.amount;
    let ticket_pubkey = withdrawal_ticket.key();

    // ── CPI: transfer from stake_vault to authority, signed by network_config PDA
    //
    // stake_vault.authority == network_config (set at initialisation), so we
    // use network_config's PDA seeds as the CPI signer.

    let signer_seeds: &[&[&[u8]]] = &[&[NETWORK_CONFIG_SEED, &[network_config.bump]]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.stake_vault.to_account_info(),
        to: ctx.accounts.authority_token_account.to_account_info(),
        authority: ctx.accounts.network_config.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    // ── Update validator state ────────────────────────────────────────────────

    let validator_state = &mut ctx.accounts.validator_state;

    validator_state.stake = validator_state
        .stake
        .checked_sub(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // effective_stake cannot exceed actual stake after the reduction.
    validator_state.effective_stake = validator_state
        .effective_stake
        .min(validator_state.stake);

    validator_state.pending_withdrawal = validator_state
        .pending_withdrawal
        .checked_sub(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // ── Update global totals ──────────────────────────────────────────────────

    let network_config = &mut ctx.accounts.network_config;

    network_config.total_staked = network_config
        .total_staked
        .checked_sub(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // total_effective_stake tracks the sum of all validator effective_stake
    // values.  After clamping validator_state.effective_stake above, the delta
    // we subtract from the global total is `amount` at most — but could be
    // smaller if effective_stake was already below the new stake level.
    // The safest invariant-preserving approach is to subtract the same `amount`
    // and clamp total_effective_stake to total_staked as a floor.
    network_config.total_effective_stake = network_config
        .total_effective_stake
        .saturating_sub(amount)
        .min(network_config.total_staked);

    // ── Emit ──────────────────────────────────────────────────────────────────
    // Note: withdrawal_ticket account is closed (via `close = authority`) after
    // this handler returns, so we capture what we need before the borrow ends.

    emit!(WithdrawalCompleted {
        validator: ctx.accounts.authority.key(),
        ticket_id: ticket_pubkey,
        amount,
    });

    Ok(())
}
