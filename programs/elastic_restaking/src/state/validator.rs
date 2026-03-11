use anchor_lang::prelude::*;

#[account]
pub struct ValidatorState {
    /// The wallet/keypair that owns this validator position.
    pub authority: Pubkey,
    /// Raw tokens deposited by the validator.
    pub stake: u64,
    /// Risk-adjusted stake after applying the restaking degree.
    pub effective_stake: u64,
    /// Sum of raw token amounts allocated across all services.
    pub total_allocated: u64,
    /// Sum of effective stake amounts allocated across all services.
    pub total_effective_allocated: u64,
    /// Current restaking degree expressed in basis points
    /// (effective_stake / stake, capped at max_restaking_degree_bps).
    pub restaking_degree_bps: u32,
    /// Number of active service allocations.
    pub allocation_count: u32,
    /// Lifetime rewards claimed by this validator.
    pub cumulative_rewards: u64,
    /// Rewards accrued but not yet claimed.
    pub pending_rewards: u64,
    /// Epoch index at which rewards were last settled.
    pub last_reward_epoch: u64,
    /// Stake tokens locked in a pending withdrawal ticket.
    pub pending_withdrawal: u64,
    /// Whether the validator is active and eligible for allocations.
    pub is_active: bool,
    /// Unix timestamp when the validator registered.
    pub created_at: i64,
    /// PDA bump seed.
    pub bump: u8,
    /// Reserved bytes for future upgrades without account reallocation.
    pub _reserved: [u8; 128],
}

impl ValidatorState {
    /// Space consumed by the account data, EXCLUDING the 8-byte Anchor discriminator.
    /// Use `space = 8 + ValidatorState::INIT_SPACE` in the `init` constraint.
    ///
    /// Field breakdown:
    ///   authority                    32
    ///   stake                         8
    ///   effective_stake               8
    ///   total_allocated               8
    ///   total_effective_allocated     8
    ///   restaking_degree_bps          4
    ///   allocation_count              4
    ///   cumulative_rewards            8
    ///   pending_rewards               8
    ///   last_reward_epoch             8
    ///   pending_withdrawal            8
    ///   is_active                     1
    ///   created_at                    8
    ///   bump                          1
    ///   _reserved                   128
    ///   -------  total             242
    pub const INIT_SPACE: usize = 32   // authority                Pubkey
        + 8    // stake                    u64
        + 8    // effective_stake          u64
        + 8    // total_allocated          u64
        + 8    // total_effective_allocated u64
        + 4    // restaking_degree_bps     u32
        + 4    // allocation_count         u32
        + 8    // cumulative_rewards       u64
        + 8    // pending_rewards          u64
        + 8    // last_reward_epoch        u64
        + 8    // pending_withdrawal       u64
        + 1    // is_active                bool
        + 8    // created_at               i64
        + 1    // bump                     u8
        + 128; // _reserved
}
