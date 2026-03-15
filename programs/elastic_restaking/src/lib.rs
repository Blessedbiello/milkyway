use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod math;
pub mod state;

use instructions::*;

declare_id!("2R3H4JZieWZtvvpXvfoNtDC9vxMmiRVvbS618LwexhW7");

#[program]
pub mod elastic_restaking {
    use super::*;

    // ── Admin ────────────────────────────────────────────────────────────────

    pub fn initialize_network(ctx: Context<InitializeNetwork>) -> Result<()> {
        instructions::admin::initialize_network::handler(ctx)
    }

    pub fn update_network_config(
        ctx: Context<UpdateNetworkConfig>,
        params: UpdateConfigParams,
    ) -> Result<()> {
        instructions::admin::update_network_config::handler(ctx, params)
    }

    pub fn propose_authority(
        ctx: Context<ProposeAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        instructions::admin::transfer_authority::propose_handler(ctx, new_authority)
    }

    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        instructions::admin::transfer_authority::accept_handler(ctx)
    }

    // ── Service ──────────────────────────────────────────────────────────────

    pub fn register_service(
        ctx: Context<RegisterService>,
        name: [u8; 32],
        metadata_uri: [u8; 128],
        attack_threshold_bps: u32,
        attack_prize: u64,
        is_base_service: bool,
    ) -> Result<()> {
        instructions::service::register_service::handler(
            ctx,
            name,
            metadata_uri,
            attack_threshold_bps,
            attack_prize,
            is_base_service,
        )
    }

    pub fn update_service(
        ctx: Context<UpdateService>,
        new_metadata_uri: Option<[u8; 128]>,
        new_attack_threshold_bps: Option<u32>,
        new_attack_prize: Option<u64>,
    ) -> Result<()> {
        instructions::service::update_service::handler(
            ctx,
            new_metadata_uri,
            new_attack_threshold_bps,
            new_attack_prize,
        )
    }

    pub fn deactivate_service(ctx: Context<DeactivateService>) -> Result<()> {
        instructions::service::deactivate_service::handler(ctx)
    }

    pub fn fund_rewards(ctx: Context<FundRewards>, amount: u64) -> Result<()> {
        instructions::service::fund_rewards::handler(ctx, amount)
    }

    // ── Validator ────────────────────────────────────────────────────────────

    pub fn deposit_stake(ctx: Context<DepositStake>, amount: u64) -> Result<()> {
        instructions::validator::deposit_stake::handler(ctx, amount)
    }

    pub fn request_withdrawal(
        ctx: Context<RequestWithdrawal>,
        amount: u64,
        ticket_id: u32,
    ) -> Result<()> {
        instructions::validator::request_withdrawal::handler(ctx, amount, ticket_id)
    }

    pub fn complete_withdrawal(ctx: Context<CompleteWithdrawal>) -> Result<()> {
        instructions::validator::complete_withdrawal::handler(ctx)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::validator::claim_rewards::handler(ctx)
    }

    // ── Allocation ───────────────────────────────────────────────────────────

    pub fn allocate_stake(
        ctx: Context<AllocateStake>,
        service_id: u32,
        amount: u64,
    ) -> Result<()> {
        instructions::allocation::allocate_stake::handler(ctx, service_id, amount)
    }

    pub fn deallocate_stake(
        ctx: Context<DeallocateStake>,
        service_id: u32,
        amount: u64,
    ) -> Result<()> {
        instructions::allocation::deallocate_stake::handler(ctx, service_id, amount)
    }

    // ── Slashing ─────────────────────────────────────────────────────────────

    pub fn propose_slash(ctx: Context<ProposeSlash>, service_id: u32) -> Result<()> {
        instructions::slashing::propose_slash::handler(ctx, service_id)
    }

    pub fn veto_slash(ctx: Context<VetoSlash>) -> Result<()> {
        instructions::slashing::veto_slash::handler(ctx)
    }

    pub fn finalize_slash(ctx: Context<FinalizeSlash>) -> Result<()> {
        instructions::slashing::finalize_slash::handler(ctx)
    }

    pub fn rebalance_allocations(ctx: Context<RebalanceAllocations>) -> Result<()> {
        instructions::slashing::rebalance_allocations::handler(ctx)
    }

    // ── Epoch ────────────────────────────────────────────────────────────────

    pub fn advance_epoch(ctx: Context<AdvanceEpoch>) -> Result<()> {
        instructions::epoch::advance_epoch::handler(ctx)
    }

    pub fn distribute_rewards(
        ctx: Context<DistributeRewards>,
        service_id: u32,
    ) -> Result<()> {
        instructions::epoch::distribute_rewards::handler(ctx, service_id)
    }
}
