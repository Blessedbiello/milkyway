use anchor_lang::prelude::*;

/// A slash proposal is raised against a service when an attacker (or the
/// authority) believes the service has been compromised. It enters a dispute
/// window during which the authority can veto. If the window elapses without
/// a veto, `finalize_slash` can be called to execute the slash.
#[account]
pub struct SlashProposal {
    /// Monotonically increasing identifier assigned at proposal creation.
    pub proposal_id: u32,
    /// The service targeted by this slash proposal.
    pub service_id: u32,
    /// The account that created the proposal (typically a validator or the authority).
    pub proposer: Pubkey,
    /// Unix timestamp after which the proposal can be finalized (if not vetoed).
    pub dispute_end: i64,
    /// Set to `true` if the authority vetoed the proposal before `dispute_end`.
    pub is_vetoed: bool,
    /// Set to `true` once the slash has been finalized (executed or dismissed).
    pub is_finalized: bool,
    /// Unix timestamp when the proposal was created.
    pub created_at: i64,
    /// PDA bump seed.
    pub bump: u8,
    /// Reserved bytes for future upgrades without account reallocation.
    pub _reserved: [u8; 64],
}

impl SlashProposal {
    /// Space consumed by the account data, EXCLUDING the 8-byte Anchor discriminator.
    /// Use `space = 8 + SlashProposal::INIT_SPACE` in the `init` constraint.
    ///
    /// Field breakdown:
    ///   proposal_id                   4
    ///   service_id                    4
    ///   proposer                     32
    ///   dispute_end                   8
    ///   is_vetoed                     1
    ///   is_finalized                  1
    ///   created_at                    8
    ///   bump                          1
    ///   _reserved                    64
    ///   -------  total             123
    pub const INIT_SPACE: usize = 4    // proposal_id              u32
        + 4    // service_id               u32
        + 32   // proposer                 Pubkey
        + 8    // dispute_end              i64
        + 1    // is_vetoed                bool
        + 1    // is_finalized             bool
        + 8    // created_at               i64
        + 1    // bump                     u8
        + 64;  // _reserved
}
