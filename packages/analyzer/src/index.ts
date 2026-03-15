/**
 * @elastic-restaking/analyzer
 *
 * TypeScript port of the Python reference implementation for security analysis
 * from "Elastic Restaking Networks" — Bar-Zur & Eyal, ACM CCS '25.
 *
 * Public API surface:
 *   - RestakingNetwork          — general network model with elastic slashing
 *   - SymmetricRestakingNetwork — closed-form analysis for symmetric networks
 *   - checkNetworkSecurity      — brute-force security check (all 2^S subsets)
 *   - checkRobustness           — minimum adversary budget to break security
 *   - computeOptimalDegree      — find d* maximising robustness
 *   - generateFigure3Data       — min-stake vs degree (Figure 3)
 *   - generateFigure4Data       — (f, β)-robustness regions (Figure 4)
 *   - generateFigure5Data       — failure thresholds (Figure 5)
 *   - generateFigure6Data       — base service synergy (Figure 6)
 */

export type { Service, Validator, ByzantineResult } from "./network-model";
export { RestakingNetwork } from "./network-model";

export type { SymmetricParams, SymmetricSecurityResult } from "./symmetric-network";
export { SymmetricRestakingNetwork } from "./symmetric-network";

export type { SecurityResult } from "./security-check";
export { checkNetworkSecurity } from "./security-check";

export type { RobustnessResult } from "./robustness";
export { checkRobustness } from "./robustness";

export type {
  OptimalDegreeResult,
  Figure3Point,
  RobustnessPoint,
  Figure5Point,
  Figure6Point,
} from "./optimal-degree";
export {
  computeOptimalDegree,
  generateFigure3Data,
  generateFigure4Data,
  generateFigure5Data,
  generateFigure6Data,
} from "./optimal-degree";
