use anchor_lang::prelude::*;
use anchor_lang::{AccountDeserialize, AccountSerialize};

use crate::{
    constants::*,
    errors::ElasticRestakingError,
    events::AllocationsRebalanced,
    math::calculate_restaking_degree_bps,
    state::{AllocationState, AllocationStatus, ServiceState, ValidatorState},
};

/// Elastic stretching — permissionless rebalance of a validator's allocation
/// effective amounts after their `effective_stake` has been reduced by a slash.
///
/// For each active allocation: `new_effective = min(nominal_amount, effective_stake)`.
/// When a validator's `effective_stake` drops, the remaining allocations
/// "stretch" to fill the reduced capacity rather than being cancelled.
///
/// This instruction is idempotent: calling it again after the validator's stake
/// has already been rebalanced produces no state change (all diffs are zero).
///
/// Remaining accounts are packed as flat pairs:
///   [allocation_0, service_0, allocation_1, service_1, ...]
#[derive(Accounts)]
pub struct RebalanceAllocations<'info> {
    /// Anyone may trigger a rebalance on behalf of any validator.
    pub caller: Signer<'info>,

    /// The validator whose allocations are being rebalanced.
    #[account(mut)]
    pub validator_state: Account<'info, ValidatorState>,
}

pub fn handler(ctx: Context<RebalanceAllocations>) -> Result<()> {
    let remaining = &ctx.remaining_accounts;

    require!(
        remaining.len() % 2 == 0,
        ElasticRestakingError::InvalidConfiguration
    );

    let pair_count = remaining.len() / 2;
    require!(
        pair_count <= MAX_ALLOCATIONS_PER_REBALANCE,
        ElasticRestakingError::InvalidConfiguration
    );

    let validator_effective_stake = ctx.accounts.validator_state.effective_stake;
    let mut total_effective_decrease: u64 = 0;
    let mut allocations_updated: u32 = 0;

    for chunk in remaining.chunks(2) {
        let allocation_info = &chunk[0];
        let service_info = &chunk[1];

        // ── Deserialize ───────────────────────────────────────────────────────

        let mut allocation_state: AllocationState = {
            let data = allocation_info.try_borrow_data()?;
            let mut slice: &[u8] = &data;
            AllocationState::try_deserialize(&mut slice)?
        };

        let mut service_state: ServiceState = {
            let data = service_info.try_borrow_data()?;
            let mut slice: &[u8] = &data;
            ServiceState::try_deserialize(&mut slice)?
        };

        // ── Ownership check ───────────────────────────────────────────────────

        require!(
            allocation_state.validator == ctx.accounts.validator_state.authority,
            ElasticRestakingError::Unauthorized
        );

        // Skip inactive allocations — they carry no effective exposure.
        if allocation_state.status == AllocationStatus::Inactive {
            continue;
        }

        // ── Elastic stretch calculation ───────────────────────────────────────
        //
        // The effective amount can never exceed the validator's current
        // effective_stake (single-allocation cap: one service cannot receive
        // more cover than the validator's total risk-adjusted stake).
        //
        // After a slash reduces effective_stake, some allocations will be
        // "over-effective" and need to be pulled back to the new cap.

        let old_effective = allocation_state.effective_amount;
        let new_effective = allocation_state.amount.min(validator_effective_stake);

        // Only adjust if there is an actual change (keeps the instruction
        // idempotent and avoids unnecessary write-backs).
        if new_effective == old_effective {
            continue;
        }

        // ── Compute delta and update allocation ───────────────────────────────

        // After a slash effective_stake shrinks, so new_effective <= old_effective.
        // We model this as an unsigned decrease; the saturating_sub below is a
        // safety net for any unexpected edge case (e.g. re-deposit between slash
        // and rebalance increasing effective_stake above the old effective amount).
        let decrease = old_effective.saturating_sub(new_effective);

        allocation_state.effective_amount = new_effective;

        // ── Update service totals ─────────────────────────────────────────────

        service_state.total_effective_allocated =
            service_state.total_effective_allocated.saturating_sub(decrease);

        total_effective_decrease = total_effective_decrease
            .checked_add(decrease)
            .ok_or(ElasticRestakingError::MathOverflow)?;

        allocations_updated = allocations_updated
            .checked_add(1)
            .ok_or(ElasticRestakingError::MathOverflow)?;

        // ── Write back ────────────────────────────────────────────────────────

        {
            let mut data = allocation_info.try_borrow_mut_data()?;
            let mut writer: &mut [u8] = &mut data;
            allocation_state.try_serialize(&mut writer)?;
        }

        {
            let mut data = service_info.try_borrow_mut_data()?;
            let mut writer: &mut [u8] = &mut data;
            service_state.try_serialize(&mut writer)?;
        }
    }

    // ── Update validator totals ───────────────────────────────────────────────

    if total_effective_decrease > 0 {
        let validator_state = &mut ctx.accounts.validator_state;

        validator_state.total_effective_allocated = validator_state
            .total_effective_allocated
            .saturating_sub(total_effective_decrease);

        // Recompute the restaking degree now that effective allocated has changed.
        validator_state.restaking_degree_bps = calculate_restaking_degree_bps(
            validator_state.total_allocated,
            validator_state.stake,
        )
        .unwrap_or(0);
    }

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(AllocationsRebalanced {
        validator: ctx.accounts.validator_state.authority,
        allocations_updated,
    });

    Ok(())
}
