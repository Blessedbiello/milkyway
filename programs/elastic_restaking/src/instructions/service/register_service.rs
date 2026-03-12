use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    constants::*,
    errors::ElasticRestakingError,
    events::ServiceRegistered,
    state::{NetworkConfig, ServiceState},
};

#[derive(Accounts)]
#[instruction(
    name: [u8; 32],
    metadata_uri: [u8; 128],
    attack_threshold_bps: u32,
    attack_prize: u64,
    is_base_service: bool
)]
pub struct RegisterService<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
    )]
    pub network_config: Account<'info, NetworkConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + ServiceState::INIT_SPACE,
        seeds = [SERVICE_SEED, &network_config.service_count.to_le_bytes()],
        bump,
    )]
    pub service: Account<'info, ServiceState>,

    /// Must match network_config.reward_mint.
    pub reward_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = reward_mint,
        token::authority = service,
        seeds = [REWARD_VAULT_SEED, &network_config.service_count.to_le_bytes()],
        bump,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<RegisterService>,
    name: [u8; 32],
    metadata_uri: [u8; 128],
    attack_threshold_bps: u32,
    attack_prize: u64,
    is_base_service: bool,
) -> Result<()> {
    let network_config = &mut ctx.accounts.network_config;

    // ── Validate inputs ───────────────────────────────────────────────────────

    require!(
        attack_threshold_bps <= MAX_BPS,
        ElasticRestakingError::InvalidBasisPoints
    );

    require!(
        network_config.service_count < MAX_SERVICES,
        ElasticRestakingError::MaxServicesReached
    );

    require!(
        ctx.accounts.reward_mint.key() == network_config.reward_mint,
        ElasticRestakingError::InvalidConfiguration
    );

    // ── Initialise ServiceState ───────────────────────────────────────────────

    let service_id = network_config.service_count;
    let created_at = Clock::get()?.unix_timestamp;
    let service_bump = ctx.bumps.service;

    let service = &mut ctx.accounts.service;

    service.service_id = service_id;
    service.authority = ctx.accounts.authority.key();
    service.name = name;
    service.metadata_uri = metadata_uri;
    service.attack_threshold_bps = attack_threshold_bps;
    service.attack_prize = attack_prize;
    service.reward_pool = 0;
    service.reward_vault = ctx.accounts.reward_vault.key();
    service.total_allocated = 0;
    service.total_effective_allocated = 0;
    service.validator_count = 0;
    service.is_active = true;
    service.is_base_service = is_base_service;
    service.is_slashed = false;
    service.slashed_at = 0;
    service.slash_record = Pubkey::default();
    service.created_at = created_at;
    service.bump = service_bump;
    service._reserved = [0u8; 128];

    // ── Update global registry counter ───────────────────────────────────────

    network_config.service_count = network_config
        .service_count
        .checked_add(1)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    // ── Emit ──────────────────────────────────────────────────────────────────

    emit!(ServiceRegistered {
        service_id,
        authority: service.authority,
        name,
        attack_threshold_bps,
        attack_prize,
        is_base_service,
        created_at,
    });

    Ok(())
}
