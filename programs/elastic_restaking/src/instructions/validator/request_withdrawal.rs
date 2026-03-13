use anchor_lang::prelude::*;

use crate::{
    constants::*,
    errors::ElasticRestakingError,
    events::WithdrawalRequested,
    state::{NetworkConfig, ValidatorState, WithdrawalTicket},
};

#[derive(Accounts)]
#[instruction(amount: u64, ticket_id: u32)]
pub struct RequestWithdrawal<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
        constraint = !network_config.is_paused @ ElasticRestakingError::NetworkPaused,
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
        init,
        payer = authority,
        space = 8 + WithdrawalTicket::INIT_SPACE,
        seeds = [WITHDRAWAL_SEED, authority.key().as_ref(), &ticket_id.to_le_bytes()],
        bump,
    )]
    pub withdrawal_ticket: Account<'info, WithdrawalTicket>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RequestWithdrawal>, amount: u64, ticket_id: u32) -> Result<()> {
    // ── Validate inputs ───────────────────────────────────────────────────────

    require!(amount > 0, ElasticRestakingError::InsufficientStake);

    let validator_state = &ctx.accounts.validator_state;
    let network_config = &ctx.accounts.network_config;

    // Compute stake available after this withdrawal plus already-pending ones.
    // pending_withdrawal already accounts for previously opened tickets, so we
    // must include the new `amount` in the "reserved" total before checking.
    let total_reserved = validator_state
        .pending_withdrawal
        .checked_add(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    let remaining_stake = validator_state
        .stake
        .checked_sub(total_reserved)
        .ok_or(ElasticRestakingError::InsufficientWithdrawableStake)?;

    // Safety invariant: remaining_stake * max_restaking_degree_bps >= total_allocated * BPS_DENOMINATOR
    //
    // Rearranged to avoid floating-point: check
    //   remaining_stake * max_restaking_degree_bps >= total_allocated * BPS_DENOMINATOR
    // using u128 arithmetic to prevent overflow.
    let lhs = (remaining_stake as u128)
        .checked_mul(network_config.max_restaking_degree_bps as u128)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    let rhs = (validator_state.total_allocated as u128)
        .checked_mul(BPS_DENOMINATOR as u128)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    require!(lhs >= rhs, ElasticRestakingError::InsufficientWithdrawableStake);

    // ── Initialise withdrawal ticket ──────────────────────────────────────────

    let clock = Clock::get()?;
    let ticket = &mut ctx.accounts.withdrawal_ticket;

    ticket.validator = ctx.accounts.authority.key();
    ticket.ticket_id = ticket_id;
    ticket.amount = amount;
    ticket.epoch_requested = network_config.current_epoch;
    ticket.is_claimable = false;
    ticket.created_at = clock.unix_timestamp;
    ticket.bump = ctx.bumps.withdrawal_ticket;
    ticket._reserved = [0u8; 32];

    // ── Update validator pending withdrawal ───────────────────────────────────

    let validator_state = &mut ctx.accounts.validator_state;

    validator_state.pending_withdrawal = validator_state
        .pending_withdrawal
        .checked_add(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(WithdrawalRequested {
        validator: ctx.accounts.authority.key(),
        ticket_id: ctx.accounts.withdrawal_ticket.key(),
        amount,
        epoch: network_config.current_epoch,
    });

    Ok(())
}
