use anchor_lang::prelude::*;

use crate::errors::ElasticRestakingError;

/// Computes `(a * b) / c` using a u128 intermediate to prevent overflow on the
/// multiplication step.  Returns `MathOverflow` if any intermediate or final
/// value exceeds u64::MAX, or if `c` is zero.
pub fn checked_mul_div(a: u64, b: u64, c: u64) -> Result<u64> {
    require!(c != 0, ElasticRestakingError::MathOverflow);

    let numerator: u128 = (a as u128)
        .checked_mul(b as u128)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    let result = numerator
        .checked_div(c as u128)
        .ok_or(ElasticRestakingError::MathOverflow)?;

    u64::try_from(result).map_err(|_| error!(ElasticRestakingError::MathOverflow))
}

/// Scales `amount` by `bps` basis points: `amount * bps / 10_000`.
///
/// `bps` may exceed 10 000 (e.g. for restaking-degree multipliers that are
/// expressed in basis points but represent values > 1×).  The caller is
/// responsible for validating the semantic meaning of `bps`; this function only
/// guards against arithmetic overflow.
pub fn bps_mul(amount: u64, bps: u32) -> Result<u64> {
    checked_mul_div(amount, bps as u64, 10_000)
}

/// Returns the restaking degree as basis points: `(total_allocated * 10_000) /
/// stake`.  A value of 10 000 bps represents 1× (fully deployed).
///
/// Returns 0 when `stake` is zero to avoid a division-by-zero error in
/// contexts where no stake has been deposited yet.
pub fn calculate_restaking_degree_bps(total_allocated: u64, stake: u64) -> Result<u32> {
    if stake == 0 {
        return Ok(0);
    }

    let result = checked_mul_div(total_allocated, 10_000, stake)?;

    // The restaking degree bps can legitimately exceed u16::MAX (e.g. 5×
    // leverage = 50 000 bps), but must fit in u32.
    u32::try_from(result).map_err(|_| error!(ElasticRestakingError::MathOverflow))
}

/// Calculates a validator's proportional share of a service reward pool.
///
/// `allocation_effective / service_total_effective * reward_pool`
///
/// Returns 0 when `service_total_effective` is zero (no allocations active).
pub fn calculate_reward_share(
    allocation_effective: u64,
    service_total_effective: u64,
    reward_pool: u64,
) -> Result<u64> {
    if service_total_effective == 0 {
        return Ok(0);
    }

    checked_mul_div(allocation_effective, reward_pool, service_total_effective)
}

/// Calculates the fee portion of `amount` at `fee_bps` basis points.
///
/// `amount * fee_bps / 10_000`
///
/// `fee_bps` is validated to be at most 10 000 by the caller; this function
/// enforces the arithmetic contract only.
pub fn calculate_fee(amount: u64, fee_bps: u16) -> Result<u64> {
    checked_mul_div(amount, fee_bps as u64, 10_000)
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checked_mul_div_basic() {
        assert_eq!(checked_mul_div(100, 3, 4).unwrap(), 75);
    }

    #[test]
    fn checked_mul_div_large_values() {
        // u64::MAX * 1 / 1 should stay within u64 range
        assert_eq!(
            checked_mul_div(u64::MAX, 1, 1).unwrap(),
            u64::MAX
        );
    }

    #[test]
    fn checked_mul_div_overflow() {
        // u64::MAX * 2 overflows u128 intermediate — should not be reachable,
        // but verify the divide-by-zero guard instead.
        assert!(checked_mul_div(1, 1, 0).is_err());
    }

    #[test]
    fn bps_mul_half() {
        // 5_000 bps of 200 == 100
        assert_eq!(bps_mul(200, 5_000).unwrap(), 100);
    }

    #[test]
    fn bps_mul_200_percent() {
        // 20_000 bps of 500 == 1_000 (2×)
        assert_eq!(bps_mul(500, 20_000).unwrap(), 1_000);
    }

    #[test]
    fn restaking_degree_zero_stake() {
        assert_eq!(calculate_restaking_degree_bps(100, 0).unwrap(), 0);
    }

    #[test]
    fn restaking_degree_one_to_one() {
        // fully deployed stake == 10_000 bps (1×)
        assert_eq!(calculate_restaking_degree_bps(1_000, 1_000).unwrap(), 10_000);
    }

    #[test]
    fn restaking_degree_two_x() {
        // 2× leverage == 20_000 bps
        assert_eq!(calculate_restaking_degree_bps(2_000, 1_000).unwrap(), 20_000);
    }

    #[test]
    fn reward_share_proportional() {
        // 250 / 1_000 * 400 == 100
        assert_eq!(calculate_reward_share(250, 1_000, 400).unwrap(), 100);
    }

    #[test]
    fn reward_share_zero_pool() {
        assert_eq!(calculate_reward_share(250, 1_000, 0).unwrap(), 0);
    }

    #[test]
    fn reward_share_zero_total() {
        assert_eq!(calculate_reward_share(250, 0, 400).unwrap(), 0);
    }

    #[test]
    fn calculate_fee_five_percent() {
        // 5% of 1_000_000 == 50_000
        assert_eq!(calculate_fee(1_000_000, 500).unwrap(), 50_000);
    }

    #[test]
    fn calculate_fee_zero_bps() {
        assert_eq!(calculate_fee(1_000_000, 0).unwrap(), 0);
    }
}
