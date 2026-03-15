/**
 * (f, β)-robustness analysis for restaking networks.
 * Port of the robustness definitions from Bar-Zur & Eyal, ACM CCS '25.
 *
 * A network is (f, β)-robust if an adversary controlling fraction f of
 * validators and budget fraction β of total stake cannot mount a profitable
 * attack. This module finds the minimum β at which security breaks down.
 */

import { RestakingNetwork } from "./network-model";

export interface RobustnessResult {
  /** True when the network resists all attacks up to the computed thresholds. */
  robust: boolean;
  /**
   * Minimum fraction of adversarial budget (β = budget / totalStake) required
   * to break security. Equals 1 when no budget suffices.
   */
  minimumBudgetFraction: number;
  /**
   * Synonym for minimumBudgetFraction (the paper treats f ≈ β in the symmetric
   * case; a more precise f computation requires per-validator analysis).
   */
  minimumByzantineFraction: number;
}

/**
 * Find the minimum adversary budget fraction β that makes a profitable attack
 * possible on `network`, using 50 iterations of binary search.
 *
 * An attacker with budget `B = β · totalStake` can attack a service subset
 * whose cost ≤ B and prize > cost.
 *
 * @param network       The restaking network to analyse.
 * @param _lossThreshold  Reserved for future threshold-based pruning (unused).
 */
export function checkRobustness(
  network: RestakingNetwork,
  _lossThreshold: number = 0.1
): RobustnessResult {
  const totalStake = network.validators.reduce((sum, v) => sum + v.stake, 0);

  let low = 0;
  let high = 1;
  let minimumBudgetFraction = 1;
  let robust = true;

  for (let iter = 0; iter < 50; iter++) {
    const mid = (low + high) / 2;
    const budget = mid * totalStake;

    if (checkIfAttackPossible(network, budget)) {
      high = mid;
      minimumBudgetFraction = mid;
      robust = false;
    } else {
      low = mid;
    }
  }

  return {
    robust,
    minimumBudgetFraction,
    minimumByzantineFraction: minimumBudgetFraction,
  };
}

/**
 * Return true if there exists a service subset whose attack cost ≤ `budget`
 * and whose prize strictly exceeds its cost (i.e. the attack is profitable).
 */
function checkIfAttackPossible(
  network: RestakingNetwork,
  budget: number
): boolean {
  const numServices = network.services.length;

  for (let mask = 1; mask < 1 << numServices; mask++) {
    const cost = network.calculateAttackCost(mask);
    const prize = network.calculateAttackPrize(mask);

    if (cost <= budget && prize > cost) {
      return true;
    }
  }

  return false;
}
