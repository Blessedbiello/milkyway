"use client";

import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@solana/wallet-adapter-react";
import { findNetworkConfigPda, PROGRAM_ID } from "./use-elastic-restaking";

export interface NetworkConfigData {
  exists: boolean;
  address: string;
  lamports: number;
  dataLength: number;
}

export function useNetworkConfig() {
  const { connection } = useConnection();
  const [pda] = findNetworkConfigPda();

  return useQuery<NetworkConfigData | null>({
    queryKey: ["networkConfig", pda.toBase58()],
    queryFn: async () => {
      const accountInfo = await connection.getAccountInfo(pda);
      if (!accountInfo) return null;
      return {
        exists: true,
        address: pda.toBase58(),
        lamports: accountInfo.lamports,
        dataLength: accountInfo.data.length,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
