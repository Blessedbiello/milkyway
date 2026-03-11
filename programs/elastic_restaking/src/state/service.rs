use anchor_lang::prelude::*;

#[account]
pub struct ServiceState {
    /// Monotonically increasing identifier assigned at registration.
    pub service_id: u32,
    /// The authority that can update service configuration.
    pub authority: Pubkey,
    /// Human-readable name stored as a fixed UTF-8 byte array (null-padded).
    pub name: [u8; 32],
    /// Off-chain metadata URI (e.g. IPFS/Arweave), null-padded.
    pub metadata_uri: [u8; 128],
    /// Fraction of total stake that must be compromised to constitute an attack,
    /// expressed in basis points.
    pub attack_threshold_bps: u32,
    /// Reward paid to a successful attacker / slashing reporter.
    pub attack_prize: u64,
    /// Accumulated reward tokens available for validator payouts.
    pub reward_pool: u64,
    /// Token account that holds the service's reward tokens.
    pub reward_vault: Pubkey,
    /// Total raw stake allocated to this service across all validators.
    pub total_allocated: u64,
    /// Total effective (risk-adjusted) stake allocated to this service.
    pub total_effective_allocated: u64,
    /// Number of validators currently allocated to this service.
    pub validator_count: u32,
    /// Whether the service is accepting new validator allocations.
    pub is_active: bool,
    /// Whether this service is the designated base (native) service.
    pub is_base_service: bool,
    /// Whether this service has been slashed and frozen.
    pub is_slashed: bool,
    /// Unix timestamp when the slash was applied; 0 if never slashed.
    pub slashed_at: i64,
    /// The SlashRecord PDA associated with the most recent slash event.
    pub slash_record: Pubkey,
    /// Unix timestamp when the service was registered.
    pub created_at: i64,
    /// PDA bump seed.
    pub bump: u8,
    /// Reserved bytes for future upgrades without account reallocation.
    pub _reserved: [u8; 128],
}

impl ServiceState {
    /// Space consumed by the account data, EXCLUDING the 8-byte Anchor discriminator.
    /// Use `space = 8 + ServiceState::INIT_SPACE` in the `init` constraint.
    ///
    /// Field breakdown:
    ///   service_id                    4
    ///   authority                    32
    ///   name                         32
    ///   metadata_uri                128
    ///   attack_threshold_bps          4
    ///   attack_prize                  8
    ///   reward_pool                   8
    ///   reward_vault                 32
    ///   total_allocated               8
    ///   total_effective_allocated     8
    ///   validator_count               4
    ///   is_active                     1
    ///   is_base_service               1
    ///   is_slashed                    1
    ///   slashed_at                    8
    ///   slash_record                 32
    ///   created_at                    8
    ///   bump                          1
    ///   _reserved                   128
    ///   -------  total             508
    pub const INIT_SPACE: usize = 4    // service_id               u32
        + 32   // authority                Pubkey
        + 32   // name                     [u8; 32]
        + 128  // metadata_uri             [u8; 128]
        + 4    // attack_threshold_bps     u32
        + 8    // attack_prize             u64
        + 8    // reward_pool              u64
        + 32   // reward_vault             Pubkey
        + 8    // total_allocated          u64
        + 8    // total_effective_allocated u64
        + 4    // validator_count          u32
        + 1    // is_active                bool
        + 1    // is_base_service          bool
        + 1    // is_slashed               bool
        + 8    // slashed_at               i64
        + 32   // slash_record             Pubkey
        + 8    // created_at               i64
        + 1    // bump                     u8
        + 128; // _reserved
}
