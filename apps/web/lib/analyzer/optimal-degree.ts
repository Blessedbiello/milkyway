/**
 * Optimal restaking degree search and paper figure data generators.
 * Port of main.py from Bar-Zur & Eyal, ACM CCS '25.
 *
 * The key result of the paper is that there exists an optimal degree d* that
 * maximises the robustness of a symmetric restaking network.  These helpers
 * reproduce the data behind Figures 3–6.
 */

import { SymmetricRestakingNetwork, SymmetricParams } from "./symmetric-network";

// ---------------------------------------------------------------------------
// Optimal degree search
// ---------------------------------------------------------------------------

export interface OptimalDegreeResult {
  /** The restaking degree d* that maximises robustness (minAttackCost). */
  optimalDegree: number;
  /** Value of minAttackCost at d*. */
  robustnessAtOptimal: number;
}

/**
 * Search over all degrees d ∈ [1, maxDegree] and return the one that
 * maximises robustness (measured as minAttackCost from checkSecurity).
 *
 * Port of `search_for_minimum_stake` / the d* sweep in main.py.
 */
export function computeOptimalDegree(params: {
  numValidators: number;
  numServices: number;
  stakePerValidator: number;
  attackThreshold: number;
  attackPrize: number;
  maxDegree?: number;
}): OptimalDegreeResult {
  const maxDeg = params.maxDegree ?? params.numServices;
  let bestDegree = 1;
  let bestRobustness = -Infinity;

  for (let d = 1; d <= maxDeg; d++) {
    const network = new SymmetricRestakingNetwork({
      ...params,
      restakingDegree: d,
    });

    const { minAttackCost } = network.checkSecurity();

    if (minAttackCost > bestRobustness) {
      bestRobustness = minAttackCost;
      bestDegree = d;
    }
  }

  return { optimalDegree: bestDegree, robustnessAtOptimal: bestRobustness };
}

// ---------------------------------------------------------------------------
// Figure 3: minimum stake vs restaking degree
// ---------------------------------------------------------------------------

export interface Figure3Point {
  degree: number;
  /** Minimum per-validator stake σ such that the symmetric network is secure. */
  minStake: number;
}

/**
 * For each degree d, binary-search for the minimum per-validator stake σ that
 * makes the network secure. Reproduces Figure 3 of the paper.
 *
 * The paper's key result: minStake is non-monotone in d — there is an interior
 * minimum (corresponding to d*).
 */
export function generateFigure3Data(params: {
  numValidators: number;
  numServices: number;
  attackThreshold: number;
  attackPrize: number;
  maxDegree?: number;
}): Figure3Point[] {
  const maxDeg = params.maxDegree ?? params.numServices;
  const results: Figure3Point[] = [];

  for (let d = 1; d <= maxDeg; d++) {
    const minStake = searchForMinimumStake({ ...params, restakingDegree: d });
    results.push({ degree: d, minStake });
  }

  return results;
}

/**
 * Binary search for the minimum per-validator stake σ at which the given
 * symmetric network configuration becomes secure.
 */
