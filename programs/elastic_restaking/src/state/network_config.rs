use anchor_lang::prelude::*;

#[account]
pub struct NetworkConfig {
    /// The current authority (admin) of the network.
    pub authority: Pubkey,
    /// A pending authority during a two-step authority transfer.
    pub pending_authority: Pubkey,
    /// The mint used for staking (e.g. SOL-wrapped or custom token).
    pub stake_mint: Pubkey,
    /// The mint used for distributing rewards.
    pub reward_mint: Pubkey,
    /// The treasury account that collects protocol fees.
    pub treasury: Pubkey,
    /// The vault holding all staked tokens.
    pub stake_vault: Pubkey,
    /// Target restaking degree expressed in basis points.
    pub target_restaking_degree_bps: u32,
    /// Hard cap on restaking degree expressed in basis points.
    pub max_restaking_degree_bps: u32,
    /// Total number of registered services.
    pub service_count: u32,
    /// Total number of registered validators.
    pub validator_count: u32,
    /// Total raw tokens staked across all validators.
    pub total_staked: u64,
    /// Total effective (risk-adjusted) stake across all validators.
    pub total_effective_stake: u64,
    /// The current epoch index.
    pub current_epoch: u64,
    /// Duration of one epoch in seconds.
    pub epoch_duration: i64,
    /// Unix timestamp at which the last epoch transition occurred.
    pub last_epoch_timestamp: i64,
    /// Number of epochs a validator must wait before reclaiming withdrawn stake.
    pub withdrawal_cooldown_epochs: u8,
    /// Number of epochs before a new allocation becomes active.
    pub allocation_delay_epochs: u8,
    /// Number of epochs before a deallocation becomes inactive.
    pub deallocation_delay_epochs: u8,
    /// Window (in seconds) during which a slash can be disputed.
    pub slash_dispute_window: i64,
    /// Minimum stake amount required to register as a validator.
    pub min_stake_amount: u64,
    /// Fee charged on deposits expressed in basis points.
    pub deposit_fee_bps: u16,
    /// Protocol commission on rewards expressed in basis points.
    pub reward_commission_bps: u16,
    /// Running counter of slash proposals created.
    pub slash_proposal_count: u32,
    /// Whether all state-mutating instructions are paused.
    pub is_paused: bool,
    /// PDA bump seed.
    pub bump: u8,
    /// Reserved bytes for future upgrades without account reallocation.
    pub _reserved: [u8; 128],
}

impl NetworkConfig {
    /// Space consumed by the account data, EXCLUDING the 8-byte Anchor discriminator.
    /// Use `space = 8 + NetworkConfig::INIT_SPACE` in the `init` constraint.
    ///
    /// Field breakdown:
    ///   authority                    32
    ///   pending_authority            32
    ///   stake_mint                   32
    ///   reward_mint                  32
    ///   treasury                     32
    ///   stake_vault                  32
    ///   -------  subtotal pubkeys   192
    ///   target_restaking_degree_bps   4
    ///   max_restaking_degree_bps      4
    ///   service_count                 4
    ///   validator_count               4
    ///   -------  subtotal u32s       16
    ///   total_staked                  8
    ///   total_effective_stake         8
    ///   current_epoch                 8
    ///   epoch_duration                8
    ///   last_epoch_timestamp          8
    ///   -------  subtotal u64/i64    40
    ///   withdrawal_cooldown_epochs    1
    ///   allocation_delay_epochs       1
    ///   deallocation_delay_epochs     1
    ///   -------  subtotal u8s         3
    ///   slash_dispute_window          8
    ///   min_stake_amount              8
    ///   deposit_fee_bps               2
    ///   reward_commission_bps         2
    ///   slash_proposal_count          4
    ///   is_paused                     1
    ///   bump                          1
    ///   _reserved                   128
    ///   -------  total             414
    pub const INIT_SPACE: usize = 192  // 6 × Pubkey
        + 16   // 4 × u32
        + 40   // 5 × u64 / i64
        + 3    // 3 × u8
        + 8    // slash_dispute_window  i64
        + 8    // min_stake_amount      u64
        + 2    // deposit_fee_bps       u16
        + 2    // reward_commission_bps u16
        + 4    // slash_proposal_count  u32
        + 1    // is_paused             bool
        + 1    // bump                  u8
        + 128; // _reserved
}
