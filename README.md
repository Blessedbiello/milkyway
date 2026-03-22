# Elastic Restaking Protocol

First production implementation of **Elastic Restaking Networks** (Bar-Zur & Eyal, ACM CCS '25) on Solana.

Validators over-allocate stake to multiple services (restaking degree > 1). When a Byzantine service is slashed, remaining allocations "stretch" via elastic mechanics rather than cascading to zero — proven superior robustness and base-chain synergy effects.

## Architecture

```
elastic-restaking/
├── programs/elastic_restaking/   # Anchor program (20 instructions)
├── packages/sdk/                 # @elastic-restaking/sdk (TypeScript client)
├── packages/analyzer/            # @elastic-restaking/analyzer (security analysis)
├── apps/web/                     # Next.js 14 dashboard
├── tests/                        # Integration tests (40 tests)
└── scripts/                      # Deploy & seed scripts
```

## Key Innovations

### Elastic Over-Allocation
Validators allocate **more total stake than they deposit** (degree > 1). Each individual allocation is capped at `effective_stake`, but the sum can exceed it up to `max_restaking_degree_bps`.

```
Validator: stake = 100
Allocations: Service A = 100, Service B = 100
Total allocated = 200 > 100 (degree = 2.0x)
```

### Elastic Slashing (Eq. 11-12)
When Service A is slashed:
```
effective_stake = 100 - 100 = 0 (if allocation = 100)
Service B effective_amount = min(100, 0) = 0 (stretching)
```

With partial allocation:
```
Validator: stake = 100, alloc A = 80, alloc B = 80
Slash A: effective_stake = 100 - 80 = 20
Service B effective = min(80, 20) = 20 (graceful degradation)
```

### Theorem 2 Reward Mechanism
Validators with `restaking_degree > target_degree` receive **zero rewards**, incentivizing the optimal degree d*.

### Slash Governance (Inspired by EigenLayer ELIP-002)
Three-phase flow: `propose_slash` → dispute window → `finalize_slash` (permissionless after window). Authority can `veto_slash` during the window.

## On-Chain Program

**Program ID:** `2R3H4JZieWZtvvpXvfoNtDC9vxMmiRVvbS618LwexhW7`

### Instructions (20)

| Category | Instructions |
|----------|-------------|
| Admin | `initialize_network`, `update_network_config`, `propose_authority`, `accept_authority` |
| Service | `register_service`, `update_service`, `deactivate_service`, `fund_rewards` |
| Validator | `deposit_stake`, `request_withdrawal`, `complete_withdrawal`, `claim_rewards` |
| Allocation | `allocate_stake`, `deallocate_stake` |
| Slashing | `propose_slash`, `veto_slash`, `finalize_slash`, `rebalance_allocations` |
| Epoch | `advance_epoch`, `distribute_rewards` |

### Account Structures

| Account | Seeds | Size |
|---------|-------|------|
| NetworkConfig | `["network_config"]` | 422 B |
| ServiceState | `["service", service_id]` | 516 B |
| ValidatorState | `["validator", authority]` | 250 B |
| AllocationState | `["allocation", authority, service_id]` | 174 B |
| WithdrawalTicket | `["withdrawal", authority, ticket_id]` | 102 B |
| SlashProposal | `["slash_proposal", proposal_id]` | 131 B |
| SlashRecord | `["slash_record", proposal_id]` | 149 B |

### Security Invariants

1. `allocation.amount <= validator.effective_stake` (per-service cap)
2. `validator.total_allocated <= effective_stake * max_degree / 10000` (degree cap)
3. `allocation.effective_amount <= min(amount, effective_stake)` (stretch invariant)
4. Withdrawal safety: remaining stake covers allocations at max degree
5. Base services cannot be slashed
6. Two-step authority transfer
7. All arithmetic via checked operations with u128 intermediates

## Security Analyzer

TypeScript port of the paper's reference Python implementation:

- **RestakingNetwork**: Full elastic slashing simulation
- **SymmetricRestakingNetwork**: Closed-form for symmetric case
- **checkSecurity**: Brute-force 2^S subset enumeration
- **checkRobustness**: Binary search for minimum adversary budget
- **computeOptimalDegree**: Find d* maximizing robustness
- **Figure generators**: Reproduce Figures 3-6 from the paper

## Frontend Dashboard

Next.js 14 App Router with Tailwind dark theme:

- **Dashboard**: Protocol stats, security status, quick actions
- **Network Graph**: Force-directed visualization with slash simulator
- **Services**: Registry table, registration, detail views
- **Validator Staking**: Deposit/withdraw, allocation management, degree gauge
- **Security Analyzer**: Interactive parameter sliders, figure reproductions
- **Admin**: Config updates, slash governance, authority transfer

## Development

### Prerequisites

- Rust + Solana CLI (v2.0+)
- Anchor CLI (v0.32.1)
- Node.js 18+ and pnpm

### Build & Test

```bash
# Install dependencies
pnpm install

# Build program
anchor build

# Run tests (40 tests)
anchor test

# Run analyzer tests (23 tests)
cd packages/analyzer && pnpm test

# Start frontend
cd apps/web && pnpm dev
```

### Deploy to Devnet

```bash
# Deploy program
anchor deploy --provider.cluster devnet

# Initialize network
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
npx tsx scripts/deploy.ts

# Seed demo data
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
npx tsx scripts/seed-devnet.ts
```

## References

- Bar-Zur, R. & Eyal, I. "Elastic Restaking Networks." ACM CCS '25.
- Chitra, T. et al. "Sybil-proofness of Staking Mechanisms." arXiv:2509.18338.
- EigenLayer ELIP-002: Slashable Magnitude Allocation.
- Jito Restaking: vault_program + restaking_program architecture.
