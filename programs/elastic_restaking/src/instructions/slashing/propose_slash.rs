use anchor_lang::prelude::*;

use crate::{
    constants::*,
    errors::ElasticRestakingError,
    events::SlashProposed,
    state::{NetworkConfig, ServiceState, SlashProposal},
};

#[derive(Accounts)]
#[instruction(service_id: u32)]
pub struct ProposeSlash<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,

    #[account(
        mut,
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
        constraint = proposer.key() == network_config.authority @ ElasticRestakingError::Unauthorized,
    )]
    pub network_config: Account<'info, NetworkConfig>,

    #[account(
        seeds = [SERVICE_SEED, &service_id.to_le_bytes()],
        bump = service.bump,
        constraint = service.is_active @ ElasticRestakingError::ServiceNotActive,
        constraint = !service.is_slashed @ ElasticRestakingError::ServiceAlreadySlashed,
        constraint = !service.is_base_service @ ElasticRestakingError::ServiceIsBaseService,
    )]
    pub service: Account<'info, ServiceState>,

    #[account(
        init,
        payer = proposer,
        space = 8 + SlashProposal::INIT_SPACE,
        seeds = [SLASH_PROPOSAL_SEED, &network_config.slash_proposal_count.to_le_bytes()],
        bump,
    )]
    pub slash_proposal: Account<'info, SlashProposal>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ProposeSlash>, service_id: u32) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let network_config = &mut ctx.accounts.network_config;

    // ── Initialise slash proposal ─────────────────────────────────────────────

    let proposal_id = network_config.slash_proposal_count;
    let dispute_end = now
        .checked_add(network_config.slash_dispute_window)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    let slash_proposal = &mut ctx.accounts.slash_proposal;
    slash_proposal.proposal_id = proposal_id;
    slash_proposal.service_id = service_id;
    slash_proposal.proposer = ctx.accounts.proposer.key();
    slash_proposal.dispute_end = dispute_end;
    slash_proposal.is_vetoed = false;
    slash_proposal.is_finalized = false;
    slash_proposal.created_at = now;
    slash_proposal.bump = ctx.bumps.slash_proposal;
    slash_proposal._reserved = [0u8; 64];

    // ── Increment global proposal counter ─────────────────────────────────────

    network_config.slash_proposal_count = network_config
        .slash_proposal_count
        .checked_add(1)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(SlashProposed {
        proposal_id: slash_proposal.key(),
        service_id: ctx.accounts.service.key(),
        proposer: ctx.accounts.proposer.key(),
        dispute_end,
    });

    Ok(())
}
