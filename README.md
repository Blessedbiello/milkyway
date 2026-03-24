# Elastic Restaking Protocol

> First implementation of **Elastic Restaking Networks** on Solana — based on Bar-Zur & Eyal (ACM CCS '25).

Validators over-allocate stake across multiple services at restaking degree > 1. When a Byzantine service is slashed, surviving allocations degrade gracefully via elastic mechanics rather than cascading to zero. The protocol enforces a provably optimal restaking degree d* through Theorem 2's reward mechanism, maximizing network security while preserving base-chain synergy.

**Live on Devnet:** [`2R3H4JZieWZtvvpXvfoNtDC9vxMmiRVvbS618LwexhW7`](https://explorer.solana.com/address/2R3H4JZieWZtvvpXvfoNtDC9vxMmiRVvbS618LwexhW7?cluster=devnet)

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [On-Chain Program](#on-chain-program)
- [Security Analyzer](#security-analyzer)
- [SDK](#sdk)
- [Frontend Dashboard](#frontend-dashboard)
- [Development](#development)
- [Protocol Parameters](#protocol-parameters)
- [Comparison to Ethereum Restaking](#comparison-to-ethereum-restaking)
- [References](#references)

---

## How It Works

### Elastic Over-Allocation

Unlike traditional restaking where each unit of stake backs exactly one service, elastic restaking allows validators to commit more total stake than they physically hold. Each individual allocation is capped at `effective_stake`, but the sum can exceed it up to `max_restaking_degree`.

```
Validator deposits: 100 tokens
  → Allocates 100 to Oracle Network
  → Allocates 100 to Bridge Protocol
  → Allocates 100 to DEX Sequencer
Total allocated: 300 tokens (degree = 3.0x)
```

This works because correlated failures across all three services simultaneously is unlikely — the elastic model prices this correlation explicitly.

### Elastic Slashing (Equations 11–12)

When a service is slashed, the validator's `effective_stake` is reduced by the allocation's `effective_amount`. Surviving allocations then "stretch" — their effective contribution is recalculated as `min(nominal_amount, new_effective_stake)`:

```
Before slash:
  effective_stake = 100
  Oracle:  alloc = 80, effective = min(80, 100) = 80
  Bridge:  alloc = 80, effective = min(80, 100) = 80

After Oracle slashed:
  effective_stake = 100 - 80 = 20
  Bridge:  alloc = 80, effective = min(80, 20) = 20  ← graceful degradation
```

The validator's total loss is bounded by their original deposit — they cannot lose more than they staked, regardless of restaking degree.

### Theorem 2: Optimal Degree Incentive

Validators with `restaking_degree > target_degree` receive **zero rewards**. This creates a Nash equilibrium at the optimal degree d* that maximizes network-wide security. The protocol's analyzer computes d* for any given network configuration.

### Three-Phase Slash Governance

Inspired by EigenLayer's ELIP-002:

1. **Propose** — Authority submits a slash proposal against a service
2. **Dispute** — Window opens for authority to veto (configurable duration)
3. **Finalize** — Permissionless execution after the dispute window elapses

---

## Architecture

```
elastic-restaking/
├── programs/elastic_restaking/     Anchor program — 20 instructions, 8 account types
│   └── src/
│       ├── instructions/           Instruction handlers (admin, validator, service, allocation, slashing, epoch)
│       ├── state/                  Account struct definitions with INIT_SPACE constants
│       ├── errors.rs               23 custom error codes
│       ├── events.rs               13 event types
│       ├── math.rs                 Safe arithmetic (checked_mul_div, bps_mul, reward shares)
│       └── constants.rs            Protocol defaults and limits
│
├── packages/
│   ├── sdk/                        @elastic-restaking/sdk — TypeScript client library
│   │   └── src/
│   │       ├── client.ts           ElasticRestakingClient (all instructions + queries)
│   │       ├── pdas.ts             PDA derivation helpers
│   │       ├── types.ts            TypeScript mirrors of on-chain state
│   │       └── constants.ts        Program ID, seeds, limits
│   │
│   └── analyzer/                   @elastic-restaking/analyzer — security analysis engine
│       └── src/
│           ├── network-model.ts    RestakingNetwork with elastic slashing simulation
│           ├── symmetric-network.ts Closed-form analysis for symmetric networks
│           ├── security-check.ts   Brute-force 2^S subset enumeration
│           ├── robustness.ts       (f,β)-robustness analysis
│           ├── optimal-degree.ts   d* computation and figure data generators
│           └── __tests__/          23 unit tests
│
├── apps/web/                       Next.js 14 dashboard with Tailwind dark theme
│   ├── app/                        App Router — 6 pages (dashboard, stake, services, network, analyzer, admin)
│   ├── hooks/                      useElasticRestaking, useNetworkConfig, useServices
│   ├── components/                 Navbar, StatsCard, DegreeGauge, Card, Button
│   └── lib/analyzer/               Client-side analyzer integration
│
├── tests/                          40+ Anchor integration tests (full lifecycle coverage)
├── scripts/                        deploy.ts, seed-devnet.ts
└── deployment.json                 Devnet deployment manifest
```

### Data Flow

```
                  ┌──────────────┐
  Validators ───► │  Anchor      │ ◄─── Service Operators
  (deposit,       │  Program     │      (register, fund)
   allocate)      │              │
                  └──────┬───────┘
                         │ on-chain state
                  ┌──────┴───────┐
                  │  SDK Client  │ ◄─── Scripts (deploy, seed)
                  └──────┬───────┘
                         │ queries + txns
           ┌─────────────┼─────────────┐
           │             │             │
    ┌──────┴──────┐ ┌────┴────┐ ┌─────┴─────┐
    │  Dashboard  │ │ Network │ │ Analyzer  │
    │  (stats,    │ │ Graph   │ │ (d*, fig  │
    │   staking)  │ │ (D3)    │ │  3-6)     │
    └─────────────┘ └─────────┘ └───────────┘
```

---

## On-Chain Program

**Program ID:** `2R3H4JZieWZtvvpXvfoNtDC9vxMmiRVvbS618LwexhW7`

### Instructions

| Category | Instruction | Description |
|----------|------------|-------------|
| **Admin** | `initialize_network` | Bootstrap protocol with stake/reward mints and treasury |
| | `update_network_config` | Modify mutable parameters (degree caps, fees, delays) |
| | `propose_authority` | Initiate two-step authority transfer |
| | `accept_authority` | Complete authority transfer |
| **Service** | `register_service` | Register service with attack threshold and prize |
| | `update_service` | Modify metadata, threshold, prize |
| | `deactivate_service` | Disable new allocations |
| | `fund_rewards` | Deposit reward tokens into service vault |
| **Validator** | `deposit_stake` | Deposit tokens and register as validator |
| | `request_withdrawal` | Create withdrawal ticket with cooldown |
| | `complete_withdrawal` | Claim tokens after cooldown elapses |
| | `claim_rewards` | Collect accumulated rewards |
| **Allocation** | `allocate_stake` | Commit stake to a service (respects degree cap) |
| | `deallocate_stake` | Begin deallocation (delay before inactive) |
| **Slashing** | `propose_slash` | Submit slash proposal against a service |
| | `veto_slash` | Cancel proposal during dispute window |
| | `finalize_slash` | Execute slash after dispute window (permissionless) |
| | `rebalance_allocations` | Recalculate effective amounts post-slash (elastic stretch) |
| **Epoch** | `advance_epoch` | Increment epoch counter (permissionless crank) |
| | `distribute_rewards` | Distribute validator's share from service pool |

### Account Model

| Account | PDA Seeds | Size | Description |
|---------|-----------|------|-------------|
| `NetworkConfig` | `["network_config"]` | 422 B | Singleton protocol state, owns stake vault |
| `ServiceState` | `["service", service_id]` | 516 B | Service registration, reward pool, slash status |
| `ValidatorState` | `["validator", authority]` | 250 B | Stake balances, allocation tracking, rewards |
| `AllocationState` | `["allocation", authority, service_id]` | 174 B | Per-(validator, service) commitment with lifecycle |
| `WithdrawalTicket` | `["withdrawal", authority, ticket_id]` | 102 B | Staged withdrawal with cooldown |
| `SlashProposal` | `["slash_proposal", proposal_id]` | 131 B | Slash proposal with dispute window |
| `SlashRecord` | `["slash_record", proposal_id]` | 149 B | Immutable audit trail of executed slash |
| `StakeVault` | `["stake_vault"]` | — | SPL token account, authority = NetworkConfig PDA |
| `RewardVault` | `["reward_vault", service_id]` | — | Per-service SPL reward token account |

### Allocation Lifecycle

```
   allocate_stake         epoch delay elapsed       deallocate_stake        epoch delay elapsed
┌──────────────► Pending ──────────────────► Active ──────────────────► Deactivating ──────────► Inactive
```

### Security Invariants

1. **Per-service cap:** `allocation.amount <= validator.effective_stake`
2. **Degree cap:** `total_allocated <= effective_stake * max_degree / 10_000`
3. **Stretch invariant:** `effective_amount = min(amount, effective_stake)` post-slash
4. **Withdrawal safety:** Remaining stake must cover all allocations at max degree
5. **Base service immunity:** Base services cannot be slashed
6. **Two-step authority:** Transfer requires `propose` + `accept` by the new authority
7. **Safe arithmetic:** All operations use `checked_*` with u128 intermediates via `checked_mul_div`

### Events

The program emits 13 typed events for off-chain indexing: `NetworkInitialized`, `NetworkConfigUpdated`, `AuthorityTransferProposed`, `AuthorityTransferAccepted`, `ServiceRegistered`, `ServiceUpdated`, `ServiceDeactivated`, `ServiceFunded`, `StakeDeposited`, `WithdrawalRequested`, `WithdrawalCompleted`, `StakeAllocated`, `StakeDeallocated`, `SlashProposed`, `SlashVetoed`, `SlashFinalized`, `EpochAdvanced`, `RewardsDistributed`, `RewardsClaimed`.

---

## Security Analyzer

TypeScript port of the paper's reference Python implementation. Two computation models:

### General Model (`RestakingNetwork`)

Brute-force simulation of elastic slashing across all 2^S service subsets. For each subset of potentially Byzantine services, computes:

- Sequential slash execution with per-validator effective stake degradation
- Total attack cost vs. total attack prize
- Network security: whether `cost > prize` for all subsets

Suitable for networks with S <= 20 services.

### Symmetric Model (`SymmetricRestakingNetwork`)

Closed-form O(S^2) analysis for networks where all validators have equal stake and all services have equal parameters. Uses the hypergeometric probability `C(S-k, d) / C(S, d)` to compute the fraction of validators affected by a k-service attack without enumeration.

### Analysis Functions

| Function | Purpose |
|----------|---------|
| `checkNetworkSecurity()` | Identify all vulnerable service subsets |
| `checkRobustness()` | Binary search for minimum adversary budget to break security |
| `computeOptimalDegree()` | Find d* that maximizes robustness |
| `generateFigure3Data()` | Min-stake vs. restaking degree (paper Fig. 3) |
| `generateFigure5Data()` | Failure thresholds with elastic slashing (paper Fig. 5) |
| `generateFigure6Data()` | Base service synergy effects (paper Fig. 6) |

### Running Analyzer Tests

```bash
cd packages/analyzer && pnpm test
# 23 tests: network invariants, elastic slashing, symmetric computation,
#           security checks, robustness analysis, optimal degree
```

---

## SDK

`@elastic-restaking/sdk` provides a typed TypeScript client wrapping all program instructions.

### Usage

```typescript
import { ElasticRestakingClient } from "@elastic-restaking/sdk";

const client = new ElasticRestakingClient(provider);

// Deposit stake
await client.depositStake(amount, depositorTokenAccount);

// Allocate to a service
await client.allocateStake(serviceId, amount);

// Query validator state
const validator = await client.fetchValidator(walletPubkey);
console.log(`Degree: ${validator.totalAllocated / validator.effectiveStake}x`);

// Query all allocations for a validator (memcmp filtered)
const allocations = await client.fetchValidatorAllocations(walletPubkey);
```

### Query Methods

| Method | Returns | Filter |
|--------|---------|--------|
| `fetchNetworkConfig()` | `NetworkConfig` | Singleton PDA |
| `fetchService(id)` | `ServiceState` | By service ID |
| `fetchValidator(authority)` | `ValidatorState` | By wallet pubkey |
| `fetchAllocation(authority, serviceId)` | `AllocationState` | By (wallet, service) pair |
| `fetchAllServices()` | `ServiceState[]` | All program accounts |
| `fetchAllValidators()` | `ValidatorState[]` | All program accounts |
| `fetchValidatorAllocations(authority)` | `AllocationState[]` | `memcmp` on validator field |
| `fetchServiceAllocations(serviceId)` | `AllocationState[]` | `memcmp` on service_id field |
| `fetchActiveSlashProposals()` | `SlashProposal[]` | Non-finalized, non-vetoed |

---

## Frontend Dashboard

Next.js 14 App Router with Tailwind CSS dark theme, Framer Motion animations, and Recharts visualizations.

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/` | Protocol overview — TVL, epoch, service count, validator count, quick actions |
| **Staking** | `/stake` | Deposit/withdraw, manage allocations, degree gauge, reward history |
| **Services** | `/services` | Service registry, registration form, attack parameters, validator counts |
| **Network Graph** | `/network` | Force-directed D3 visualization with interactive slash simulation |
| **Analyzer** | `/analyzer` | Parameter sliders, real-time security analysis, paper figure reproductions |
| **Admin** | `/admin` | Config management, slash governance, authority transfer |

### Wallet Integration

Supports all Solana wallets via `@solana/wallet-adapter-react`. Auto-connect enabled. TanStack Query for state management with 30s stale time.

---

## Development

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Rust | stable | Anchor program compilation |
| Solana CLI | v2.0+ | Cluster management, keypair generation |
| Anchor CLI | v0.32.1 | Build, test, deploy |
| Node.js | 18+ | TypeScript packages and web app |
| pnpm | 10+ | Workspace package management |

### Quick Start

```bash
# Install dependencies
pnpm install

# Build the Anchor program
anchor build

# Run all integration tests (40+ tests)
anchor test

# Run analyzer unit tests
cd packages/analyzer && pnpm test

# Start all dev servers (web app + SDK + analyzer in watch mode)
pnpm dev
# Web app at http://localhost:3000
```

### Deploy to Devnet

```bash
# 1. Deploy program
anchor deploy --provider.cluster devnet

# 2. Initialize network (creates mints, config, vault)
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
npx tsx scripts/deploy.ts

# 3. Seed demo data (4 services, validator with allocations)
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
npx tsx scripts/seed-devnet.ts
```

### Seed Data

The `seed-devnet.ts` script creates a representative network:

| Service | Base | Attack Threshold | Attack Prize |
|---------|------|-----------------|--------------|
| Oracle Network | Yes | 50% | 1,000,000 |
| Bridge Protocol | No | 60% | 2,000,000 |
| DEX Sequencer | No | 50% | 1,500,000 |
| Data Availability | No | 40% | 800,000 |

Plus a validator with 100M staked tokens allocated across multiple services at varying degrees.

### Project Scripts

```bash
pnpm dev            # Start all dev servers (turbo)
pnpm build          # Build all packages (turbo)
pnpm test           # Run all tests (turbo)
pnpm test:program   # Run Anchor integration tests only
pnpm lint           # Lint all packages
```

---

## Protocol Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `target_restaking_degree_bps` | 20,000 (2.0x) | Optimal degree — validators above this earn zero rewards |
| `max_restaking_degree_bps` | 50,000 (5.0x) | Hard cap on restaking degree |
| `epoch_duration` | 3,600s (1 hour) | Minimum time between epoch advances |
| `withdrawal_cooldown_epochs` | 2 | Epochs before withdrawal is claimable |
| `allocation_delay_epochs` | 1 | Epochs before allocation becomes active |
| `deallocation_delay_epochs` | 1 | Epochs before deallocation completes |
| `slash_dispute_window` | 3,600s (1 hour) | Time for authority to veto a slash proposal |
| `min_stake_amount` | 1,000,000 (1 token) | Minimum deposit (6 decimal places) |
| `deposit_fee_bps` | 0 (0%) | Fee on deposits, retained in vault |
| `reward_commission_bps` | 500 (5%) | Protocol commission on distributed rewards |
| `max_services` | 256 | Maximum registered services |
| `max_validators` | 10,000 | Maximum registered validators |

All parameters are updatable by the network authority via `update_network_config`.

---

## Comparison to Ethereum Restaking

| Aspect | EigenLayer | Symbiotic | Elastic Restaking (this) |
|--------|-----------|-----------|--------------------------|
| **Chain** | Ethereum | Ethereum | Solana |
| **Restaked asset** | ETH / LSTs via EigenPods | ERC-20 collateral in vaults | SPL token (configurable mint) |
| **Operator model** | Stakers delegate to operators | Stakers deposit to vaults | Validators = operators (combined) |
| **Allocation model** | 1-to-1 per delegation | Vault backs multiple networks | Elastic over-allocation (degree > 1) |
| **Slashing** | Operator-level via slashers | Vault-level via resolvers | Service-level with elastic degradation |
| **Dispute mechanism** | Instant execution | Per-resolver dispute | Global dispute window + veto |
| **Reward incentive** | Market-driven | Market-driven | Theorem 2: zero rewards above d* |
| **Security analysis** | No formal tool | No formal tool | Built-in analyzer (paper Figures 3–6) |

**Key differentiator:** Elastic slashing. When a validator has degree 3x and one service is slashed, EigenLayer/Symbiotic would slash proportionally across all services or use fixed per-service caps. Elastic restaking instead reduces `effective_stake` and lets surviving allocations stretch — the validator's total loss is bounded by their deposit, and surviving services maintain proportional security guarantees.

---

## References

- Bar-Zur, R. & Eyal, I. **"Elastic Restaking Networks."** ACM CCS '25. [[paper]](https://arxiv.org/abs/2503.01001)
- Chitra, T. et al. **"Sybil-proofness of Staking Mechanisms."** arXiv:2509.18338.
- EigenLayer. **ELIP-002: Slashable Magnitude Allocation.**
- Jito Restaking. **vault_program + restaking_program architecture.**

---

## License

MIT
