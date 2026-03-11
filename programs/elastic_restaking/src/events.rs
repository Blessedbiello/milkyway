use anchor_lang::prelude::*;

// ── Network / protocol ────────────────────────────────────────────────────────

#[event]
pub struct NetworkInitialized {
    pub authority: Pubkey,
    pub stake_mint: Pubkey,
    pub reward_mint: Pubkey,
}

/// Generic config-change event.  `old_value` and `new_value` are always
/// serialized as u64; callers should document the unit (bps, lamports, seconds,
/// epochs) in the `field_name` string.
#[event]
pub struct NetworkConfigUpdated {
    pub field_name: String,
    pub old_value: u64,
    pub new_value: u64,
}

// ── Authority ─────────────────────────────────────────────────────────────────

#[event]
pub struct AuthorityTransferProposed {
    pub current: Pubkey,
    pub proposed: Pubkey,
}

#[event]
pub struct AuthorityTransferAccepted {
    pub new_authority: Pubkey,
}

// ── Services ──────────────────────────────────────────────────────────────────

#[event]
pub struct ServiceRegistered {
    /// Monotonically increasing numeric ID assigned at registration.
    pub service_id: u32,
    pub authority: Pubkey,
    /// UTF-8 name padded to 32 bytes.
    pub name: [u8; 32],
    pub attack_threshold_bps: u32,
    pub attack_prize: u64,
    pub is_base_service: bool,
    /// Unix timestamp of registration.
    pub created_at: i64,
}

#[event]
pub struct ServiceUpdated {
    pub service_id: u32,
    pub metadata_uri: [u8; 128],
    pub attack_threshold_bps: u32,
    pub attack_prize: u64,
}

#[event]
pub struct ServiceDeactivated {
    pub service_id: u32,
    pub deactivated_by: Pubkey,
}

#[event]
pub struct ServiceFunded {
    pub service_id: u32,
    pub funder: Pubkey,
    pub amount: u64,
    pub new_reward_pool: u64,
}

// ── Validator staking ─────────────────────────────────────────────────────────

#[event]
pub struct StakeDeposited {
    pub validator: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub new_total_stake: u64,
}

#[event]
pub struct WithdrawalRequested {
    pub validator: Pubkey,
    /// PDA address of the withdrawal ticket.
    pub ticket_id: Pubkey,
    pub amount: u64,
    /// Epoch in which the request was created.
    pub epoch: u64,
}

#[event]
pub struct WithdrawalCompleted {
    pub validator: Pubkey,
    pub ticket_id: Pubkey,
    pub amount: u64,
}

// ── Allocations ───────────────────────────────────────────────────────────────

#[event]
pub struct StakeAllocated {
    pub validator: Pubkey,
    /// PDA address of the service account.
    pub service_id: Pubkey,
    pub amount: u64,
    pub new_total_allocated: u64,
    pub activation_epoch: u64,
}

#[event]
pub struct StakeDeallocated {
    pub validator: Pubkey,
    /// PDA address of the service account.
    pub service_id: Pubkey,
    pub amount: u64,
    pub deactivation_epoch: u64,
}

#[event]
pub struct AllocationActivated {
    pub validator: Pubkey,
    pub service_id: Pubkey,
}

#[event]
pub struct AllocationDeactivated {
    pub validator: Pubkey,
    pub service_id: Pubkey,
}

#[event]
pub struct AllocationsRebalanced {
    pub validator: Pubkey,
    pub allocations_updated: u32,
}

// ── Slashing ──────────────────────────────────────────────────────────────────

#[event]
pub struct SlashProposed {
    /// PDA address of the slash proposal account.
    pub proposal_id: Pubkey,
    /// PDA address of the service account.
    pub service_id: Pubkey,
    pub proposer: Pubkey,
    /// Unix timestamp after which the proposal can be finalized.
    pub dispute_end: i64,
}

#[event]
pub struct SlashVetoed {
    pub proposal_id: Pubkey,
    /// PDA address of the service account.
    pub service_id: Pubkey,
}

#[event]
pub struct SlashFinalized {
    pub proposal_id: Pubkey,
    /// PDA address of the service account.
    pub service_id: Pubkey,
    /// PDA address of the on-chain slash record.
    pub slash_id: Pubkey,
    pub validators_affected: u32,
    pub total_slashed: u64,
}

// ── Epoch ─────────────────────────────────────────────────────────────────────

#[event]
pub struct EpochAdvanced {
    pub epoch: u64,
    pub timestamp: i64,
}

// ── Rewards ───────────────────────────────────────────────────────────────────

#[event]
pub struct RewardsDistributed {
    pub validator: Pubkey,
    /// Numeric service ID from the ServiceState account.
    pub service_id: u32,
    pub amount: u64,
}

#[event]
pub struct RewardsClaimed {
    pub validator: Pubkey,
    pub total_claimed: u64,
}
