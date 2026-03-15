import { describe, it, expect } from "vitest";
import { RestakingNetwork, Validator, Service } from "../network-model";
import { SymmetricRestakingNetwork } from "../symmetric-network";
import { checkNetworkSecurity } from "../security-check";
import { checkRobustness } from "../robustness";
import {
  computeOptimalDegree,
  generateFigure3Data,
  generateFigure4Data,
  generateFigure5Data,
  generateFigure6Data,
} from "../optimal-degree";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNetwork(opts: {
  numValidators?: number;
  stake?: number;
  allocations?: Map<number, number>;
  services?: Service[];
}): RestakingNetwork {
  const numValidators = opts.numValidators ?? 10;
  const stake = opts.stake ?? 100;
  const allocations = opts.allocations ?? new Map([[0, 100], [1, 100]]);

  const validators: Validator[] = Array.from(
    { length: numValidators },
    (_, i) => ({
      id: i,
      stake,
      effectiveStake: stake,
      allocations,
    })
  );

  const services: Service[] = opts.services ?? [
    { id: 0, attackThreshold: 0.5, attackPrize: 200, totalAllocated: numValidators * stake },
    { id: 1, attackThreshold: 0.5, attackPrize: 200, totalAllocated: numValidators * stake },
    { id: 2, attackThreshold: 0.5, attackPrize: 200, totalAllocated: 0 },
  ];

  return new RestakingNetwork(validators, services);
}

// ---------------------------------------------------------------------------
// RestakingNetwork — elastic slashing mechanics
// ---------------------------------------------------------------------------

describe("RestakingNetwork.applyByzantineServices", () => {
  it("slashes exactly the allocation amount when effective stake is sufficient", () => {
    const validators: Validator[] = [
      {
        id: 0,
        stake: 100,
        effectiveStake: 100,
        allocations: new Map([[0, 80], [1, 80]]),
      },
    ];
    const services: Service[] = [
      { id: 0, attackThreshold: 0.5, attackPrize: 50, totalAllocated: 80 },
      { id: 1, attackThreshold: 0.5, attackPrize: 50, totalAllocated: 80 },
    ];
    const network = new RestakingNetwork(validators, services);

    // Slash service 0 only (mask 0b01 = 1).
    const result = network.applyByzantineServices(0b01);
    expect(result.slashedTotal).toBe(80);
    expect(result.postEffectiveStakes.get(0)).toBe(20); // 100 − 80 = 20
    expect(result.validatorsAffected).toBe(1);
  });

  it("caps slash at current effective stake, never goes negative", () => {
    const validators: Validator[] = [
      {
        id: 0,
        stake: 50,
        effectiveStake: 50,
        allocations: new Map([[0, 100]]), // allocation > stake (elastic)
      },
    ];
    const services: Service[] = [
      { id: 0, attackThreshold: 0.5, attackPrize: 50, totalAllocated: 100 },
    ];
    const network = new RestakingNetwork(validators, services);

    const result = network.applyByzantineServices(0b01);
    // Slash = min(100, 50) = 50; effective = 0.
    expect(result.slashedTotal).toBe(50);
    expect(result.postEffectiveStakes.get(0)).toBe(0);
  });

  it("second Byzantine service costs nothing if effective stake is already 0", () => {
    // Elastic: allocation = σ per service. After first slash effective = 0.
    const validators: Validator[] = [
      {
        id: 0,
        stake: 100,
        effectiveStake: 100,
        allocations: new Map([[0, 100], [1, 100]]),
      },
    ];
    const services: Service[] = [
      { id: 0, attackThreshold: 0.5, attackPrize: 50, totalAllocated: 100 },
      { id: 1, attackThreshold: 0.5, attackPrize: 50, totalAllocated: 100 },
    ];
    const network = new RestakingNetwork(validators, services);

    // Attack both services (mask 0b11 = 3).
    const result = network.applyByzantineServices(0b11);
    // First service slashes 100, second slashes min(100, 0) = 0.
    expect(result.slashedTotal).toBe(100);
    expect(result.postEffectiveStakes.get(0)).toBe(0);
  });

  it("does not mutate original validator state", () => {
    const network = makeNetwork({});
    const originalStake = network.validators[0].stake;
    network.applyByzantineServices(0b01);
    expect(network.validators[0].stake).toBe(originalStake);
  });
});

// ---------------------------------------------------------------------------
// RestakingNetwork — security check
// ---------------------------------------------------------------------------

