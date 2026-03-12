use anchor_lang::prelude::*;

use crate::{
    constants::MAX_BPS,
    errors::ElasticRestakingError,
    events::ServiceUpdated,
    state::ServiceState,
};

#[derive(Accounts)]
pub struct UpdateService<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority @ ElasticRestakingError::Unauthorized,
    )]
    pub service: Account<'info, ServiceState>,
}

pub fn handler(
    ctx: Context<UpdateService>,
    new_metadata_uri: Option<[u8; 128]>,
    new_attack_threshold_bps: Option<u32>,
    new_attack_prize: Option<u64>,
) -> Result<()> {
    let service = &mut ctx.accounts.service;

    // ── Validate and apply metadata_uri update (always permitted) ─────────────

    if let Some(uri) = new_metadata_uri {
        service.metadata_uri = uri;
    }

    // ── Validate and apply attack parameter updates ───────────────────────────
    //
    // Once at least one validator has allocated to this service the economic
    // parameters are locked.  Changing them after allocations exist would
    // silently shift the risk/reward contract for current participants.

    let locked = service.validator_count > 0;

    if let Some(threshold_bps) = new_attack_threshold_bps {
        require!(
            !locked,
            ElasticRestakingError::InvalidConfiguration
        );
        require!(
            threshold_bps <= MAX_BPS,
            ElasticRestakingError::InvalidBasisPoints
        );
        service.attack_threshold_bps = threshold_bps;
    }

    if let Some(prize) = new_attack_prize {
        require!(
            !locked,
            ElasticRestakingError::InvalidConfiguration
        );
        service.attack_prize = prize;
    }

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(ServiceUpdated {
        service_id: service.service_id,
        metadata_uri: service.metadata_uri,
        attack_threshold_bps: service.attack_threshold_bps,
        attack_prize: service.attack_prize,
    });

    Ok(())
}
