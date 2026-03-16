import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "2R3H4JZieWZtvvpXvfoNtDC9vxMmiRVvbS618LwexhW7"
);

// PDA Seeds — must match the on-chain seed literals exactly.
export const NETWORK_CONFIG_SEED = Buffer.from("network_config");
export const SERVICE_SEED = Buffer.from("service");
export const VALIDATOR_SEED = Buffer.from("validator");
export const ALLOCATION_SEED = Buffer.from("allocation");
export const WITHDRAWAL_SEED = Buffer.from("withdrawal");
export const SLASH_PROPOSAL_SEED = Buffer.from("slash_proposal");
export const SLASH_RECORD_SEED = Buffer.from("slash_record");
export const STAKE_VAULT_SEED = Buffer.from("stake_vault");
export const REWARD_VAULT_SEED = Buffer.from("reward_vault");

/** Denominator for all basis-point values used in this protocol. */
export const BPS_DENOMINATOR = 10_000;
