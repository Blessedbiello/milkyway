use anchor_lang::prelude::*;

use crate::{
    constants::*,
    errors::ElasticRestakingError,
    events::StakeDeallocated,
    math::calculate_restaking_degree_bps,
    state::{AllocationState, AllocationStatus, NetworkConfig, ServiceState, ValidatorState},
};

#[derive(Accounts)]
#[instruction(service_id: u32, amount: u64)]
pub struct DeallocateStake<'info> {
    pub authority: Signer<'info>,

    #[account(
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
        seeds = [SERVICE_SEED, &service_id.to_le_bytes()],
        bump = service.bump,
    )]
    pub service: Account<'info, ServiceState>,

    #[account(
        mut,
        seeds = [ALLOCATION_SEED, authority.key().as_ref(), &service_id.to_le_bytes()],
        bump = allocation.bump,
        constraint = (
            allocation.status == AllocationStatus::Active ||
            allocation.status == AllocationStatus::Pending
        ) @ ElasticRestakingError::AllocationNotActive,
    )]
    pub allocation: Account<'info, AllocationState>,
}

pub fn handler(ctx: Context<DeallocateStake>, _service_id: u32, amount: u64) -> Result<()> {
    // ── Validate inputs ───────────────────────────────────────────────────────

    require!(amount > 0, ElasticRestakingError::InvalidConfiguration);
    require!(
        amount <= ctx.accounts.allocation.amount,
        ElasticRestakingError::InsufficientStake
    );

    let network_config = &ctx.accounts.network_config;
    let validator_state = &mut ctx.accounts.validator_state;
    let service = &mut ctx.accounts.service;
    let allocation = &mut ctx.accounts.allocation;

    let is_full_deallocation = amount == allocation.amount;

    // ── Reduce committed amount ───────────────────────────────────────────────

    allocation.amount = allocation
        .amount
        .checked_sub(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // effective_amount is capped at effective_stake; after a partial
    // deallocation the validator's effective_stake may be unchanged, so the
    // effective_amount simply tracks the new committed amount.
    allocation.effective_amount = allocation
        .amount
        .min(validator_state.effective_stake);

    // ── Lifecycle transition ──────────────────────────────────────────────────

    let deactivation_epoch = if is_full_deallocation {
        // The allocation enters the Deactivating state and becomes slashable
        // for `deallocation_delay_epochs` more epochs before going Inactive.
        let epoch = network_config
            .current_epoch
            .checked_add(network_config.deallocation_delay_epochs as u64)
            .ok_or(ElasticRestakingError::MathOverflow)?;

        allocation.deactivation_epoch = epoch;
        allocation.status = AllocationStatus::Deactivating;

        // Decrement counters immediately so the validator slot is freed for
        // re-use; the allocation account itself lives until the delay elapses.
        service.validator_count = service
            .validator_count
            .saturating_sub(1);
        validator_state.allocation_count = validator_state
            .allocation_count
            .saturating_sub(1);

        epoch
    } else {
        // Partial deallocation: allocation remains Active/Pending with a
        // smaller committed amount.  No lifecycle transition needed.
        allocation.deactivation_epoch
    };

    // ── Update validator totals ───────────────────────────────────────────────

    validator_state.total_allocated = validator_state
        .total_allocated
        .checked_sub(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // total_effective_allocated can never exceed total_allocated, so subtract
    // the lesser of `amount` and the current total_effective_allocated to
    // avoid underflow when prior slashing already reduced the effective total.
    let effective_reduction = amount.min(validator_state.total_effective_allocated);
    validator_state.total_effective_allocated = validator_state
        .total_effective_allocated
        .checked_sub(effective_reduction)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    validator_state.restaking_degree_bps = calculate_restaking_degree_bps(
        validator_state.total_allocated,
        validator_state.effective_stake,
    )?;

    // ── Update service totals ─────────────────────────────────────────────────

    service.total_allocated = service
        .total_allocated
        .checked_sub(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    let service_effective_reduction = amount.min(service.total_effective_allocated);
    service.total_effective_allocated = service
        .total_effective_allocated
        .checked_sub(service_effective_reduction)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(StakeDeallocated {
        validator: ctx.accounts.authority.key(),
        service_id: ctx.accounts.service.key(),
        amount,
        deactivation_epoch,
    });

    Ok(())
}
