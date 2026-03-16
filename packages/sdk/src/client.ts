import {
  Program,
  AnchorProvider,
  BN,
  type Idl,
} from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  type TransactionSignature,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";

import * as pdas from "./pdas.js";
import { PROGRAM_ID } from "./constants.js";
import type {
  NetworkConfig,
  ServiceState,
  ValidatorState,
  AllocationState,
  WithdrawalTicket,
  SlashProposal,
  SlashRecord,
  UpdateConfigParams,
} from "./types.js";

// Load the IDL at runtime.  The `address` field inside the IDL JSON tells
// Anchor 0.32+ which program ID to use — no separate programId argument.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const idlJson = require("../../target/idl/elastic_restaking.json") as Idl;

// ---------------------------------------------------------------------------
// Internal type alias — casts the generic Program to a fully typed accessor.
// ---------------------------------------------------------------------------

// Using `any` for the program type internally so we can index into
// `program.account` with dynamic string keys without TypeScript complaining.
// The public API still returns strongly-typed interfaces.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProgram = Program<any>;

// Narrow helper so callers don't need inline casts throughout.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMethods = Record<string, (...args: any[]) => any>;

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Encode a UTF-8 string into a fixed-length zero-padded byte array.
 * Throws if the string would exceed `maxLen` bytes when encoded.
 */
function encodeFixedString(value: string, maxLen: number): number[] {
  const encoded = Buffer.from(value, "utf8");
  if (encoded.length > maxLen) {
    throw new Error(
      `String "${value}" is ${encoded.length} bytes, exceeds max length of ${maxLen}.`
    );
  }
  const padded = Buffer.alloc(maxLen, 0);
  encoded.copy(padded);
  return Array.from(padded);
}

/**
 * Decode a fixed-length zero-padded byte array back to a UTF-8 string,
 * trimming trailing null bytes.
 */
export function decodeFixedString(bytes: number[]): string {
  const buf = Buffer.from(bytes);
  const end = buf.indexOf(0);
  return buf.slice(0, end === -1 ? buf.length : end).toString("utf8");
}

// ---------------------------------------------------------------------------
// ElasticRestakingClient
// ---------------------------------------------------------------------------

/**
 * High-level client for interacting with the Elastic Restaking program.
 *
 * Usage:
 * ```ts
 * const provider = AnchorProvider.env();
 * const client = new ElasticRestakingClient(provider);
 *
 * await client.initializeNetwork(stakeMint, rewardMint, treasury);
 * ```
 *
 * In Anchor 0.32+, the program address is read from the IDL's `address` field
 * automatically — there is no separate `programId` constructor parameter.
 */
export class ElasticRestakingClient {
  readonly program: AnyProgram;
  readonly provider: AnchorProvider;

  constructor(provider: AnchorProvider) {
    this.provider = provider;
    // Anchor 0.32 constructor: (idl, provider?, coder?, getCustomResolver?)
    // The program address is embedded in the IDL's `address` field.
    this.program = new Program(idlJson, provider) as AnyProgram;
  }

  /** The on-chain program ID (convenience accessor). */
  get programId(): PublicKey {
    return PROGRAM_ID;
  }

