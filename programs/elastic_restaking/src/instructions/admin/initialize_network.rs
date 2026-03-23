use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::*;
use crate::errors::ElasticRestakingError;
use crate::events::NetworkInitialized;
use crate::state::NetworkConfig;

#[derive(Accounts)]
pub struct InitializeNetwork<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + NetworkConfig::INIT_SPACE,
        seeds = [NETWORK_CONFIG_SEED],
        bump,
    )]
    pub network_config: Account<'info, NetworkConfig>,

    pub stake_mint: Account<'info, Mint>,
    pub reward_mint: Account<'info, Mint>,

    /// CHECK: Unchecked because treasury is an arbitrary recipient address for
    /// slashed tokens; ownership and account type are intentionally unrestricted.
    pub treasury: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        token::mint = stake_mint,
        token::authority = network_config,
        seeds = [STAKE_VAULT_SEED],
        bump,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializeNetwork>) -> Result<()> {
    let config = &mut ctx.accounts.network_config;

    config.authority = ctx.accounts.authority.key();
    config.pending_authority = Pubkey::default();
    config.stake_mint = ctx.accounts.stake_mint.key();
    config.reward_mint = ctx.accounts.reward_mint.key();
    config.treasury = ctx.accounts.treasury.key();
    config.stake_vault = ctx.accounts.stake_vault.key();

    config.target_restaking_degree_bps = DEFAULT_TARGET_RESTAKING_DEGREE_BPS;
    config.max_restaking_degree_bps = DEFAULT_MAX_RESTAKING_DEGREE_BPS;

    config.service_count = 0;
    config.validator_count = 0;
    config.total_staked = 0;
    config.total_effective_stake = 0;

    config.current_epoch = 0;
    config.epoch_duration = DEFAULT_EPOCH_DURATION;
    config.last_epoch_timestamp = Clock::get()?.unix_timestamp;

    config.withdrawal_cooldown_epochs = DEFAULT_WITHDRAWAL_COOLDOWN_EPOCHS;
    config.allocation_delay_epochs = DEFAULT_ALLOCATION_DELAY_EPOCHS;
    config.deallocation_delay_epochs = DEFAULT_DEALLOCATION_DELAY_EPOCHS;

    config.slash_dispute_window = DEFAULT_SLASH_DISPUTE_WINDOW;
    config.min_stake_amount = DEFAULT_MIN_STAKE_AMOUNT;
    config.deposit_fee_bps = DEFAULT_DEPOSIT_FEE_BPS;
    config.reward_commission_bps = DEFAULT_REWARD_COMMISSION_BPS;

    config.slash_proposal_count = 0;
    config.is_paused = false;
    config.bump = ctx.bumps.network_config;
    config._reserved = [0u8; 128];

    emit!(NetworkInitialized {
        authority: config.authority,
        stake_mint: config.stake_mint,
        reward_mint: config.reward_mint,
    });

    Ok(())
}
