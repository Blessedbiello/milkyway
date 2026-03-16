import type { BN } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * Lifecycle state of a validator-to-service allocation.
 * Mirrors the on-chain `AllocationStatus` enum (stored as u8).
 */
export enum AllocationStatus {
  Pending = "Pending",
  Active = "Active",
  Deactivating = "Deactivating",
  Inactive = "Inactive",
}

// ---------------------------------------------------------------------------
// Account structs
// ---------------------------------------------------------------------------

/**
 * Mirrors the on-chain `NetworkConfig` account.
 * All u64/i64 fields are represented as BN; u32/u16/u8 as number.
 */
export interface NetworkConfig {
  /** Current protocol admin. */
  authority: PublicKey;
  /** Pending authority during a two-step transfer; zero key if none. */
  pendingAuthority: PublicKey;
  /** Mint used for staking. */
  stakeMint: PublicKey;
  /** Mint used for reward distribution. */
  rewardMint: PublicKey;
  /** Treasury that collects slashed tokens and protocol fees. */
  treasury: PublicKey;
  /** Token account that holds all staked tokens. */
  stakeVault: PublicKey;
  /** Target restaking degree in basis points. */
  targetRestakingDegreeBps: number;
  /** Hard cap on restaking degree in basis points. */
  maxRestakingDegreeBps: number;
  /** Total number of registered services. */
  serviceCount: number;
  /** Total number of registered validators. */
  validatorCount: number;
  /** Total raw tokens staked across all validators. */
  totalStaked: BN;
  /** Total effective (risk-adjusted) stake across all validators. */
  totalEffectiveStake: BN;
  /** Current epoch index. */
  currentEpoch: BN;
  /** Duration of one epoch in seconds. */
  epochDuration: BN;
  /** Unix timestamp of the last epoch transition. */
  lastEpochTimestamp: BN;
  /** Epochs a validator must wait before reclaiming withdrawn stake. */
  withdrawalCooldownEpochs: number;
  /** Epochs before a new allocation becomes active. */
  allocationDelayEpochs: number;
  /** Epochs before a deallocation becomes inactive. */
  deallocationDelayEpochs: number;
  /** Window in seconds during which a slash can be disputed. */
  slashDisputeWindow: BN;
  /** Minimum stake required to register as a validator. */
  minStakeAmount: BN;
  /** Fee charged on deposits in basis points. */
  depositFeeBps: number;
  /** Protocol commission on rewards in basis points. */
  rewardCommissionBps: number;
  /** Running counter of slash proposals created. */
  slashProposalCount: number;
  /** Whether all state-mutating instructions are paused. */
  isPaused: boolean;
  /** PDA bump seed. */
  bump: number;
  /** Reserved bytes for future upgrades. */
  reserved: number[];
}

/**
 * Mirrors the on-chain `ServiceState` account.
 */
export interface ServiceState {
  /** Monotonically increasing numeric identifier. */
  serviceId: number;
  /** Authority that can update service configuration. */
  authority: PublicKey;
  /** Human-readable name as a fixed 32-byte null-padded UTF-8 array. */
  name: number[];
  /** Off-chain metadata URI as a fixed 128-byte null-padded UTF-8 array. */
  metadataUri: number[];
  /** Fraction of total stake that constitutes an attack (bps). */
  attackThresholdBps: number;
  /** Reward paid to a successful attacker / slashing reporter. */
  attackPrize: BN;
  /** Accumulated reward tokens available for validator payouts. */
  rewardPool: BN;
  /** Token account holding the service's reward tokens. */
  rewardVault: PublicKey;
  /** Total raw stake allocated to this service. */
  totalAllocated: BN;
  /** Total effective stake allocated to this service. */
  totalEffectiveAllocated: BN;
  /** Number of validators currently allocated. */
  validatorCount: number;
  /** Whether the service is accepting new validator allocations. */
  isActive: boolean;
  /** Whether this is the designated base (native) service. */
  isBaseService: boolean;
  /** Whether this service has been slashed and frozen. */
  isSlashed: boolean;
  /** Unix timestamp when the slash was applied; 0 if never slashed. */
  slashedAt: BN;
  /** SlashRecord PDA associated with the most recent slash. */
  slashRecord: PublicKey;
  /** Unix timestamp when the service was registered. */
  createdAt: BN;
  /** PDA bump seed. */
  bump: number;
  /** Reserved bytes for future upgrades. */
  reserved: number[];
}

/**
 * Mirrors the on-chain `ValidatorState` account.
 */
