use anchor_lang::prelude::*;

/// An immutable audit record written at the moment a slash is finalized.
/// The corresponding `ServiceState` holds a pointer to this PDA via its
/// `slash_record` field.
#[account]
pub struct SlashRecord {
    /// Monotonically increasing identifier for this slash event.
    pub slash_id: u32,
    /// The service that was slashed.
    pub service_id: u32,
    /// The account that called `finalize_slash`.
    pub executed_by: Pubkey,
    /// Number of validators whose stake was reduced by this slash.
    pub validators_affected: u32,
    /// Total token amount removed from validators as a result of the slash.
    pub total_slashed: u64,
    /// Network-wide total effective stake immediately before the slash.
    pub pre_total_effective_stake: u64,
    /// Network-wide total effective stake immediately after the slash.
    pub post_total_effective_stake: u64,
    /// Unix timestamp when the slash was executed.
    pub timestamp: i64,
    /// PDA bump seed.
    pub bump: u8,
    /// Reserved bytes for future upgrades without account reallocation.
    pub _reserved: [u8; 64],
}

impl SlashRecord {
    /// Space consumed by the account data, EXCLUDING the 8-byte Anchor discriminator.
    /// Use `space = 8 + SlashRecord::INIT_SPACE` in the `init` constraint.
    ///
    /// Field breakdown:
    ///   slash_id                      4
    ///   service_id                    4
    ///   executed_by                  32
    ///   validators_affected           4
    ///   total_slashed                 8
    ///   pre_total_effective_stake     8
    ///   post_total_effective_stake    8
    ///   timestamp                     8
    ///   bump                          1
    ///   _reserved                    64
    ///   -------  total             141
    pub const INIT_SPACE: usize = 4    // slash_id                 u32
        + 4    // service_id               u32
        + 32   // executed_by              Pubkey
        + 4    // validators_affected      u32
        + 8    // total_slashed            u64
        + 8    // pre_total_effective_stake u64
        + 8    // post_total_effective_stake u64
        + 8    // timestamp                i64
        + 1    // bump                     u8
        + 64;  // _reserved
}
