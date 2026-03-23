"use client";

import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "2R3H4JZieWZtvvpXvfoNtDC9vxMmiRVvbS618LwexhW7"
);

export function findNetworkConfigPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("network_config")],
    PROGRAM_ID
  );
}

export function findServicePda(serviceId: number) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(serviceId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("service"), buf],
    PROGRAM_ID
  );
}

export function findValidatorPda(authority: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("validator"), authority.toBuffer()],
    PROGRAM_ID
  );
}

export function findAllocationPda(authority: PublicKey, serviceId: number) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(serviceId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("allocation"), authority.toBuffer(), buf],
    PROGRAM_ID
  );
}

export function findStakeVaultPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake_vault")],
    PROGRAM_ID
  );
}

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return { provider, programId: PROGRAM_ID };
  }, [connection, wallet]);
}
