use anchor_lang::prelude::*;

/// Lifecycle state of a validator-to-service allocation.
///
/// Stored as a `u8` on-chain; only the discriminant byte is serialized
/// (1 byte total, no variant fields).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum AllocationStatus {
    /// Allocation created; waiting for `allocation_delay_epochs` to elapse.
    Pending = 0,
    /// Fully active; the allocated stake counts toward service security.
    Active = 1,
    /// Deactivation requested; waiting for `deallocation_delay_epochs` to elapse.
    Deactivating = 2,
    /// Deactivation complete; stake is no longer counted for this service.
    Inactive = 3,
}

#[account]
pub struct AllocationState {
    /// The validator that created this allocation.
    pub validator: Pubkey,
    /// The service this allocation targets.
    pub service_id: u32,
    /// Raw token amount committed to this allocation.
    pub amount: u64,
    /// Risk-adjusted amount after applying the restaking degree.
    pub effective_amount: u64,
    /// Current lifecycle status of the allocation.
    pub status: AllocationStatus,
    /// Epoch index at which the allocation became (or will become) active.
    pub activation_epoch: u64,
    /// Epoch index at which deactivation was (or will be) completed; 0 if not deactivating.
    pub deactivation_epoch: u64,
    /// Reward debt used for the share-based reward calculation (analogous to SushiSwap's accRewardPerShare model).
    pub reward_debt: u64,
    /// Rewards accrued by this allocation that have not yet been claimed.
    pub pending_rewards: u64,
    /// Epoch index at which rewards were last settled for this allocation.
    pub last_reward_epoch: u64,
    /// Unix timestamp when the allocation was created.
    pub created_at: i64,
    /// PDA bump seed.
    pub bump: u8,
    /// Reserved bytes for future upgrades without account reallocation.
    pub _reserved: [u8; 64],
}

impl AllocationState {
    /// Space consumed by the account data, EXCLUDING the 8-byte Anchor discriminator.
    /// Use `space = 8 + AllocationState::INIT_SPACE` in the `init` constraint.
    ///
    /// Field breakdown:
    ///   validator                    32
    ///   service_id                    4
    ///   amount                        8
    ///   effective_amount              8
    ///   status (u8 repr enum)         1
    ///   activation_epoch              8
    ///   deactivation_epoch            8
    ///   reward_debt                   8
    ///   pending_rewards               8
    ///   last_reward_epoch             8
    ///   created_at                    8
    ///   bump                          1
    ///   _reserved                    64
    ///   -------  total             166
    pub const INIT_SPACE: usize = 32   // validator                Pubkey
        + 4    // service_id               u32
        + 8    // amount                   u64
        + 8    // effective_amount         u64
        + 1    // status                   AllocationStatus (u8)
        + 8    // activation_epoch         u64
        + 8    // deactivation_epoch       u64
        + 8    // reward_debt              u64
        + 8    // pending_rewards          u64
        + 8    // last_reward_epoch        u64
        + 8    // created_at               i64
        + 1    // bump                     u8
        + 64;  // _reserved
}
