use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    errors::ElasticRestakingError,
    events::StakeDeposited,
    math::calculate_fee,
    state::{NetworkConfig, ValidatorState},
};

#[derive(Accounts)]
pub struct DepositStake<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
        constraint = !network_config.is_paused @ ElasticRestakingError::NetworkPaused,
    )]
    pub network_config: Account<'info, NetworkConfig>,

    #[account(
        init_if_needed,
        payer = depositor,
        space = 8 + ValidatorState::INIT_SPACE,
        seeds = [VALIDATOR_SEED, depositor.key().as_ref()],
        bump,
    )]
    pub validator_state: Account<'info, ValidatorState>,

    #[account(
        mut,
        constraint = depositor_token_account.mint == network_config.stake_mint
            @ ElasticRestakingError::InvalidConfiguration,
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [STAKE_VAULT_SEED],
        bump,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<DepositStake>, amount: u64) -> Result<()> {
    let is_first_deposit = ctx.accounts.validator_state.stake == 0;

    // ── Validate inputs ───────────────────────────────────────────────────────

    // Minimum stake check only applies on first deposit (i.e. registration).
    // Subsequent top-ups may be any positive amount.
    if is_first_deposit {
        require!(amount > 0, ElasticRestakingError::StakeBelowMinimum);
        require!(
            amount >= ctx.accounts.network_config.min_stake_amount,
            ElasticRestakingError::StakeBelowMinimum
        );

        // Guard against exceeding the global validator cap.
        require!(
            ctx.accounts.network_config.validator_count < MAX_VALIDATORS,
            ElasticRestakingError::MaxValidatorsReached
        );
    } else {
        require!(amount > 0, ElasticRestakingError::InsufficientStake);
    }

    // ── Fee calculation ───────────────────────────────────────────────────────

    let deposit_fee_bps = ctx.accounts.network_config.deposit_fee_bps;
    let fee = calculate_fee(amount, deposit_fee_bps)?;
    let net_amount = amount
        .checked_sub(fee)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // ── CPI: transfer `amount` (gross) from depositor into stake vault ────────
    // The protocol keeps the fee inside the vault to fund the treasury later;
    // only net_amount is credited to the validator's stake balance.

    let cpi_accounts = Transfer {
        from: ctx.accounts.depositor_token_account.to_account_info(),
        to: ctx.accounts.stake_vault.to_account_info(),
        authority: ctx.accounts.depositor.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );
    token::transfer(cpi_ctx, amount)?;

    // ── Initialise ValidatorState on first deposit ────────────────────────────

    let validator_state = &mut ctx.accounts.validator_state;

    if is_first_deposit {
        validator_state.authority = ctx.accounts.depositor.key();
        validator_state.total_allocated = 0;
        validator_state.total_effective_allocated = 0;
        validator_state.restaking_degree_bps = 0;
        validator_state.allocation_count = 0;
        validator_state.cumulative_rewards = 0;
        validator_state.pending_rewards = 0;
        validator_state.last_reward_epoch = 0;
        validator_state.pending_withdrawal = 0;
        validator_state.is_active = true;
        validator_state.created_at = Clock::get()?.unix_timestamp;
        validator_state.bump = ctx.bumps.validator_state;
        validator_state._reserved = [0u8; 128];

        let network_config = &mut ctx.accounts.network_config;
        network_config.validator_count = network_config
            .validator_count
            .checked_add(1)
            .ok_or(ElasticRestakingError::MathOverflow)?;
    }

    // ── Update stake balances ─────────────────────────────────────────────────

    validator_state.stake = validator_state
        .stake
        .checked_add(net_amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    validator_state.effective_stake = validator_state
        .effective_stake
        .checked_add(net_amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    let network_config = &mut ctx.accounts.network_config;

    network_config.total_staked = network_config
        .total_staked
        .checked_add(net_amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    network_config.total_effective_stake = network_config
        .total_effective_stake
        .checked_add(net_amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(StakeDeposited {
        validator: ctx.accounts.depositor.key(),
        amount,
        fee,
        new_total_stake: validator_state.stake,
    });

    Ok(())
}
