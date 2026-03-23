/**
 * Core restaking network model.
 * TypeScript port of the Python reference implementation from:
 * "Elastic Restaking Networks" — Bar-Zur & Eyal, ACM CCS '25.
 */

export interface Service {
  id: number;
  /** θ(s) — fraction of total stake needed to successfully attack this service. */
  attackThreshold: number;
  /** π(s) — prize awarded to the attacker if this service is compromised. */
  attackPrize: number;
  /** Sum of all validator allocations to this service. */
  totalAllocated: number;
}

export interface Validator {
  id: number;
  /** σ(v) — the validator's total stake. */
  stake: number;
  /** Effective stake after applying any prior slashing. Starts equal to stake. */
  effectiveStake: number;
  /** Nominal allocation amounts: service_id → w(v, s). */
  allocations: Map<number, number>;
}

export interface ByzantineResult {
  /** Total stake slashed across all validators for this service subset. */
  slashedTotal: number;
  /** Number of distinct validators that had at least one allocation slashed. */
  validatorsAffected: number;
  /** Per-validator effective stake after slashing (validator id → remaining stake). */
  postEffectiveStakes: Map<number, number>;
}

export class RestakingNetwork {
  validators: Validator[];
  services: Service[];

  constructor(validators: Validator[], services: Service[]) {
    this.validators = validators;
    this.services = services;
  }

  /**
   * Apply elastic slashing for a set of Byzantine services and return the
   * resulting state. Implements Equations 11–12 from the paper.
   *
   * Services are identified by a bitmask over `this.services` (bit i = service i).
   *
   * The elastic model:
   *   - Each validator v starts with effectiveStake = σ(v).
   *   - For each Byzantine service sB (in index order):
   *       slashAmount = min(w(v, sB), currentEffective)
   *       effectiveStake -= slashAmount
   *   - Remaining allocations "stretch": effective_amount = min(w(v,s), effectiveStake).
   *
   * Slashing services in index order is consistent with the paper's sequential
   * treatment; the total slashed from any validator is capped at σ(v).
   */
  applyByzantineServices(byzantineMask: number): ByzantineResult {
    // Clone effective stakes so we never mutate the original validators.
    const effectiveStakes = new Map<number, number>();
    for (const v of this.validators) {
      effectiveStakes.set(v.id, v.stake);
    }

    let slashedTotal = 0;
    const affectedValidators = new Set<number>();

    for (let i = 0; i < this.services.length; i++) {
      if (!(byzantineMask & (1 << i))) continue;

      const service = this.services[i];

      for (const v of this.validators) {
        const allocation = v.allocations.get(service.id) ?? 0;
        if (allocation <= 0) continue;

        affectedValidators.add(v.id);
        const currentEffective = effectiveStakes.get(v.id)!;
        const slashAmount = Math.min(allocation, currentEffective);
        effectiveStakes.set(v.id, Math.max(0, currentEffective - slashAmount));
        slashedTotal += slashAmount;
      }
    }

    return {
      slashedTotal,
      validatorsAffected: affectedValidators.size,
      postEffectiveStakes: effectiveStakes,
    };
  }

  /**
   * Return the total stake slashed when the services identified by
   * `byzantineMask` all turn Byzantine simultaneously.
   */
  calculateAttackCost(byzantineMask: number): number {
    return this.applyByzantineServices(byzantineMask).slashedTotal;
  }

  /**
   * Return the sum of attack prizes for all services in `byzantineMask`.
   */
  calculateAttackPrize(byzantineMask: number): number {
    let totalPrize = 0;
    for (let i = 0; i < this.services.length; i++) {
      if (byzantineMask & (1 << i)) {
        totalPrize += this.services[i].attackPrize;
      }
    }
    return totalPrize;
  }

  /**
   * Check whether the network is secure by enumerating all 2^S − 1 non-empty
   * service subsets and verifying that no subset yields a profitable attack
   * (i.e. prize > cost).
   *
   * Returns the worst-case subset (minimum profit margin) along with its margin.
   * A positive margin means the attack is unprofitable; negative means insecure.
   */
  checkSecurity(): {
    secure: boolean;
    worstSubset: number;
    profitMargin: number;
  } {
    const numServices = this.services.length;
    let worstMargin = Infinity;
    let worstSubset = 0;

    for (let mask = 1; mask < 1 << numServices; mask++) {
      const cost = this.calculateAttackCost(mask);
      const prize = this.calculateAttackPrize(mask);
      const margin = cost - prize;

      if (margin < worstMargin) {
        worstMargin = margin;
        worstSubset = mask;
      }
    }

    return {
      secure: worstMargin >= 0,
      worstSubset,
      profitMargin: worstMargin,
    };
  }
}
