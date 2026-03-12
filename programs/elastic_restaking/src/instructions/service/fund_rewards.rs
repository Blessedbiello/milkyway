use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    errors::ElasticRestakingError,
    events::ServiceFunded,
    state::ServiceState,
};

#[derive(Accounts)]
pub struct FundRewards<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,

    #[account(
        mut,
        constraint = service.is_active @ ElasticRestakingError::ServiceNotActive,
    )]
    pub service: Account<'info, ServiceState>,

    /// The funder's token account.  Must share the same mint as the reward vault.
    #[account(
        mut,
        constraint = funder_token_account.mint == reward_vault.mint
            @ ElasticRestakingError::InvalidConfiguration,
    )]
    pub funder_token_account: Account<'info, TokenAccount>,

    /// The service's on-chain reward vault.
    #[account(
        mut,
        address = service.reward_vault @ ElasticRestakingError::InvalidConfiguration,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<FundRewards>, amount: u64) -> Result<()> {
    require!(amount > 0, ElasticRestakingError::InvalidConfiguration);

    // ── CPI: transfer tokens from funder into the reward vault ────────────────

    let cpi_accounts = Transfer {
        from: ctx.accounts.funder_token_account.to_account_info(),
        to: ctx.accounts.reward_vault.to_account_info(),
        authority: ctx.accounts.funder.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // ── Update service reward pool ────────────────────────────────────────────

    let service = &mut ctx.accounts.service;

    service.reward_pool = service
        .reward_pool
        .checked_add(amount)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(ServiceFunded {
        service_id: service.service_id,
        funder: ctx.accounts.funder.key(),
        amount,
        new_reward_pool: service.reward_pool,
    });

    Ok(())
}
