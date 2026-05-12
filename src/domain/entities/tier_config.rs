//! Tier Configuration for Tiered Pricing
//!
//! Defines tiered pricing structures where different rate multipliers
//! apply based on usage ranges (e.g., normal rate for first 8 hours,
//! overtime rate for hours 8-10, double time for 10+)

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

/// Configuration for tiered pricing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierConfig {
    /// Type of tier: "hourly", "daily", "monthly"
    #[serde(rename = "type")]
    pub tier_type: String,

    /// List of price tiers
    pub tiers: Vec<Tier>,
}

/// Individual pricing tier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tier {
    /// Starting value for this tier (inclusive)
    pub from: Decimal,

    /// Ending value for this tier (exclusive). None means infinity
    pub to: Option<Decimal>,

    /// Rate multiplier for this tier (e.g., 1.0 for normal, 1.5 for overtime)
    pub multiplier: Decimal,
}

impl TierConfig {
    /// Calculate total cost using tiered rates
    ///
    /// # Arguments
    /// * `units` - Total units (hours, days, etc.) to calculate
    /// * `base_rate` - Base rate per unit before multiplier
    ///
    /// # Returns
    /// Total cost after applying all tier multipliers
    ///
    /// # Example
    /// ```
    /// // 12 hours with 8h normal, 4h overtime (1.5x)
    /// // Rate: 500,000/hour
    /// // Result: (8 × 500k × 1.0) + (4 × 500k × 1.5) = 7,000,000
    /// ```
    pub fn calculate(&self, units: Decimal, base_rate: Decimal) -> Decimal {
        let mut total = Decimal::ZERO;
        let mut remaining = units;

        for tier in &self.tiers {
            if remaining <= Decimal::ZERO {
                break;
            }

            // Calculate how many units fall in this tier
            let tier_size = if let Some(to) = tier.to {
                // Tier has upper bound
                let tier_capacity = to - tier.from;
                tier_capacity.min(remaining)
            } else {
                // Last tier with no upper bound (infinity)
                remaining
            };

            // Skip if tier_size is invalid
            if tier_size <= Decimal::ZERO {
                continue;
            }

            // Calculate cost for this tier
            let tier_cost = tier_size * base_rate * tier.multiplier;
            total += tier_cost;

            // Reduce remaining units
            remaining -= tier_size;
        }

        total
    }

    /// Get breakdown of cost by tier for display purposes
    ///
    /// Returns vector of (hours_in_tier, multiplier, cost) tuples
    pub fn calculate_breakdown(&self, units: Decimal, base_rate: Decimal) -> Vec<TierBreakdown> {
        let mut breakdown = Vec::new();
        let mut remaining = units;

        for tier in &self.tiers {
            if remaining <= Decimal::ZERO {
                break;
            }

            let tier_size = if let Some(to) = tier.to {
                let tier_capacity = to - tier.from;
                tier_capacity.min(remaining)
            } else {
                remaining
            };

            if tier_size <= Decimal::ZERO {
                continue;
            }

            let tier_cost = tier_size * base_rate * tier.multiplier;

            breakdown.push(TierBreakdown {
                units: tier_size,
                multiplier: tier.multiplier,
                cost: tier_cost,
                from: tier.from,
                to: tier.to,
            });

            remaining -= tier_size;
        }

        breakdown
    }
}

/// Breakdown of a single tier calculation for display
#[derive(Debug, Clone, Serialize)]
pub struct TierBreakdown {
    pub units: Decimal,
    pub multiplier: Decimal,
    pub cost: Decimal,
    pub from: Decimal,
    pub to: Option<Decimal>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_simple_two_tier() {
        let config = TierConfig {
            tier_type: "hourly".to_string(),
            tiers: vec![
                Tier {
                    from: dec!(0),
                    to: Some(dec!(8)),
                    multiplier: dec!(1.0),
                },
                Tier {
                    from: dec!(8),
                    to: None,
                    multiplier: dec!(1.5),
                },
            ],
        };

        // 12 hours @ 500,000/hour
        // = (8 × 500k × 1.0) + (4 × 500k × 1.5)
        // = 4,000,000 + 3,000,000
        // = 7,000,000
        let total = config.calculate(dec!(12), dec!(500000));
        assert_eq!(total, dec!(7000000));
    }

    #[test]
    fn test_three_tier() {
        let config = TierConfig {
            tier_type: "hourly".to_string(),
            tiers: vec![
                Tier {
                    from: dec!(0),
                    to: Some(dec!(8)),
                    multiplier: dec!(1.0),
                },
                Tier {
                    from: dec!(8),
                    to: Some(dec!(10)),
                    multiplier: dec!(1.5),
                },
                Tier {
                    from: dec!(10),
                    to: None,
                    multiplier: dec!(2.0),
                },
            ],
        };

        // 15 hours @ 100,000/hour
        // = (8 × 100k × 1.0) + (2 × 100k × 1.5) + (5 × 100k × 2.0)
        // = 800k + 300k + 1,000k
        // = 2,100,000
        let total = config.calculate(dec!(15), dec!(100000));
        assert_eq!(total, dec!(2100000));
    }

    #[test]
    fn test_exact_tier_boundary() {
        let config = TierConfig {
            tier_type: "hourly".to_string(),
            tiers: vec![
                Tier {
                    from: dec!(0),
                    to: Some(dec!(8)),
                    multiplier: dec!(1.0),
                },
                Tier {
                    from: dec!(8),
                    to: None,
                    multiplier: dec!(1.5),
                },
            ],
        };

        // Exactly 8 hours (no overtime)
        let total = config.calculate(dec!(8), dec!(500000));
        assert_eq!(total, dec!(4000000));
    }

    #[test]
    fn test_breakdown() {
        let config = TierConfig {
            tier_type: "hourly".to_string(),
            tiers: vec![
                Tier {
                    from: dec!(0),
                    to: Some(dec!(8)),
                    multiplier: dec!(1.0),
                },
                Tier {
                    from: dec!(8),
                    to: None,
                    multiplier: dec!(1.5),
                },
            ],
        };

        let breakdown = config.calculate_breakdown(dec!(12), dec!(500000));

        assert_eq!(breakdown.len(), 2);
        assert_eq!(breakdown[0].units, dec!(8));
        assert_eq!(breakdown[0].multiplier, dec!(1.0));
        assert_eq!(breakdown[0].cost, dec!(4000000));

        assert_eq!(breakdown[1].units, dec!(4));
        assert_eq!(breakdown[1].multiplier, dec!(1.5));
        assert_eq!(breakdown[1].cost, dec!(3000000));
    }
}