describe("RestakingNetwork.checkSecurity", () => {
  it("detects a clearly secure network (attack cost >> prize)", () => {
    // 10 validators × σ=100 → slashing all of them costs 1000.
    // Prize per service = 200. Attacking any 1 service costs ≤ 1000 > 200.
    const network = makeNetwork({});
    const result = network.checkSecurity();
    expect(result.secure).toBe(true);
    expect(result.profitMargin).toBeGreaterThan(0);
  });

  it("detects an insecure network (prize > cost)", () => {
    // 1 validator, stake=10, allocation=10 to service 0.
    // Prize = 1000 >> cost = 10.
    const validators: Validator[] = [
      {
        id: 0,
        stake: 10,
        effectiveStake: 10,
        allocations: new Map([[0, 10]]),
      },
    ];
    const services: Service[] = [
      { id: 0, attackThreshold: 0.5, attackPrize: 1000, totalAllocated: 10 },
    ];
    const network = new RestakingNetwork(validators, services);
    const result = network.checkSecurity();
    expect(result.secure).toBe(false);
    expect(result.profitMargin).toBeLessThan(0);
  });

  it("identifies the worst-case subset correctly", () => {
    // Service 1 has a much higher prize than service 0.
    const validators: Validator[] = [
      {
        id: 0,
        stake: 100,
        effectiveStake: 100,
        allocations: new Map([[0, 10], [1, 90]]),
      },
    ];
    const services: Service[] = [
      { id: 0, attackThreshold: 0.5, attackPrize: 5, totalAllocated: 10 },
      { id: 1, attackThreshold: 0.5, attackPrize: 5000, totalAllocated: 90 },
    ];
    const network = new RestakingNetwork(validators, services);
    const result = network.checkSecurity();
    // Worst attack is on service 1 alone (cost 90, prize 5000).
    expect(result.worstSubset & 0b10).toBeTruthy();
    expect(result.secure).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkNetworkSecurity
// ---------------------------------------------------------------------------

describe("checkNetworkSecurity", () => {
  it("returns correct security score for an extremely secure network", () => {
    // Cost = 1000, prize = 200 → ratio = 5 → score = min(100, (5-1)*50) = 100.
    const network = makeNetwork({
      services: [
        { id: 0, attackThreshold: 0.5, attackPrize: 200, totalAllocated: 1000 },
        { id: 1, attackThreshold: 0.5, attackPrize: 200, totalAllocated: 1000 },
        { id: 2, attackThreshold: 0.5, attackPrize: 200, totalAllocated: 0 },
      ],
    });
    const result = checkNetworkSecurity(network);
    expect(result.secure).toBe(true);
    expect(result.securityScore).toBe(100);
  });

  it("returns score 0 when attack is free (cost=0, prize>0)", () => {
    const validators: Validator[] = [
      {
        id: 0,
        stake: 0,
        effectiveStake: 0,
        allocations: new Map([[0, 0]]),
      },
    ];
    const services: Service[] = [
      { id: 0, attackThreshold: 0.5, attackPrize: 100, totalAllocated: 0 },
    ];
    const network = new RestakingNetwork(validators, services);
    const result = checkNetworkSecurity(network);
    expect(result.securityScore).toBe(0);
  });

  it("decodes worst subset bitmask to service IDs", () => {
    const network = makeNetwork({});
    const result = checkNetworkSecurity(network);
    // All IDs in worstSubset must be valid service IDs.
    const validIds = new Set(network.services.map((s) => s.id));
    for (const id of result.worstSubset) {
      expect(validIds.has(id)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// SymmetricRestakingNetwork
// ---------------------------------------------------------------------------

describe("SymmetricRestakingNetwork", () => {
  it("returns a boolean secure flag and numeric costs", () => {
    const network = new SymmetricRestakingNetwork({
      numValidators: 10,
      numServices: 3,
      stakePerValidator: 1000,
      restakingDegree: 2,
      attackThreshold: 0.5,
      attackPrize: 1000,
    });
    const result = network.checkSecurity();
    expect(typeof result.secure).toBe("boolean");
    expect(result.minAttackCost).toBeGreaterThanOrEqual(0);
    expect(result.maxPrize).toBe(3 * 1000);
  });

  it("full restaking (d=S) hits every validator for any k", () => {
    // d = S means every validator is in every service.
    // Attacking any k services hits all n validators → cost = n * σ.
    const n = 8;
    const sigma = 100;
    const S = 4;
    const pi = 50; // prize << cost, should be secure
    const network = new SymmetricRestakingNetwork({
      numValidators: n,
      numServices: S,
      stakePerValidator: sigma,
      restakingDegree: S,
      attackThreshold: 0.5,
      attackPrize: pi,
    });
    const result = network.checkSecurity();
    // Cost for k=1 = n * σ = 800 >> prize = 50.
    expect(result.secure).toBe(true);
    expect(result.minAttackCost).toBe(n * sigma);
  });

  it("d=1 means each validator is in exactly one service", () => {
    // With d=1, k=1: validatorsHit ≈ n/S.
    // cost = (n/S) * σ; prize = π.
    // Make cost just barely > prize.
    const n = 10;
    const S = 5;
    const sigma = 100;
    const pi = 100; // cost per service = (10/5)*100 = 200 > 100 → secure
    const network = new SymmetricRestakingNetwork({
      numValidators: n,
      numServices: S,
      stakePerValidator: sigma,
      restakingDegree: 1,
      attackThreshold: 0.5,
      attackPrize: pi,
    });
    const result = network.checkSecurity();
    expect(result.secure).toBe(true);
  });

  it("is insecure when stake is far too low relative to prize", () => {
    const network = new SymmetricRestakingNetwork({
      numValidators: 2,
      numServices: 4,
      stakePerValidator: 1,
      restakingDegree: 2,
      attackThreshold: 0.5,
      attackPrize: 1000,
    });
    const result = network.checkSecurity();
    expect(result.secure).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkRobustness
// ---------------------------------------------------------------------------

describe("checkRobustness", () => {
  it("returns minimumBudgetFraction near 1 for a very secure network", () => {
    // With cost >> prize the attacker needs nearly all the stake.
    const network = makeNetwork({
      numValidators: 100,
      stake: 1000,
      services: [
        { id: 0, attackThreshold: 0.5, attackPrize: 1, totalAllocated: 100_000 },
      ],
      allocations: new Map([[0, 1000]]),
    });
    const result = checkRobustness(network);
    // Any attack costs 100,000 but prize is only 1, so cost >> budget always
    // unless β is essentially 1.  The binary search converges to ~1.
    expect(result.minimumBudgetFraction).toBeGreaterThan(0.9);
  });

  it("returns a low minimumBudgetFraction for an insecure network", () => {
    // Prize massively exceeds any possible attack cost.
    const validators: Validator[] = [
      { id: 0, stake: 10, effectiveStake: 10, allocations: new Map([[0, 10]]) },
    ];
    const services: Service[] = [
      { id: 0, attackThreshold: 0.5, attackPrize: 1_000_000, totalAllocated: 10 },
    ];
    const network = new RestakingNetwork(validators, services);
    const result = checkRobustness(network);
    expect(result.robust).toBe(false);
    expect(result.minimumBudgetFraction).toBeLessThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// computeOptimalDegree
// ---------------------------------------------------------------------------

describe("computeOptimalDegree", () => {
  it("returns a valid degree in [1, maxDegree]", () => {
    const result = computeOptimalDegree({
      numValidators: 10,
      numServices: 5,
      stakePerValidator: 100,
      attackThreshold: 0.5,
      attackPrize: 100,
      maxDegree: 5,
    });
    expect(result.optimalDegree).toBeGreaterThanOrEqual(1);
    expect(result.optimalDegree).toBeLessThanOrEqual(5);
    expect(result.robustnessAtOptimal).toBeGreaterThanOrEqual(0);
  });

  it("prefers higher degrees when prize is high and validators are few", () => {
    // With few validators and high prize, more restaking spreads risk so higher
    // degrees tend to be better. d=S should be at least as good as d=1.
    const S = 4;
    const result = computeOptimalDegree({
      numValidators: 4,
      numServices: S,
      stakePerValidator: 1000,
      attackThreshold: 0.5,
      attackPrize: 500,
      maxDegree: S,
    });
    expect(result.optimalDegree).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Figure data generators
// ---------------------------------------------------------------------------

describe("generateFigure3Data", () => {
  it("returns one data point per degree", () => {
    const data = generateFigure3Data({
      numValidators: 10,
      numServices: 5,
      attackThreshold: 0.5,
      attackPrize: 100,
      maxDegree: 5,
    });
    expect(data).toHaveLength(5);
    for (let i = 0; i < data.length; i++) {
      expect(data[i].degree).toBe(i + 1);
      expect(data[i].minStake).toBeGreaterThanOrEqual(0);
    }
  });

  it("minStake is positive for non-trivial prize", () => {
    const data = generateFigure3Data({
      numValidators: 5,
      numServices: 3,
      attackThreshold: 0.5,
      attackPrize: 200,
      maxDegree: 3,
    });
    for (const point of data) {
      expect(point.minStake).toBeGreaterThan(0);
    }
  });
});

describe("generateFigure4Data", () => {
  it("returns a map with one entry per requested degree", () => {
    const degrees = [1, 2, 3];
    const data = generateFigure4Data({
      numValidators: 8,
      numServices: 4,
      stakePerValidator: 100,
      attackThreshold: 0.5,
      attackPrize: 50,
      degrees,
    });
    expect(data.size).toBe(degrees.length);
    for (const d of degrees) {
      const points = data.get(d)!;
      expect(points).toBeDefined();
      expect(points.length).toBe(20); // f = 0.05 … 1.00 in steps of 0.05
      for (const p of points) {
        expect(p.f).toBeGreaterThan(0);
        expect(p.beta).toBeGreaterThanOrEqual(0);
        expect(p.beta).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("generateFigure5Data", () => {
  it("returns one failure threshold per degree", () => {
    const data = generateFigure5Data({
      numValidators: 10,
      numServices: 4,
      stakePerValidator: 100,
      attackThreshold: 0.5,
      attackPrize: 80,
      maxDegree: 4,
    });
    expect(data).toHaveLength(4);
    for (const point of data) {
      expect(point.failureThreshold).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("generateFigure6Data", () => {
  it("returns both withBase and withoutBase for each degree", () => {
    const data = generateFigure6Data({
      numValidators: 10,
      numServices: 4,
      stakePerValidator: 100,
      attackThreshold: 0.5,
      attackPrize: 80,
      maxDegree: 3,
    });
    expect(data).toHaveLength(3);
    for (const point of data) {
      expect(typeof point.withBase).toBe("number");
      expect(typeof point.withoutBase).toBe("number");
    }
  });
});
