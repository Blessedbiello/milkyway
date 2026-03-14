use anchor_lang::prelude::*;

use crate::{
    constants::*,
    errors::ElasticRestakingError,
    events::SlashVetoed,
    state::{NetworkConfig, ServiceState, SlashProposal},
};

#[derive(Accounts)]
pub struct VetoSlash<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
        constraint = authority.key() == network_config.authority @ ElasticRestakingError::Unauthorized,
    )]
    pub network_config: Account<'info, NetworkConfig>,

    #[account(
        mut,
        seeds = [SLASH_PROPOSAL_SEED, &slash_proposal.proposal_id.to_le_bytes()],
        bump = slash_proposal.bump,
        constraint = !slash_proposal.is_vetoed @ ElasticRestakingError::SlashProposalAlreadyVetoed,
        constraint = !slash_proposal.is_finalized @ ElasticRestakingError::SlashProposalAlreadyFinalized,
    )]
    pub slash_proposal: Account<'info, SlashProposal>,

    /// The service targeted by this proposal, used for event emission.
    #[account(
        seeds = [SERVICE_SEED, &slash_proposal.service_id.to_le_bytes()],
        bump = service.bump,
    )]
    pub service: Account<'info, ServiceState>,
}

pub fn handler(ctx: Context<VetoSlash>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let slash_proposal = &mut ctx.accounts.slash_proposal;

    // ── Validate: veto must occur within the dispute window ───────────────────

    require!(
        now < slash_proposal.dispute_end,
        ElasticRestakingError::SlashDisputeWindowElapsed
    );

    // ── Apply veto ────────────────────────────────────────────────────────────

    slash_proposal.is_vetoed = true;

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(SlashVetoed {
        proposal_id: slash_proposal.key(),
        service_id: ctx.accounts.service.key(),
    });

    Ok(())
}