export interface ValidatorState {
  /** The wallet/keypair that owns this validator position. */
  authority: PublicKey;
  /** Raw tokens deposited by the validator. */
  stake: BN;
  /** Risk-adjusted stake after applying the restaking degree. */
  effectiveStake: BN;
  /** Sum of raw token amounts allocated across all services. */
  totalAllocated: BN;
  /** Sum of effective stake amounts allocated across all services. */
  totalEffectiveAllocated: BN;
  /** Current restaking degree in basis points. */
  restakingDegreeBps: number;
  /** Number of active service allocations. */
  allocationCount: number;
  /** Lifetime rewards claimed by this validator. */
  cumulativeRewards: BN;
  /** Rewards accrued but not yet claimed. */
  pendingRewards: BN;
  /** Epoch index at which rewards were last settled. */
  lastRewardEpoch: BN;
  /** Stake tokens locked in a pending withdrawal. */
  pendingWithdrawal: BN;
  /** Whether the validator is active and eligible for allocations. */
  isActive: boolean;
  /** Unix timestamp when the validator registered. */
  createdAt: BN;
  /** PDA bump seed. */
  bump: number;
  /** Reserved bytes for future upgrades. */
  reserved: number[];
}

/**
 * Mirrors the on-chain `AllocationState` account.
 */
export interface AllocationState {
  /** The validator that created this allocation. */
  validator: PublicKey;
  /** The service this allocation targets. */
  serviceId: number;
  /** Raw token amount committed to this allocation. */
  amount: BN;
  /** Risk-adjusted amount after applying the restaking degree. */
  effectiveAmount: BN;
  /** Current lifecycle status of the allocation. */
  status: AllocationStatus;
  /** Epoch at which the allocation became (or will become) active. */
  activationEpoch: BN;
  /** Epoch at which deactivation was completed; 0 if not deactivating. */
  deactivationEpoch: BN;
  /** Reward debt for the share-based reward calculation. */
  rewardDebt: BN;
  /** Rewards accrued but not yet claimed. */
  pendingRewards: BN;
  /** Epoch at which rewards were last settled. */
  lastRewardEpoch: BN;
  /** Unix timestamp when the allocation was created. */
  createdAt: BN;
  /** PDA bump seed. */
  bump: number;
  /** Reserved bytes for future upgrades. */
  reserved: number[];
}

/**
 * Mirrors the on-chain `WithdrawalTicket` account.
 */
export interface WithdrawalTicket {
  /** The validator that requested the withdrawal. */
  validator: PublicKey;
  /** Monotonically increasing index scoped to the validator (used in PDA seeds). */
  ticketId: number;
  /** Token amount locked in this withdrawal request. */
  amount: BN;
  /** Epoch index at which the withdrawal was requested. */
  epochRequested: BN;
  /** True once the cooldown has elapsed and funds can be reclaimed. */
  isClaimable: boolean;
  /** Unix timestamp when the ticket was created. */
  createdAt: BN;
  /** PDA bump seed. */
  bump: number;
  /** Reserved bytes for future upgrades. */
  reserved: number[];
}

/**
 * Mirrors the on-chain `SlashProposal` account.
 */
export interface SlashProposal {
  /** Monotonically increasing identifier assigned at proposal creation. */
  proposalId: number;
  /** The service targeted by this slash proposal. */
  serviceId: number;
  /** The account that created the proposal. */
  proposer: PublicKey;
  /** Unix timestamp after which the proposal can be finalized. */
  disputeEnd: BN;
  /** True if the authority vetoed the proposal before dispute_end. */
  isVetoed: boolean;
  /** True once the slash has been finalized. */
  isFinalized: boolean;
  /** Unix timestamp when the proposal was created. */
  createdAt: BN;
  /** PDA bump seed. */
  bump: number;
  /** Reserved bytes for future upgrades. */
  reserved: number[];
}

/**
 * Mirrors the on-chain `SlashRecord` account (immutable audit record).
 */
export interface SlashRecord {
  /** Monotonically increasing identifier for this slash event. */
  slashId: number;
  /** The service that was slashed. */
  serviceId: number;
  /** The account that called finalize_slash. */
  executedBy: PublicKey;
  /** Number of validators whose stake was reduced. */
  validatorsAffected: number;
  /** Total token amount removed from validators. */
  totalSlashed: BN;
  /** Network-wide total effective stake before the slash. */
  preTotalEffectiveStake: BN;
  /** Network-wide total effective stake after the slash. */
  postTotalEffectiveStake: BN;
  /** Unix timestamp when the slash was executed. */
  timestamp: BN;
  /** PDA bump seed. */
  bump: number;
  /** Reserved bytes for future upgrades. */
  reserved: number[];
}

// ---------------------------------------------------------------------------
// Instruction parameter types
// ---------------------------------------------------------------------------

/**
 * All fields are optional — only provided values are applied on-chain.
 * Mirrors the `UpdateConfigParams` struct.
 */
export interface UpdateConfigParams {
  targetRestakingDegreeBps?: number | null;
  maxRestakingDegreeBps?: number | null;
  epochDuration?: BN | null;
  withdrawalCooldownEpochs?: number | null;
  allocationDelayEpochs?: number | null;
  deallocationDelayEpochs?: number | null;
  slashDisputeWindow?: BN | null;
  minStakeAmount?: BN | null;
  depositFeeBps?: number | null;
  rewardCommissionBps?: number | null;
  isPaused?: boolean | null;
}
