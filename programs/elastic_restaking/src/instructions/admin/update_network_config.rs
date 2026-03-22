use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::ElasticRestakingError;
use crate::events::NetworkConfigUpdated;
use crate::state::NetworkConfig;

/// All fields are optional — only `Some(_)` values are applied. This avoids
/// the need for a separate instruction per parameter while keeping the on-chain
/// transaction explicit about which fields are being changed.
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateConfigParams {
    pub target_restaking_degree_bps: Option<u32>,
    pub max_restaking_degree_bps: Option<u32>,
    pub epoch_duration: Option<i64>,
    pub withdrawal_cooldown_epochs: Option<u8>,
    pub allocation_delay_epochs: Option<u8>,
    pub deallocation_delay_epochs: Option<u8>,
    pub slash_dispute_window: Option<i64>,
    pub min_stake_amount: Option<u64>,
    pub deposit_fee_bps: Option<u16>,
    pub reward_commission_bps: Option<u16>,
    pub is_paused: Option<bool>,
}

#[derive(Accounts)]
pub struct UpdateNetworkConfig<'info> {
    /// Must be the current authority recorded in `network_config`.
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
        has_one = authority @ ElasticRestakingError::Unauthorized,
    )]
    pub network_config: Account<'info, NetworkConfig>,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Emit a `NetworkConfigUpdated` event only when `old != new`, then apply the
/// change.  The event schema uses `u64` for all values; callers document the
/// unit in the `field_name` literal.
///
/// Encoding conventions for non-u64 types:
///   - `u32` / `u16` → zero-extended to u64
///   - `u8`          → zero-extended to u64
///   - `i64`         → bit-cast via `as u64` (two's-complement interpretation)
///   - `bool`        → `false = 0`, `true = 1`
macro_rules! apply_field {
    // u64 variant (identity conversion)
    ($field:expr, $new:expr, $name:literal) => {
        if let Some(v) = $new {
            let old = $field;
            if old != v {
                $field = v;
                emit!(NetworkConfigUpdated {
                    field_name: $name.to_string(),
                    old_value: old as u64,
                    new_value: v as u64,
                });
            }
        }
    };
    // i64 variant — bit-reinterpret via `as u64`
    (i64 $field:expr, $new:expr, $name:literal) => {
        if let Some(v) = $new {
            let old = $field;
            if old != v {
                $field = v;
                emit!(NetworkConfigUpdated {
                    field_name: $name.to_string(),
                    old_value: old as u64,
                    new_value: v as u64,
                });
            }
        }
    };
    // bool variant
    (bool $field:expr, $new:expr, $name:literal) => {
        if let Some(v) = $new {
            let old = $field;
            if old != v {
                $field = v;
                emit!(NetworkConfigUpdated {
                    field_name: $name.to_string(),
                    old_value: old as u64,
                    new_value: v as u64,
                });
            }
        }
    };
}

pub fn handler(ctx: Context<UpdateNetworkConfig>, params: UpdateConfigParams) -> Result<()> {
    // ── Pre-validate the incoming parameters ─────────────────────────────────
    //
    // Resolve effective target and max values accounting for fields that may be
    // updated together or individually. We must validate the relationship
    // target <= max using the *new* values (falling back to the existing ones
    // for any field not present in this call).
    let effective_target = params
        .target_restaking_degree_bps
        .unwrap_or(ctx.accounts.network_config.target_restaking_degree_bps);

    let effective_max = params
        .max_restaking_degree_bps
        .unwrap_or(ctx.accounts.network_config.max_restaking_degree_bps);

    // Restaking degree bps can legitimately exceed MAX_BPS (e.g. 2× = 20 000
    // bps) so we do not cap them at 10 000.  We only enforce target <= max.
    require!(
        effective_target <= effective_max,
        ElasticRestakingError::InvalidConfiguration
    );

    if let Some(epoch_duration) = params.epoch_duration {
        require!(
            epoch_duration >= 0,
            ElasticRestakingError::InvalidConfiguration
        );
    }

    if let Some(slash_dispute_window) = params.slash_dispute_window {
        require!(
            slash_dispute_window >= 0,
            ElasticRestakingError::InvalidConfiguration
        );
    }

    if let Some(min_stake_amount) = params.min_stake_amount {
        require!(
            min_stake_amount > 0,
            ElasticRestakingError::InvalidConfiguration
        );
    }

    // deposit_fee_bps and reward_commission_bps are plain fractional fees
    // (≤ 100 %), so they must not exceed MAX_BPS.
    if let Some(deposit_fee_bps) = params.deposit_fee_bps {
        require!(
            deposit_fee_bps as u32 <= MAX_BPS,
            ElasticRestakingError::InvalidBasisPoints
        );
    }

    if let Some(reward_commission_bps) = params.reward_commission_bps {
        require!(
            reward_commission_bps as u32 <= MAX_BPS,
            ElasticRestakingError::InvalidBasisPoints
        );
    }

    // ── Apply validated updates ───────────────────────────────────────────────
    // Each `apply_field!` call is a no-op when the incoming value equals the
    // existing one, ensuring idempotent updates never produce spurious events.

    let config = &mut ctx.accounts.network_config;

    apply_field!(
        config.target_restaking_degree_bps,
        params.target_restaking_degree_bps,
        "target_restaking_degree_bps"
    );
    apply_field!(
        config.max_restaking_degree_bps,
        params.max_restaking_degree_bps,
        "max_restaking_degree_bps"
    );
    apply_field!(
        i64 config.epoch_duration,
        params.epoch_duration,
        "epoch_duration"
    );
    apply_field!(
        config.withdrawal_cooldown_epochs,
        params.withdrawal_cooldown_epochs,
        "withdrawal_cooldown_epochs"
    );
    apply_field!(
        config.allocation_delay_epochs,
        params.allocation_delay_epochs,
        "allocation_delay_epochs"
    );
    apply_field!(
        config.deallocation_delay_epochs,
        params.deallocation_delay_epochs,
        "deallocation_delay_epochs"
    );
    apply_field!(
        i64 config.slash_dispute_window,
        params.slash_dispute_window,
        "slash_dispute_window"
    );
    apply_field!(
        config.min_stake_amount,
        params.min_stake_amount,
        "min_stake_amount"
    );
    apply_field!(
        config.deposit_fee_bps,
        params.deposit_fee_bps,
        "deposit_fee_bps"
    );
    apply_field!(
        config.reward_commission_bps,
        params.reward_commission_bps,
        "reward_commission_bps"
    );
    apply_field!(
        bool config.is_paused,
        params.is_paused,
        "is_paused"
    );

    Ok(())
}
