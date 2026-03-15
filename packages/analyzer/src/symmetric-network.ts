/**
 * Efficient closed-form analysis for fully symmetric restaking networks.
 * TypeScript port of `FullySymmetricRestakingNetwork` from the paper's reference
 * implementation — Bar-Zur & Eyal, ACM CCS '25.
 *
 * "Symmetric" means:
 *   - All validators have the same stake σ.
 *   - Each validator allocates to exactly d services (restaking degree).
 *   - All services share the same attack threshold θ and prize π.
 *   - Allocations are spread uniformly across the d chosen services.
 *
 * Elastic allocation model (degree d, stake σ):
 *   w(v, s) = σ   for each of the d services a validator allocates to.
 *   Total allocated per validator = d · σ > σ   (the "elastic" part).
 *
 * Slashing dynamics when h services that v is allocated to turn Byzantine:
 *   The slashes are applied sequentially; each removes min(w, effectiveStake).
 *   1st slash: min(σ, σ)  = σ  → effectiveStake = 0
 *   2nd+ slash: min(σ, 0) = 0  → no additional loss
 *   Therefore a validator's total loss = σ regardless of how many (≥1) of its
 *   allocated services are attacked. This is a key property of the elastic model.
 *
 * Cost to attack k services:
 *   = (number of validators allocated to at least one of the k services) · σ
 */

export interface SymmetricParams {
  numValidators: number;
  numServices: number;
  stakePerValidator: number;
  /** d — how many services each validator allocates stake to. */
  restakingDegree: number;
  /** θ — attack threshold, same for all services. */
  attackThreshold: number;
  /** π — attack prize, same for all services. */
  attackPrize: number;
}

export interface SymmetricSecurityResult {
  /** True when no profitable attack on any subset of services exists. */
  secure: boolean;
  /**
   * The cost of the cheapest successful attack (i.e. attack cost at the
   * worst-case subset). Equals the minimum over all k of (validators_hit(k) · σ).
   * When the network is secure this is still the cost of the closest-to-profitable
   * attack — useful as a robustness measure.
   */
  minAttackCost: number;
  /** Maximum prize achievable by attacking all S services. */
  maxPrize: number;
}

export class SymmetricRestakingNetwork {
  params: SymmetricParams;

  constructor(params: SymmetricParams) {
    this.params = params;
  }

  /**
   * Check security by examining every possible attack size k ∈ {1, …, S}.
   *
   * For each k, the attacker targets k services. The cost equals the number of
   * validators hit (allocated to ≥1 attacked service) times σ.  Because each
   * validator loses at most σ regardless of how many of its services are in the
   * attack set (see module-level comment), this is exact.
   *
   * The network is secure iff cost(k) ≥ k · π for every k.
   */
  checkSecurity(): SymmetricSecurityResult {
    const {
      numServices: S,
      stakePerValidator: sigma,
      attackPrize: pi,
    } = this.params;

    let minMargin = Infinity;
    let minAttackCost = Infinity;

    for (let k = 1; k <= S; k++) {
      const prize = k * pi;
      const validatorsHit = this.computeValidatorsHit(k);
      const cost = validatorsHit * sigma;

      const margin = cost - prize;
      if (margin < minMargin) {
        minMargin = margin;
        minAttackCost = cost;
      }
    }

    return {
      secure: minMargin >= 0,
      minAttackCost,
      maxPrize: S * pi,
    };
  }

  /**
   * Expected number of validators that have at least one of their d allocated
   * services among the k targeted services.
   *
   * Under a uniform random symmetric assignment (each validator independently
   * picks d services from S uniformly at random):
   *
   *   P(validator NOT hit) = C(S−k, d) / C(S, d)
   *   validatorsHit        = n · (1 − P(NOT hit))
   *
   * Edge cases:
   *   k ≥ S or d ≥ S → every validator is hit → returns n.
   *   S−k < d        → C(S−k, d) = 0 → every validator is hit.
   */
  private computeValidatorsHit(k: number): number {
    const { numValidators: n, numServices: S, restakingDegree: d } = this.params;

    if (k >= S || d >= S) return n;

    const probNotHit = this.binomRatio(S - k, d, S, d);
    return n * (1 - probNotHit);
  }

  /**
   * Compute C(n1, k1) / C(n2, k2) in a numerically stable way by interleaving
   * multiplications and divisions. Returns 0 when n1 < k1.
   */
  private binomRatio(
    n1: number,
    k1: number,
    n2: number,
    k2: number
  ): number {
    if (n1 < k1 || n1 < 0) return 0;

    const steps = Math.max(k1, k2);
    let ratio = 1;
    for (let i = 0; i < steps; i++) {
      if (i < k1) ratio *= n1 - i;
      if (i < k2) ratio /= n2 - i;
    }
    return ratio;
  }
}
