use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::ElasticRestakingError;
use crate::events::{AuthorityTransferAccepted, AuthorityTransferProposed};
use crate::state::NetworkConfig;

// ── Step 1: propose ───────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ProposeAuthority<'info> {
    /// Must be the current authority — only they can nominate a successor.
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
        has_one = authority @ ElasticRestakingError::Unauthorized,
    )]
    pub network_config: Account<'info, NetworkConfig>,
}

/// Records `new_authority` as the pending authority.  The transfer is NOT
/// finalized until `accept_authority` is called by that key.
pub fn propose_handler(ctx: Context<ProposeAuthority>, new_authority: Pubkey) -> Result<()> {
    // Proposing the current authority as the pending authority is a no-op that
    // wastes lamports; prevent it as a quality-of-life guard.
    require_keys_neq!(
        new_authority,
        ctx.accounts.authority.key(),
        ElasticRestakingError::InvalidConfiguration
    );

    // Disallow the default pubkey — it would leave the protocol unownable.
    require_keys_neq!(
        new_authority,
        Pubkey::default(),
        ElasticRestakingError::InvalidConfiguration
    );

    let config = &mut ctx.accounts.network_config;
    config.pending_authority = new_authority;

    emit!(AuthorityTransferProposed {
        current: config.authority,
        proposed: new_authority,
    });

    Ok(())
}

// ── Step 2: accept ────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    /// Must sign and must match `network_config.pending_authority`.
    pub new_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
        constraint = network_config.pending_authority == new_authority.key()
            @ ElasticRestakingError::InvalidAuthorityTransfer,
    )]
    pub network_config: Account<'info, NetworkConfig>,
}

/// Finalizes the two-step authority transfer.  Clears `pending_authority` to
/// prevent the old pending key from being accepted again after a future
/// `propose_authority` call overwrites it.
pub fn accept_handler(ctx: Context<AcceptAuthority>) -> Result<()> {
    let config = &mut ctx.accounts.network_config;

    config.authority = ctx.accounts.new_authority.key();
    config.pending_authority = Pubkey::default();

    emit!(AuthorityTransferAccepted {
        new_authority: config.authority,
    });

    Ok(())
}
