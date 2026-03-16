import { PublicKey } from "@solana/web3.js";
import {
  PROGRAM_ID,
  NETWORK_CONFIG_SEED,
  SERVICE_SEED,
  VALIDATOR_SEED,
  ALLOCATION_SEED,
  WITHDRAWAL_SEED,
  SLASH_PROPOSAL_SEED,
  SLASH_RECORD_SEED,
  STAKE_VAULT_SEED,
  REWARD_VAULT_SEED,
} from "./constants.js";

/** Returns [PDA, bump] for the singleton NetworkConfig account. */
export function findNetworkConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([NETWORK_CONFIG_SEED], PROGRAM_ID);
}

/**
 * Returns [PDA, bump] for a ServiceState account.
 * @param serviceId  u32 service index (little-endian on-chain).
 */
export function findServicePda(serviceId: number): [PublicKey, number] {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(serviceId);
  return PublicKey.findProgramAddressSync([SERVICE_SEED, buf], PROGRAM_ID);
}

/**
 * Returns [PDA, bump] for a ValidatorState account.
 * @param authority  The validator's wallet public key.
 */
export function findValidatorPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VALIDATOR_SEED, authority.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Returns [PDA, bump] for an AllocationState account.
 * @param authority  The validator's wallet public key.
 * @param serviceId  u32 service index (little-endian on-chain).
 */
export function findAllocationPda(
  authority: PublicKey,
  serviceId: number
): [PublicKey, number] {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(serviceId);
  return PublicKey.findProgramAddressSync(
    [ALLOCATION_SEED, authority.toBuffer(), buf],
    PROGRAM_ID
  );
}

/**
 * Returns [PDA, bump] for a WithdrawalTicket account.
 * @param authority  The validator's wallet public key.
 * @param ticketId   u32 ticket index scoped to the validator (little-endian).
 */
export function findWithdrawalTicketPda(
  authority: PublicKey,
  ticketId: number
): [PublicKey, number] {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(ticketId);
  return PublicKey.findProgramAddressSync(
    [WITHDRAWAL_SEED, authority.toBuffer(), buf],
    PROGRAM_ID
  );
}

/**
 * Returns [PDA, bump] for a SlashProposal account.
 * @param proposalId  u32 proposal index (little-endian on-chain).
 */
export function findSlashProposalPda(proposalId: number): [PublicKey, number] {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(proposalId);
  return PublicKey.findProgramAddressSync(
    [SLASH_PROPOSAL_SEED, buf],
    PROGRAM_ID
  );
}

/**
 * Returns [PDA, bump] for a SlashRecord account.
 * @param proposalId  u32 proposal index matching the originating SlashProposal.
 */
export function findSlashRecordPda(proposalId: number): [PublicKey, number] {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(proposalId);
  return PublicKey.findProgramAddressSync([SLASH_RECORD_SEED, buf], PROGRAM_ID);
}

/** Returns [PDA, bump] for the singleton protocol stake vault token account. */
export function findStakeVaultPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([STAKE_VAULT_SEED], PROGRAM_ID);
}

/**
 * Returns [PDA, bump] for a per-service reward vault token account.
 * @param serviceId  u32 service index (little-endian on-chain).
 */
export function findRewardVaultPda(serviceId: number): [PublicKey, number] {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(serviceId);
  return PublicKey.findProgramAddressSync(
    [REWARD_VAULT_SEED, buf],
    PROGRAM_ID
  );
}
