//! Money Value Object
//!
//! Represents monetary values with currency.

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

/// Money value object with currency
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Money {
    pub amount: Decimal,
    pub currency: String,
}

impl Money {
    /// Create a new money value
    pub fn new(amount: Decimal, currency: &str) -> Self {
        Self {
            amount,
            currency: currency.to_uppercase(),
        }
    }

    /// Create money in IDR
    pub fn idr(amount: Decimal) -> Self {
        Self::new(amount, "IDR")
    }

    /// Create money in USD
    pub fn usd(amount: Decimal) -> Self {
        Self::new(amount, "USD")
    }

    /// Add two money values (must be same currency)
    pub fn add(&self, other: &Money) -> Result<Money, &'static str> {
        if self.currency != other.currency {
            return Err("Cannot add money with different currencies");
        }
        Ok(Money::new(self.amount + other.amount, &self.currency))
    }

    /// Subtract money (must be same currency)
    pub fn subtract(&self, other: &Money) -> Result<Money, &'static str> {
        if self.currency != other.currency {
            return Err("Cannot subtract money with different currencies");
        }
        Ok(Money::new(self.amount - other.amount, &self.currency))
    }

    /// Multiply by a factor
    pub fn multiply(&self, factor: Decimal) -> Money {
        Money::new(self.amount * factor, &self.currency)
    }

    /// Check if zero
    pub fn is_zero(&self) -> bool {
        self.amount == Decimal::ZERO
    }

    /// Check if positive
    pub fn is_positive(&self) -> bool {
        self.amount > Decimal::ZERO
    }

    /// Format for display
    pub fn format(&self) -> String {
        match self.currency.as_str() {
            "IDR" => format!("Rp {}", self.amount),
            "USD" => format!("${}", self.amount),
            "EUR" => format!("€{}", self.amount),
            _ => format!("{} {}", self.currency, self.amount),
        }
    }
}

impl Default for Money {
    fn default() -> Self {
        Self::idr(Decimal::ZERO)
    }
}
