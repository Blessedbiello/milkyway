"use client";

import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@solana/wallet-adapter-react";
import { findServicePda, PROGRAM_ID } from "./use-elastic-restaking";

export interface OnChainService {
  id: number;
  address: string;
  exists: boolean;
  lamports: number;
  dataLength: number;
}

export function useServices(maxServiceId: number = 20) {
  const { connection } = useConnection();

  return useQuery<OnChainService[]>({
    queryKey: ["services", maxServiceId],
    queryFn: async () => {
      const services: OnChainService[] = [];

      // Batch fetch: build all PDAs upfront, then use getMultipleAccountsInfo
      const pdas = Array.from({ length: maxServiceId }, (_, i) =>
        findServicePda(i)
      );
      const addresses = pdas.map(([pda]) => pda);
      const accounts = await connection.getMultipleAccountsInfo(addresses);

      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        if (!account) continue; // Skip non-existent, but keep scanning
        services.push({
          id: i,
          address: addresses[i].toBase58(),
          exists: true,
          lamports: account.lamports,
          dataLength: account.data.length,
        });
      }

      return services;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useService(serviceId: number) {
  const { connection } = useConnection();
  const [pda] = findServicePda(serviceId);

  return useQuery<OnChainService | null>({
    queryKey: ["service", serviceId],
    queryFn: async () => {
      const accountInfo = await connection.getAccountInfo(pda);
      if (!accountInfo) return null;
      return {
        id: serviceId,
        address: pda.toBase58(),
        exists: true,
        lamports: accountInfo.lamports,
        dataLength: accountInfo.data.length,
      };
    },
    staleTime: 30_000,
  });
}
