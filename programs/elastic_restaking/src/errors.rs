use anchor_lang::prelude::*;

#[error_code]
pub enum ElasticRestakingError {
    // ── Authorization & protocol state ───────────────────────────────────────
    #[msg("Caller is not authorized to perform this action")]
    Unauthorized,

    #[msg("The network is currently paused")]
    NetworkPaused,

    // ── Arithmetic ────────────────────────────────────────────────────────────
    #[msg("Math overflow during calculation")]
    MathOverflow,

    // ── Configuration validation ──────────────────────────────────────────────
    #[msg("Basis points value exceeds 10 000")]
    InvalidBasisPoints,

    #[msg("One or more configuration parameters are invalid")]
    InvalidConfiguration,

    // ── Staking ───────────────────────────────────────────────────────────────
    #[msg("Stake amount is below the protocol minimum")]
    StakeBelowMinimum,

    #[msg("Insufficient stake to complete the requested operation")]
    InsufficientStake,

    #[msg("Operation would exceed the validator's maximum restaking degree")]
    ExceedsMaxRestakingDegree,

    #[msg("Single allocation amount cannot exceed the validator's effective stake")]
    ExceedsSingleAllocationCap,

    // ── Service ───────────────────────────────────────────────────────────────
    #[msg("Service is not in an active state")]
    ServiceNotActive,

    #[msg("Service has already been slashed")]
    ServiceAlreadySlashed,

    #[msg("Cannot slash the base (native) service")]
    ServiceIsBaseService,

    // ── Allocation lifecycle ──────────────────────────────────────────────────
    #[msg("Allocation is not in an active state")]
    AllocationNotActive,

    #[msg("Allocation is still pending activation")]
    AllocationPending,

    #[msg("Allocation is in the process of deactivating")]
    AllocationDeactivating,

    #[msg("Required allocation delay has not elapsed yet")]
    AllocationDelayNotElapsed,

    #[msg("Required deallocation delay has not elapsed yet")]
    DeallocationDelayNotElapsed,

    // ── Withdrawals ───────────────────────────────────────────────────────────
    #[msg("Withdrawal ticket is not yet claimable")]
    WithdrawalNotClaimable,

    #[msg("Withdrawal cooldown period has not elapsed yet")]
    WithdrawalCooldownNotElapsed,

    #[msg("Remaining stake after withdrawal would be insufficient to cover existing allocations")]
    InsufficientWithdrawableStake,

    // ── Slashing ──────────────────────────────────────────────────────────────
    #[msg("Slash proposal was not found")]
    SlashProposalNotFound,

    #[msg("Slash dispute window has not elapsed yet")]
    SlashDisputeWindowNotElapsed,

    #[msg("Slash proposal has already been vetoed")]
    SlashProposalAlreadyVetoed,

    #[msg("Slash proposal has already been finalized")]
    SlashProposalAlreadyFinalized,

    #[msg("Veto window has already elapsed for this slash proposal")]
    SlashDisputeWindowElapsed,

    // ── Epoch management ──────────────────────────────────────────────────────
    #[msg("Invalid epoch advance: epoch number must increase monotonically")]
    InvalidEpochAdvance,

    #[msg("Epoch duration has not elapsed yet")]
    EpochNotElapsed,

    // ── Rewards ───────────────────────────────────────────────────────────────
    #[msg("No rewards available to claim")]
    NoRewardsToClaim,

    // ── Authority transfer ────────────────────────────────────────────────────
    #[msg("Invalid authority transfer: signer does not match the pending authority")]
    InvalidAuthorityTransfer,

    // ── Registry limits ───────────────────────────────────────────────────────
    #[msg("Maximum number of registered services has been reached")]
    MaxServicesReached,

    #[msg("Maximum number of registered validators has been reached")]
    MaxValidatorsReached,
}
