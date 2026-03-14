use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ElasticRestakingError;
use crate::events::EpochAdvanced;
use crate::state::NetworkConfig;

#[derive(Accounts)]
pub struct AdvanceEpoch<'info> {
    pub caller: Signer<'info>, // permissionless

    #[account(
        mut,
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
    )]
    pub network_config: Account<'info, NetworkConfig>,
}

pub fn handler(ctx: Context<AdvanceEpoch>) -> Result<()> {
    let config = &mut ctx.accounts.network_config;
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp >= config.last_epoch_timestamp + config.epoch_duration,
        ElasticRestakingError::EpochNotElapsed
    );

    config.current_epoch += 1;
    config.last_epoch_timestamp = clock.unix_timestamp;

    emit!(EpochAdvanced {
        epoch: config.current_epoch,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
