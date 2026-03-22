use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ElasticRestakingError;
use crate::events::RewardsDistributed;
use crate::state::*;
use crate::math::*;

#[derive(Accounts)]
#[instruction(service_id: u32)]
pub struct DistributeRewards<'info> {
    pub caller: Signer<'info>, // permissionless crank

    #[account(
        seeds = [NETWORK_CONFIG_SEED],
        bump = network_config.bump,
    )]
    pub network_config: Box<Account<'info, NetworkConfig>>,

    #[account(
        mut,
        // validator_state is for a specific validator - passed by the caller
    )]
    pub validator_state: Box<Account<'info, ValidatorState>>,

    #[account(
        mut,
        seeds = [SERVICE_SEED, &service_id.to_le_bytes()],
        bump = service.bump,
    )]
    pub service: Box<Account<'info, ServiceState>>,

    #[account(
        mut,
        seeds = [ALLOCATION_SEED, validator_state.authority.as_ref(), &service_id.to_le_bytes()],
        bump = allocation.bump,
    )]
    pub allocation: Account<'info, AllocationState>,
}

pub fn handler(ctx: Context<DistributeRewards>, _service_id: u32) -> Result<()> {
    let config = &ctx.accounts.network_config;
    let validator = &mut ctx.accounts.validator_state;
    let service = &mut ctx.accounts.service;
    let allocation = &mut ctx.accounts.allocation;

    // Only active allocations earn rewards
    require!(
        allocation.status == AllocationStatus::Active,
        ElasticRestakingError::AllocationNotActive
    );

    // Don't double-distribute in same epoch
    require!(
        allocation.last_reward_epoch < config.current_epoch,
        ElasticRestakingError::NoRewardsToClaim
    );

    // Theorem 2: degree-gated rewards
    // Validators at or below the target restaking degree d* receive proportional rewards.
    // Validators exceeding d* receive zero — this is the paper's key incentive to cap restaking.
    let reward = if validator.restaking_degree_bps <= config.target_restaking_degree_bps {
        // Proportional reward based on effective allocation relative to total allocated
        if service.total_effective_allocated > 0 {
            checked_mul_div(
                allocation.effective_amount,
                service.reward_pool,
                service.total_effective_allocated,
            )?
        } else {
            0
        }
    } else {
        // Validator exceeds target restaking degree → zero reward (Theorem 2 punishment)
        0
    };

    if reward > 0 {
        // Deduct protocol commission before crediting validator
        let commission = checked_mul_div(
            reward,
            config.reward_commission_bps as u64,
            BPS_DENOMINATOR as u64,
        )?;
        let net_reward = reward
            .checked_sub(commission)
            .ok_or(ElasticRestakingError::MathOverflow)?;

        allocation.pending_rewards = allocation
            .pending_rewards
            .checked_add(net_reward)
            .ok_or(ElasticRestakingError::MathOverflow)?;

        validator.pending_rewards = validator
            .pending_rewards
            .checked_add(net_reward)
            .ok_or(ElasticRestakingError::MathOverflow)?;

        // Reduce service reward pool by the gross reward (pre-commission)
        service.reward_pool = service.reward_pool.saturating_sub(reward);
    }

    allocation.last_reward_epoch = config.current_epoch;
    validator.last_reward_epoch = config.current_epoch;

    emit!(RewardsDistributed {
        validator: validator.authority,
        service_id: service.service_id,
        amount: reward,
    });

    Ok(())
}
