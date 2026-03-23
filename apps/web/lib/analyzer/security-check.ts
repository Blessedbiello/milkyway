/**
 * Brute-force security checker for general (non-symmetric) restaking networks.
 * Enumerates all 2^S − 1 service subsets and finds the most dangerous attack.
 */

import { RestakingNetwork } from "./network-model";

export interface SecurityResult {
  /** True when no service subset can be attacked at a profit. */
  secure: boolean;
  /** IDs of the services in the worst-case (most profitable) attack subset. */
  worstSubset: number[];
  /** Cost paid by the attacker to compromise the worst-case subset. */
  attackCost: number;
  /** Prize earned by the attacker from the worst-case subset. */
  attackPrize: number;
  /**
   * attackCost − attackPrize.
   * Positive → no profitable attack exists at this subset.
   * Negative → the network is insecure.
   */
  profitMargin: number;
  /**
   * Normalised security score in [0, 100].
   * 100 means an attacker would need to spend at least double the prize.
   * 0  means the attack is free or already profitable.
   */
  securityScore: number;
}

/**
 * Run a full security analysis on `network` and return a structured result.
 *
 * The score formula: score = clamp((cost/prize − 1) × 50, 0, 100)
 *   - cost = 2× prize → score 50
 *   - cost = 3× prize → score 100
 *   - cost ≤ prize    → score 0
 */
export function checkNetworkSecurity(network: RestakingNetwork): SecurityResult {
  const { worstSubset: worstMask, profitMargin, secure } = network.checkSecurity();

  // Decode bitmask to service ID array.
  const worstSubset: number[] = [];
  for (let i = 0; i < network.services.length; i++) {
    if (worstMask & (1 << i)) {
      worstSubset.push(network.services[i].id);
    }
  }

  const attackCost = network.calculateAttackCost(worstMask);
  const attackPrize = network.calculateAttackPrize(worstMask);

  const securityScore =
    attackPrize > 0
      ? Math.min(100, Math.max(0, (attackCost / attackPrize - 1) * 50))
      : 100;

  return {
    secure,
    worstSubset,
    attackCost,
    attackPrize,
    profitMargin,
    securityScore,
  };
}