function searchForMinimumStake(params: {
  numValidators: number;
  numServices: number;
  restakingDegree: number;
  attackThreshold: number;
  attackPrize: number;
}): number {
  // Upper bound: if every validator staked this much, cost >> prize for any d.
  let low = 0;
  let high = params.attackPrize * params.numServices * 10;

  for (let iter = 0; iter < 50; iter++) {
    const mid = (low + high) / 2;

    const network = new SymmetricRestakingNetwork({
      ...params,
      stakePerValidator: mid,
    });

    if (network.checkSecurity().secure) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
}

// ---------------------------------------------------------------------------
// Figure 4: (f, β)-robustness regions
// ---------------------------------------------------------------------------

export interface RobustnessPoint {
  /** Fraction of Byzantine validators f. */
  f: number;
  /** Minimum adversary budget fraction β needed to break security at this f. */
  beta: number;
}

/**
 * For each requested degree, compute the (f, β)-robustness frontier sampled at
 * 5% intervals of f. Reproduces the robustness region plots of Figure 4.
 *
 * In the symmetric model the minimum β to break security at a given f is
 * approximately the ratio of minAttackCost to total stake (f enters through the
 * fraction of validators that can be corrupted; for simplicity we scale
 * minAttackCost by 1/f to reflect that adversarial stake ≈ f · totalStake).
 */
export function generateFigure4Data(params: {
  numValidators: number;
  numServices: number;
  stakePerValidator: number;
  attackThreshold: number;
  attackPrize: number;
  degrees: number[];
}): Map<number, RobustnessPoint[]> {
  const results = new Map<number, RobustnessPoint[]>();
  const totalStake = params.numValidators * params.stakePerValidator;

  for (const d of params.degrees) {
    const points: RobustnessPoint[] = [];

    const network = new SymmetricRestakingNetwork({
      ...params,
      restakingDegree: d,
    });
    const { minAttackCost } = network.checkSecurity();

    // Sample at f = 0.05, 0.10, …, 1.00
    for (let step = 1; step <= 20; step++) {
      const f = step * 0.05;
      // Adversarial stake available = f · totalStake.
      // β = minAttackCost / (f · totalStake) is the minimum budget fraction
      // relative to adversarial stake needed to fund the cheapest attack.
      const beta = f > 0 ? Math.min(1, minAttackCost / (f * totalStake)) : 1;
      points.push({ f, beta });
    }

    results.set(d, points);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Figure 5: failure thresholds
// ---------------------------------------------------------------------------

export interface Figure5Point {
  degree: number;
  /**
   * Failure threshold = minAttackCost / totalStake.
   * The minimum fraction of total stake that must be slashed to mount a
   * profitable attack.
   */
  failureThreshold: number;
}

/**
 * For each degree d, compute the failure threshold — the attack cost at the
 * worst-case service subset divided by total stake. Reproduces Figure 5.
 */
export function generateFigure5Data(params: {
  numValidators: number;
  numServices: number;
  stakePerValidator: number;
  attackThreshold: number;
  attackPrize: number;
  maxDegree?: number;
}): Figure5Point[] {
  const maxDeg = params.maxDegree ?? params.numServices;
  const totalStake = params.numValidators * params.stakePerValidator;
  const results: Figure5Point[] = [];

  for (let d = 1; d <= maxDeg; d++) {
    const network = new SymmetricRestakingNetwork({
      ...params,
      restakingDegree: d,
    });

    const { minAttackCost } = network.checkSecurity();
    results.push({ degree: d, failureThreshold: minAttackCost / totalStake });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Figure 6: base service synergy
// ---------------------------------------------------------------------------

export interface Figure6Point {
  degree: number;
  /** Failure threshold without a base service. */
  withoutBase: number;
  /** Failure threshold when one additional "base" service is added. */
  withBase: number;
}

/**
 * Compare failure thresholds with and without a base service for each degree d.
 * The base service adds one extra service that every validator also allocates to
 * (degree incremented by 1, numServices incremented by 1). Reproduces Figure 6.
 */
export function generateFigure6Data(params: {
  numValidators: number;
  numServices: number;
  stakePerValidator: number;
  attackThreshold: number;
  attackPrize: number;
  maxDegree?: number;
}): Figure6Point[] {
  const maxDeg = params.maxDegree ?? params.numServices;
  const totalStake = params.numValidators * params.stakePerValidator;
  const results: Figure6Point[] = [];

  for (let d = 1; d <= maxDeg; d++) {
    const noBase = new SymmetricRestakingNetwork({
      ...params,
      restakingDegree: d,
    });
    const noBaseResult = noBase.checkSecurity();

    // Base service: one additional service, each validator adds it to their set.
    const withBase = new SymmetricRestakingNetwork({
      ...params,
      numServices: params.numServices + 1,
      restakingDegree: d + 1,
    });
    const withBaseResult = withBase.checkSecurity();

    results.push({
      degree: d,
      withoutBase: noBaseResult.minAttackCost / totalStake,
      withBase: withBaseResult.minAttackCost / totalStake,
    });
  }

  return results;
}
