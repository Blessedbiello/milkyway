// PDA seeds
pub const NETWORK_CONFIG_SEED: &[u8] = b"network_config";
pub const SERVICE_SEED: &[u8] = b"service";
pub const VALIDATOR_SEED: &[u8] = b"validator";
pub const ALLOCATION_SEED: &[u8] = b"allocation";
pub const WITHDRAWAL_SEED: &[u8] = b"withdrawal";
pub const SLASH_PROPOSAL_SEED: &[u8] = b"slash_proposal";
pub const SLASH_RECORD_SEED: &[u8] = b"slash_record";
pub const STAKE_VAULT_SEED: &[u8] = b"stake_vault";
pub const REWARD_VAULT_SEED: &[u8] = b"reward_vault";

// Basis point constants
pub const BPS_DENOMINATOR: u32 = 10_000;
pub const MAX_BPS: u32 = 10_000;

// Default configuration
pub const DEFAULT_TARGET_RESTAKING_DEGREE_BPS: u32 = 20_000; // 2.0x
pub const DEFAULT_MAX_RESTAKING_DEGREE_BPS: u32 = 50_000; // 5.0x
pub const DEFAULT_EPOCH_DURATION: i64 = 3600; // 1 hour for devnet
pub const DEFAULT_WITHDRAWAL_COOLDOWN_EPOCHS: u8 = 2;
pub const DEFAULT_ALLOCATION_DELAY_EPOCHS: u8 = 1;
pub const DEFAULT_DEALLOCATION_DELAY_EPOCHS: u8 = 1;
pub const DEFAULT_SLASH_DISPUTE_WINDOW: i64 = 3600; // 1 hour for devnet
pub const DEFAULT_MIN_STAKE_AMOUNT: u64 = 1_000_000; // 1 token (6 decimals)
pub const DEFAULT_DEPOSIT_FEE_BPS: u16 = 0;
pub const DEFAULT_REWARD_COMMISSION_BPS: u16 = 500; // 5%

// Limits
pub const MAX_NAME_LEN: usize = 32;
pub const MAX_METADATA_URI_LEN: usize = 128;
pub const MAX_SERVICES: u32 = 256;
pub const MAX_VALIDATORS: u32 = 10_000;
pub const MAX_ALLOCATIONS_PER_REBALANCE: usize = 10;
pub const MAX_VALIDATORS_PER_SLASH: usize = 10;
