use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    errors::ElasticRestakingError,
    events::RewardsClaimed,
    state::{NetworkConfig, ValidatorState},
};

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
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

    /// The protocol stake vault also holds accumulated reward tokens that were
    /// deposited during reward distribution.  The vault's authority is the
    /// network_config PDA, so we sign the outbound transfer with its seeds.
    #[account(
        mut,
        seeds = [STAKE_VAULT_SEED],
        bump,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = authority_token_account.owner == authority.key()
            @ ElasticRestakingError::Unauthorized,
        constraint = authority_token_account.mint == network_config.reward_mint
            @ ElasticRestakingError::InvalidConfiguration,
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimRewards>) -> Result<()> {
    let pending = ctx.accounts.validator_state.pending_rewards;

    // ── Validate there is something to claim ──────────────────────────────────

    require!(pending > 0, ElasticRestakingError::NoRewardsToClaim);

    // ── CPI: transfer pending rewards from stake_vault to authority ───────────
    //
    // The stake_vault is owned by the network_config PDA (set at init), so we
    // provide network_config's seeds as the CPI signer.

    let network_config = &ctx.accounts.network_config;
    let signer_seeds: &[&[&[u8]]] = &[&[NETWORK_CONFIG_SEED, &[network_config.bump]]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.stake_vault.to_account_info(),
        to: ctx.accounts.authority_token_account.to_account_info(),
        authority: ctx.accounts.network_config.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, pending)?;

    // ── Update validator reward accounting ────────────────────────────────────

    let validator_state = &mut ctx.accounts.validator_state;

    validator_state.cumulative_rewards = validator_state
        .cumulative_rewards
        .checked_add(pending)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    validator_state.pending_rewards = 0;

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(RewardsClaimed {
        validator: ctx.accounts.authority.key(),
        total_claimed: pending,
    });

    Ok(())
}
