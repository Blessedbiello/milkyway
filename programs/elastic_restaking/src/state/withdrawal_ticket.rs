use anchor_lang::prelude::*;

/// Created when a validator requests a withdrawal. The ticket enforces the
/// `withdrawal_cooldown_epochs` delay before funds can be reclaimed.
#[account]
pub struct WithdrawalTicket {
    /// The validator that requested the withdrawal.
    pub validator: Pubkey,
    /// Monotonically increasing index scoped to the validator (used in PDA seeds).
    pub ticket_id: u32,
    /// Token amount locked in this withdrawal request.
    pub amount: u64,
    /// Epoch index at which the withdrawal was requested.
    pub epoch_requested: u64,
    /// Set to `true` once `withdrawal_cooldown_epochs` have elapsed and
    /// `finalize_withdrawal` has been called.
    pub is_claimable: bool,
    /// Unix timestamp when the ticket was created.
    pub created_at: i64,
    /// PDA bump seed.
    pub bump: u8,
    /// Reserved bytes for future upgrades without account reallocation.
    pub _reserved: [u8; 32],
}

impl WithdrawalTicket {
    /// Space consumed by the account data, EXCLUDING the 8-byte Anchor discriminator.
    /// Use `space = 8 + WithdrawalTicket::INIT_SPACE` in the `init` constraint.
    ///
    /// Field breakdown:
    ///   validator                    32
    ///   ticket_id                     4
    ///   amount                        8
    ///   epoch_requested               8
    ///   is_claimable                  1
    ///   created_at                    8
    ///   bump                          1
    ///   _reserved                    32
    ///   -------  total              94
    pub const INIT_SPACE: usize = 32   // validator                Pubkey
        + 4    // ticket_id                u32
        + 8    // amount                   u64
        + 8    // epoch_requested          u64
        + 1    // is_claimable             bool
        + 8    // created_at               i64
        + 1    // bump                     u8
        + 32;  // _reserved
}
