use anchor_lang::prelude::*;

use crate::{
    constants::NETWORK_CONFIG_SEED,
    errors::ElasticRestakingError,
    events::ServiceDeactivated,
    state::{NetworkConfig, ServiceState},
};

#[derive(Accounts)]
pub struct DeactivateService<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
    )]
    pub network_config: Account<'info, NetworkConfig>,

    #[account(
        mut,
        constraint = service.is_active @ ElasticRestakingError::ServiceNotActive,
    )]
    pub service: Account<'info, ServiceState>,
}

pub fn handler(ctx: Context<DeactivateService>) -> Result<()> {
    let authority_key = ctx.accounts.authority.key();
    let network_config = &ctx.accounts.network_config;
    let service = &mut ctx.accounts.service;

    // ── Authorization: network authority OR service authority ─────────────────

    require!(
        authority_key == network_config.authority || authority_key == service.authority,
        ElasticRestakingError::Unauthorized
    );

    // ── Deactivate ────────────────────────────────────────────────────────────

    service.is_active = false;

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(ServiceDeactivated {
        service_id: service.service_id,
        deactivated_by: authority_key,
    });

    Ok(())
}
