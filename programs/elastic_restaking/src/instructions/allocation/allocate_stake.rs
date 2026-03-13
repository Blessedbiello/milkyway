use anchor_lang::prelude::*;

use crate::{
    constants::*,
    errors::ElasticRestakingError,
    events::StakeAllocated,
    math::calculate_restaking_degree_bps,
    state::{AllocationState, AllocationStatus, NetworkConfig, ServiceState, ValidatorState},
};

#[derive(Accounts)]
#[instruction(service_id: u32, amount: u64)]
pub struct AllocateStake<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
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
        mut,
        seeds = [SERVICE_SEED, &service_id.to_le_bytes()],
        bump = service.bump,
        constraint = service.is_active @ ElasticRestakingError::ServiceNotActive,
        constraint = !service.is_slashed @ ElasticRestakingError::ServiceAlreadySlashed,
    )]
    pub service: Account<'info, ServiceState>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + AllocationState::INIT_SPACE,
        seeds = [ALLOCATION_SEED, authority.key().as_ref(), &service_id.to_le_bytes()],
        bump,
    )]
    pub allocation: Account<'info, AllocationState>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AllocateStake>, service_id: u32, amount: u64) -> Result<()> {
    // ── Validate inputs ───────────────────────────────────────────────────────

    require!(amount > 0, ElasticRestakingError::InvalidConfiguration);

    let network_config = &ctx.accounts.network_config;
    let validator_state = &mut ctx.accounts.validator_state;
    let service = &mut ctx.accounts.service;
    let allocation = &mut ctx.accounts.allocation;

    // ── Single-allocation cap ─────────────────────────────────────────────────
    //
    // Each individual allocation to a service is capped at the validator's full
    // effective stake.  This prevents a validator from concentrating all
    // leveraged exposure onto a single service.

    let new_allocation_amount = allocation
        .amount
        .checked_add(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    require!(
        new_allocation_amount <= validator_state.effective_stake,
        ElasticRestakingError::ExceedsSingleAllocationCap
    );

    // ── Elastic degree cap ────────────────────────────────────────────────────
    //
    // The SUM of all allocations across all services may exceed effective_stake
    // (this is the core elastic mechanic), but is bounded by max_restaking_degree_bps.
    //
    // new_total * BPS_DENOMINATOR <= effective_stake * max_restaking_degree_bps
    //
    // All arithmetic in u128 to prevent overflow on the multiplication.

    let new_total = (validator_state.total_allocated as u128)
        .checked_add(amount as u128)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    let max_allowed = (validator_state.effective_stake as u128)
        .checked_mul(network_config.max_restaking_degree_bps as u128)
        .ok_or(ElasticRestakingError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR as u128)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    require!(
        new_total <= max_allowed,
        ElasticRestakingError::ExceedsMaxRestakingDegree
    );

    // ── Allocation lifecycle ───────────────────────────────────────────────────

    let current_epoch = network_config.current_epoch;
    let now = Clock::get()?.unix_timestamp;

    // When init_if_needed creates a brand-new account every byte is zero.
    // AllocationStatus::Pending = 0, so a freshly initialised account has
    // status == Pending AND validator == Pubkey::default().  We use the
    // default pubkey as the sentinel for "never written" rather than adding a
    // separate is_initialized flag.
    let is_new_account = allocation.validator == Pubkey::default();

    match allocation.status {
        // ── Pending: either a brand-new account or an existing pending one ────
        AllocationStatus::Pending => {
            if is_new_account {
                // First-time initialisation: write all identity fields.
                allocation.validator = ctx.accounts.authority.key();
                allocation.service_id = service_id;
                allocation.created_at = now;
                allocation.bump = ctx.bumps.allocation;
                allocation.reward_debt = 0;
                allocation.pending_rewards = 0;
                allocation.last_reward_epoch = 0;
                allocation.deactivation_epoch = 0;
                allocation._reserved = [0u8; 64];

                allocation.activation_epoch = current_epoch
                    .checked_add(network_config.allocation_delay_epochs as u64)
                    .ok_or(ElasticRestakingError::MathOverflow)?;
                // status stays Pending

                service.validator_count = service
                    .validator_count
                    .checked_add(1)
                    .ok_or(ElasticRestakingError::MathOverflow)?;
                validator_state.allocation_count = validator_state
                    .allocation_count
                    .checked_add(1)
                    .ok_or(ElasticRestakingError::MathOverflow)?;
            }
            // Existing Pending allocation: just increase the amount below.
        }

        // ── Active: increase the committed amount ─────────────────────────────
        AllocationStatus::Active => {
            // No lifecycle transition needed; fall through to amount update.
        }

        // ── Inactive: reactivate with a fresh pending delay ───────────────────
        AllocationStatus::Inactive => {
            allocation.activation_epoch = current_epoch
                .checked_add(network_config.allocation_delay_epochs as u64)
                .ok_or(ElasticRestakingError::MathOverflow)?;
            allocation.deactivation_epoch = 0;
            allocation.status = AllocationStatus::Pending;

            // Re-entering this service counts as a new allocation slot.
            service.validator_count = service
                .validator_count
                .checked_add(1)
                .ok_or(ElasticRestakingError::MathOverflow)?;
            validator_state.allocation_count = validator_state
                .allocation_count
                .checked_add(1)
                .ok_or(ElasticRestakingError::MathOverflow)?;
        }

        // ── Deactivating: reject — caller must wait for full deactivation ─────
        AllocationStatus::Deactivating => {
            return err!(ElasticRestakingError::AllocationDeactivating);
        }
    }

    // ── Update amounts ────────────────────────────────────────────────────────

    allocation.amount = new_allocation_amount;
    // effective_amount mirrors amount here; slashing/rebalancing will
    // reduce it independently.
    allocation.effective_amount = allocation.amount;

    // ── Update validator totals ───────────────────────────────────────────────

    validator_state.total_allocated = validator_state
        .total_allocated
        .checked_add(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    validator_state.total_effective_allocated = validator_state
        .total_effective_allocated
        .checked_add(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    validator_state.restaking_degree_bps = calculate_restaking_degree_bps(
        validator_state.total_allocated,
        validator_state.effective_stake,
    )?;

    // ── Update service totals ─────────────────────────────────────────────────

    service.total_allocated = service
        .total_allocated
        .checked_add(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    service.total_effective_allocated = service
        .total_effective_allocated
        .checked_add(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(StakeAllocated {
        validator: ctx.accounts.authority.key(),
        service_id: ctx.accounts.service.key(),
        amount,
        new_total_allocated: validator_state.total_allocated,
        activation_epoch: allocation.activation_epoch,
    });

    Ok(())
}