  /**
   * Type-erased accessor for `program.methods` that avoids the excessive
   * generic-depth errors triggered by Anchor's deeply-nested method types.
   */
  private get m(): AnyMethods {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.program as any).methods as AnyMethods;
  }

  // -------------------------------------------------------------------------
  // Admin instructions
  // -------------------------------------------------------------------------

  /**
   * Initialize the network configuration and stake vault.
   * Must be called exactly once before any other instructions.
   */
  async initializeNetwork(
    stakeMint: PublicKey,
    rewardMint: PublicKey,
    treasury: PublicKey
  ): Promise<TransactionSignature> {
    const [networkConfig] = pdas.findNetworkConfigPda();
    const [stakeVault] = pdas.findStakeVaultPda();

    return this.m
      .initializeNetwork()
      .accounts({
        authority: this.provider.wallet.publicKey,
        networkConfig,
        stakeMint,
        rewardMint,
        treasury,
        stakeVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }

  /**
   * Update mutable network configuration parameters.
   * Only the current network authority may call this.
   * Pass `null` for any field you do not wish to change.
   */
  async updateNetworkConfig(
    params: UpdateConfigParams
  ): Promise<TransactionSignature> {
    const [networkConfig] = pdas.findNetworkConfigPda();

    return this.m
      .updateNetworkConfig({
        targetRestakingDegreeBps: params.targetRestakingDegreeBps ?? null,
        maxRestakingDegreeBps: params.maxRestakingDegreeBps ?? null,
        epochDuration: params.epochDuration ?? null,
        withdrawalCooldownEpochs: params.withdrawalCooldownEpochs ?? null,
        allocationDelayEpochs: params.allocationDelayEpochs ?? null,
        deallocationDelayEpochs: params.deallocationDelayEpochs ?? null,
        slashDisputeWindow: params.slashDisputeWindow ?? null,
        minStakeAmount: params.minStakeAmount ?? null,
        depositFeeBps: params.depositFeeBps ?? null,
        rewardCommissionBps: params.rewardCommissionBps ?? null,
        isPaused: params.isPaused ?? null,
      })
      .accounts({
        authority: this.provider.wallet.publicKey,
        networkConfig,
      })
      .rpc();
  }

  /**
   * Begin a two-step authority transfer by nominating a successor.
   * Only the current authority may call this.
   */
  async proposeAuthority(
    newAuthority: PublicKey
  ): Promise<TransactionSignature> {
    const [networkConfig] = pdas.findNetworkConfigPda();

    return this.m
      .proposeAuthority(newAuthority)
      .accounts({
        authority: this.provider.wallet.publicKey,
        networkConfig,
      })
      .rpc();
  }

  /**
   * Accept a pending authority transfer.
   * Must be signed by the nominated new authority (i.e., the provider wallet).
   */
  async acceptAuthority(): Promise<TransactionSignature> {
    const [networkConfig] = pdas.findNetworkConfigPda();

    return this.m
      .acceptAuthority()
      .accounts({
        newAuthority: this.provider.wallet.publicKey,
        networkConfig,
      })
      .rpc();
  }

  // -------------------------------------------------------------------------
  // Service instructions
  // -------------------------------------------------------------------------

  /**
   * Register a new service with the network.
   *
   * The `name` string is UTF-8 encoded and zero-padded to 32 bytes.
   * The `metadataUri` string is UTF-8 encoded and zero-padded to 128 bytes.
   *
   * The service and reward vault PDAs are derived using the current
   * `service_count` from `NetworkConfig`, so the current count is fetched
   * from the chain before building the transaction.
   */
  async registerService(
    name: string,
    metadataUri: string,
    attackThresholdBps: number,
    attackPrize: BN,
    isBaseService: boolean,
    rewardMint: PublicKey
  ): Promise<TransactionSignature> {
    const [networkConfig] = pdas.findNetworkConfigPda();

    // Derive the next service + reward vault PDAs from the current count.
    const config = await this.fetchNetworkConfig();
    const serviceId = config.serviceCount;
    const [service] = pdas.findServicePda(serviceId);
    const [rewardVault] = pdas.findRewardVaultPda(serviceId);

    const nameBytes = encodeFixedString(name, 32);
    const metadataBytes = encodeFixedString(metadataUri, 128);

    return this.m
      .registerService(
        nameBytes,
        metadataBytes,
        attackThresholdBps,
        attackPrize,
        isBaseService
      )
      .accounts({
        authority: this.provider.wallet.publicKey,
        networkConfig,
        service,
        rewardMint,
        rewardVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }

  /**
   * Update mutable fields on an existing service.
   * Only the service's authority may call this.
   * Pass `null` or `undefined` for any field you do not wish to change.
   */
  async updateService(
    serviceAddress: PublicKey,
    newMetadataUri?: string | null,
    newAttackThresholdBps?: number | null,
    newAttackPrize?: BN | null
  ): Promise<TransactionSignature> {
    const newMetadataBytes =
      newMetadataUri != null ? encodeFixedString(newMetadataUri, 128) : null;

    return this.m
      .updateService(
        newMetadataBytes,
        newAttackThresholdBps ?? null,
        newAttackPrize ?? null
      )
      .accounts({
        authority: this.provider.wallet.publicKey,
        service: serviceAddress,
      })
      .rpc();
  }

  /**
   * Deactivate a service so it no longer accepts new allocations.
   * Only the network authority may call this.
   */
  async deactivateService(
    serviceAddress: PublicKey
  ): Promise<TransactionSignature> {
    const [networkConfig] = pdas.findNetworkConfigPda();

    return this.m
      .deactivateService()
      .accounts({
        authority: this.provider.wallet.publicKey,
        networkConfig,
        service: serviceAddress,
      })
      .rpc();
  }

  /**
   * Fund a service's reward pool by depositing reward tokens into its vault.
   * Anyone may fund a service; there are no authority restrictions.
   *
   * @param serviceAddress      The ServiceState PDA address.
   * @param funderTokenAccount  The funder's SPL token account for the reward mint.
   * @param rewardVault         The service's reward vault token account.
   * @param amount              Number of reward tokens to deposit.
   */
  async fundRewards(
    serviceAddress: PublicKey,
    funderTokenAccount: PublicKey,
    rewardVault: PublicKey,
    amount: BN
  ): Promise<TransactionSignature> {
    return this.m
      .fundRewards(amount)
      .accounts({
        funder: this.provider.wallet.publicKey,
        service: serviceAddress,
        funderTokenAccount,
        rewardVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  // -------------------------------------------------------------------------
  // Validator / staking instructions
  // -------------------------------------------------------------------------

  /**
   * Deposit stake tokens into the protocol.
   * Creates a `ValidatorState` account on the first call (paid by the depositor).
   *
   * @param amount                Token amount to deposit (raw units).
   * @param depositorTokenAccount The depositor's SPL token account for the stake mint.
   */
  async depositStake(
    amount: BN,
    depositorTokenAccount: PublicKey
  ): Promise<TransactionSignature> {
    const depositor = this.provider.wallet.publicKey;
    const [networkConfig] = pdas.findNetworkConfigPda();
    const [validatorState] = pdas.findValidatorPda(depositor);
    const [stakeVault] = pdas.findStakeVaultPda();

    return this.m
      .depositStake(amount)
      .accounts({
        depositor,
        networkConfig,
        validatorState,
        depositorTokenAccount,
        stakeVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  /**
   * Allocate a portion of the calling validator's stake to a service.
   * Creates an `AllocationState` PDA if one does not already exist.
   *
   * @param serviceId  Numeric service identifier.
   * @param amount     Raw token amount to allocate.
   */
  async allocateStake(
    serviceId: number,
    amount: BN
  ): Promise<TransactionSignature> {
    const authority = this.provider.wallet.publicKey;
    const [networkConfig] = pdas.findNetworkConfigPda();
    const [validatorState] = pdas.findValidatorPda(authority);
    const [service] = pdas.findServicePda(serviceId);
    const [allocation] = pdas.findAllocationPda(authority, serviceId);

    return this.m
      .allocateStake(serviceId, amount)
      .accounts({
        authority,
        networkConfig,
        validatorState,
        service,
        allocation,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Begin the deallocation process for an existing allocation.
   * The allocation transitions to `Deactivating` and becomes `Inactive` after
   * `deallocation_delay_epochs` epochs.
   *
   * @param serviceId  Numeric service identifier.
   * @param amount     Raw token amount to deallocate.
   */
  async deallocateStake(
    serviceId: number,
    amount: BN
  ): Promise<TransactionSignature> {
    const authority = this.provider.wallet.publicKey;
    const [networkConfig] = pdas.findNetworkConfigPda();
    const [validatorState] = pdas.findValidatorPda(authority);
    const [service] = pdas.findServicePda(serviceId);
    const [allocation] = pdas.findAllocationPda(authority, serviceId);

    return this.m
      .deallocateStake(serviceId, amount)
      .accounts({
        authority,
        networkConfig,
        validatorState,
        service,
        allocation,
      })
      .rpc();
  }

  /**
   * Request a withdrawal of staked tokens.
   * Creates a `WithdrawalTicket` PDA. Funds are locked until
   * `withdrawal_cooldown_epochs` epochs have elapsed.
   *
   * @param amount    Raw token amount to withdraw.
   * @param ticketId  A u32 index that must not be re-used by this validator.
   *                  Callers should derive the next id from the on-chain
   *                  `ValidatorState.allocationCount` or a local counter.
   */
  async requestWithdrawal(
    amount: BN,
    ticketId: number
  ): Promise<TransactionSignature> {
    const authority = this.provider.wallet.publicKey;
    const [networkConfig] = pdas.findNetworkConfigPda();
    const [validatorState] = pdas.findValidatorPda(authority);
    const [withdrawalTicket] = pdas.findWithdrawalTicketPda(
      authority,
      ticketId
    );

    return this.m
      .requestWithdrawal(amount, ticketId)
      .accounts({
        authority,
        networkConfig,
        validatorState,
        withdrawalTicket,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Claim tokens from a withdrawal ticket once the cooldown has elapsed.
   *
   * @param ticketId               The u32 ticket index used at request time.
   * @param authorityTokenAccount  The validator's SPL token account for the
   *                               stake mint that will receive the tokens.
   */
  async completeWithdrawal(
    ticketId: number,
    authorityTokenAccount: PublicKey
  ): Promise<TransactionSignature> {
    const authority = this.provider.wallet.publicKey;
    const [networkConfig] = pdas.findNetworkConfigPda();
    const [validatorState] = pdas.findValidatorPda(authority);
    const [withdrawalTicket] = pdas.findWithdrawalTicketPda(
      authority,
      ticketId
    );
    const [stakeVault] = pdas.findStakeVaultPda();

    return this.m
      .completeWithdrawal()
      .accounts({
        authority,
        networkConfig,
        validatorState,
        withdrawalTicket,
        stakeVault,
        authorityTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  // -------------------------------------------------------------------------
  // Slash instructions
  // -------------------------------------------------------------------------

  /**
   * Propose a slash against a service.
   * Anyone may propose; a dispute window then opens during which the authority
   * can veto.  The slash proposal PDA is seeded from the current
   * `slash_proposal_count`, so the count is fetched before building the tx.
   *
   * @param serviceId  Numeric service identifier.
   */
  async proposeSlash(serviceId: number): Promise<TransactionSignature> {
    const proposer = this.provider.wallet.publicKey;
    const [networkConfig] = pdas.findNetworkConfigPda();
    const [service] = pdas.findServicePda(serviceId);

    const config = await this.fetchNetworkConfig();
    const [slashProposal] = pdas.findSlashProposalPda(
      config.slashProposalCount
    );

    return this.m
      .proposeSlash(serviceId)
      .accounts({
        proposer,
        networkConfig,
        service,
        slashProposal,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Veto a pending slash proposal before its dispute window closes.
   * Only the network authority may call this.
   *
   * @param proposalId  The u32 proposal index.
   */
  async vetoSlash(proposalId: number): Promise<TransactionSignature> {
    const [networkConfig] = pdas.findNetworkConfigPda();
    const [slashProposal] = pdas.findSlashProposalPda(proposalId);

    // Resolve the service PDA from the on-chain proposal's service_id.
    const proposal = await this.fetchSlashProposal(proposalId);
    const [service] = pdas.findServicePda(proposal.serviceId);

    return this.m
      .vetoSlash()
      .accounts({
        authority: this.provider.wallet.publicKey,
        networkConfig,
        slashProposal,
        service,
      })
      .rpc();
  }

  /**
   * Finalize a slash proposal after the dispute window has elapsed.
   *
   * Executes the slash against every affected validator and writes a
   * `SlashRecord` on-chain.  Any remaining slashed tokens are transferred to
   * the treasury.
   *
   * The remaining accounts must contain one writable `ValidatorState` PDA
   * followed by one writable `AllocationState` PDA per affected validator,
   * in alternating order.
   *
   * @param proposalId            The u32 proposal index.
   * @param validatorAllocations  Ordered [{validatorState, allocation}] pairs
   *                              for every validator allocated to the service.
   * @param treasury              The treasury wallet / PDA address.
   * @param treasuryTokenAccount  Treasury's SPL token account for the stake mint.
   */
  async finalizeSlash(
    proposalId: number,
    validatorAllocations: Array<{
      validatorState: PublicKey;
      allocation: PublicKey;
    }>,
    treasury: PublicKey,
    treasuryTokenAccount: PublicKey
  ): Promise<TransactionSignature> {
    const executor = this.provider.wallet.publicKey;
    const [networkConfig] = pdas.findNetworkConfigPda();
    const [slashProposal] = pdas.findSlashProposalPda(proposalId);

    const proposal = await this.fetchSlashProposal(proposalId);
    const [service] = pdas.findServicePda(proposal.serviceId);
    const [slashRecord] = pdas.findSlashRecordPda(proposalId);
    const [stakeVault] = pdas.findStakeVaultPda();

    const remainingAccounts = validatorAllocations.flatMap(
      ({ validatorState, allocation }) => [
        { pubkey: validatorState, isSigner: false, isWritable: true },
        { pubkey: allocation, isSigner: false, isWritable: true },
      ]
    );

    return this.m
      .finalizeSlash()
      .accounts({
        executor,
        networkConfig,
        slashProposal,
        service,
        slashRecord,
        stakeVault,
        treasury,
        treasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  // -------------------------------------------------------------------------
  // Epoch / reward instructions
  // -------------------------------------------------------------------------

  /**
   * Advance the protocol epoch.
   * Can be called by anyone once the epoch duration has elapsed.
   */
  async advanceEpoch(): Promise<TransactionSignature> {
    const [networkConfig] = pdas.findNetworkConfigPda();

    return this.m
      .advanceEpoch()
      .accounts({
        caller: this.provider.wallet.publicKey,
        networkConfig,
      })
      .rpc();
  }

  /**
   * Distribute accumulated rewards from a service's reward vault to a
   * validator's pending reward balance.  Anyone may call this.
   *
   * @param validatorAuthority  The validator's wallet public key.
   * @param serviceId           Numeric service identifier.
   */
  async distributeRewards(
    validatorAuthority: PublicKey,
    serviceId: number
  ): Promise<TransactionSignature> {
    const [networkConfig] = pdas.findNetworkConfigPda();
    const [validatorState] = pdas.findValidatorPda(validatorAuthority);
    const [service] = pdas.findServicePda(serviceId);
    const [allocation] = pdas.findAllocationPda(validatorAuthority, serviceId);

    return this.m
      .distributeRewards(serviceId)
      .accounts({
        caller: this.provider.wallet.publicKey,
        networkConfig,
        validatorState,
        service,
        allocation,
      })
      .rpc();
  }

  /**
   * Claim all pending rewards for the calling validator.
   * Tokens are transferred from the stake vault to the provided token account.
   *
   * @param authorityTokenAccount The validator's SPL token account for the
   *                              reward mint that will receive the tokens.
   */
  async claimRewards(
    authorityTokenAccount: PublicKey
  ): Promise<TransactionSignature> {
    const authority = this.provider.wallet.publicKey;
    const [networkConfig] = pdas.findNetworkConfigPda();
    const [validatorState] = pdas.findValidatorPda(authority);
    const [stakeVault] = pdas.findStakeVaultPda();

    return this.m
      .claimRewards()
      .accounts({
        authority,
        networkConfig,
        validatorState,
        stakeVault,
        authorityTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  /**
   * Trigger an on-chain rebalance of all allocation effective amounts for a
   * given validator.  Anyone may call this on behalf of any validator.
   *
   * @param validatorAuthority  The validator whose allocations should be rebalanced.
   */
  async rebalanceAllocations(
    validatorAuthority: PublicKey
  ): Promise<TransactionSignature> {
    const [validatorState] = pdas.findValidatorPda(validatorAuthority);

    return this.m
      .rebalanceAllocations()
      .accounts({
        caller: this.provider.wallet.publicKey,
        validatorState,
      })
      .rpc();
  }

  // -------------------------------------------------------------------------
  // Query helpers
  // -------------------------------------------------------------------------

  /** Fetch and return the deserialized `NetworkConfig` account. */
  async fetchNetworkConfig(): Promise<NetworkConfig> {
    const [networkConfig] = pdas.findNetworkConfigPda();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.program.account as any)["networkConfig"].fetch(
      networkConfig
    ) as Promise<NetworkConfig>;
  }

  /**
   * Fetch and return the deserialized `ServiceState` for a given numeric id.
   * @param serviceId  Numeric service identifier.
   */
  async fetchService(serviceId: number): Promise<ServiceState> {
    const [service] = pdas.findServicePda(serviceId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.program.account as any)["serviceState"].fetch(
      service
    ) as Promise<ServiceState>;
  }

  /**
   * Fetch a `ServiceState` directly by PDA address.
   * Useful when you already have the address from an on-chain event.
   */
  async fetchServiceByAddress(address: PublicKey): Promise<ServiceState> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.program.account as any)["serviceState"].fetch(
      address
    ) as Promise<ServiceState>;
  }

  /**
   * Fetch and return the deserialized `ValidatorState` for a given authority.
   * @param authority  The validator's wallet public key.
   */
  async fetchValidator(authority: PublicKey): Promise<ValidatorState> {
    const [validatorState] = pdas.findValidatorPda(authority);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.program.account as any)["validatorState"].fetch(
      validatorState
    ) as Promise<ValidatorState>;
  }

  /**
   * Fetch and return the deserialized `AllocationState`.
   * @param authority  The validator's wallet public key.
   * @param serviceId  Numeric service identifier.
   */
  async fetchAllocation(
    authority: PublicKey,
    serviceId: number
  ): Promise<AllocationState> {
    const [allocation] = pdas.findAllocationPda(authority, serviceId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.program.account as any)["allocationState"].fetch(
      allocation
    ) as Promise<AllocationState>;
  }

  /**
   * Fetch and return the deserialized `WithdrawalTicket`.
   * @param authority  The validator's wallet public key.
   * @param ticketId   The u32 ticket index.
   */
  async fetchWithdrawalTicket(
    authority: PublicKey,
    ticketId: number
  ): Promise<WithdrawalTicket> {
    const [ticket] = pdas.findWithdrawalTicketPda(authority, ticketId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.program.account as any)["withdrawalTicket"].fetch(
      ticket
    ) as Promise<WithdrawalTicket>;
  }

  /**
   * Fetch and return the deserialized `SlashProposal`.
   * @param proposalId  The u32 proposal index.
   */
  async fetchSlashProposal(proposalId: number): Promise<SlashProposal> {
    const [slashProposal] = pdas.findSlashProposalPda(proposalId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.program.account as any)["slashProposal"].fetch(
      slashProposal
    ) as Promise<SlashProposal>;
  }

  /**
   * Fetch and return the deserialized `SlashRecord`.
   * @param proposalId  The u32 proposal index that produced the slash record.
   */
  async fetchSlashRecord(proposalId: number): Promise<SlashRecord> {
    const [slashRecord] = pdas.findSlashRecordPda(proposalId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.program.account as any)["slashRecord"].fetch(
      slashRecord
    ) as Promise<SlashRecord>;
  }

  /**
   * Fetch all `ServiceState` accounts registered on the network.
   * Results are not guaranteed to be sorted by serviceId.
   */
  async fetchAllServices(): Promise<
    Array<{ publicKey: PublicKey; account: ServiceState }>
  > {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.program.account as any)["serviceState"].all();
    return accounts as Array<{ publicKey: PublicKey; account: ServiceState }>;
  }

  /**
   * Fetch all `ValidatorState` accounts registered on the network.
   */
  async fetchAllValidators(): Promise<
    Array<{ publicKey: PublicKey; account: ValidatorState }>
  > {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.program.account as any)[
      "validatorState"
    ].all();
    return accounts as Array<{
      publicKey: PublicKey;
      account: ValidatorState;
    }>;
  }

  /**
   * Fetch all `AllocationState` accounts created by a given validator.
   * Uses a `memcmp` filter on the `validator` field (bytes 8–40).
   *
   * @param authority  The validator's wallet public key.
   */
  async fetchValidatorAllocations(
    authority: PublicKey
  ): Promise<Array<{ publicKey: PublicKey; account: AllocationState }>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.program.account as any)[
      "allocationState"
    ].all([
      {
        memcmp: {
          // 8-byte discriminator, then the `validator` pubkey field starts.
          offset: 8,
          bytes: authority.toBase58(),
        },
      },
    ]);
    return accounts as Array<{
      publicKey: PublicKey;
      account: AllocationState;
    }>;
  }

  /**
   * Fetch all `AllocationState` accounts targeting a given service.
   * Uses a `memcmp` filter on the `service_id` field (bytes 40–44).
   *
   * @param serviceId  Numeric service identifier.
   */
  async fetchServiceAllocations(
    serviceId: number
  ): Promise<Array<{ publicKey: PublicKey; account: AllocationState }>> {
    const serviceIdBuf = Buffer.alloc(4);
    serviceIdBuf.writeUInt32LE(serviceId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.program.account as any)[
      "allocationState"
    ].all([
      {
        memcmp: {
          // 8 discriminator + 32 validator pubkey = offset 40 for service_id.
          offset: 8 + 32,
          bytes: serviceIdBuf.toString("base64"),
        },
      },
    ]);
    return accounts as Array<{
      publicKey: PublicKey;
      account: AllocationState;
    }>;
  }

  /**
   * Fetch all slash proposals that are neither finalized nor vetoed.
   */
  async fetchActiveSlashProposals(): Promise<
    Array<{ publicKey: PublicKey; account: SlashProposal }>
  > {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await (this.program.account as any)["slashProposal"].all();
    return (
      all as Array<{ publicKey: PublicKey; account: SlashProposal }>
    ).filter(({ account }) => !account.isFinalized && !account.isVetoed);
  }

  // -------------------------------------------------------------------------
  // Token account utilities
  // -------------------------------------------------------------------------

  /**
   * Derive the Associated Token Account address for a wallet and mint.
   * Convenience wrapper around `@solana/spl-token`.
   */
  async getAssociatedTokenAccount(
    owner: PublicKey,
    mint: PublicKey
  ): Promise<PublicKey> {
    return getAssociatedTokenAddress(mint, owner);
  }
}
