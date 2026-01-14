//! Phone Value Object

use serde::{Deserialize, Serialize};
use std::fmt;

/// Phone value object
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Phone(String);

impl Phone {
    /// Create a new phone with normalization
    pub fn new(phone: &str) -> Result<Self, PhoneError> {
        // Remove all non-digits except +
        let normalized: String = phone
            .chars()
            .filter(|c| c.is_ascii_digit() || *c == '+')
            .collect();

        if normalized.is_empty() {
            return Err(PhoneError::Empty);
        }

        if normalized.len() < 8 {
            return Err(PhoneError::TooShort);
        }

        if normalized.len() > 15 {
            return Err(PhoneError::TooLong);
        }

        Ok(Self(normalized))
    }

    /// Create without validation (for database reads)
    pub fn from_trusted(phone: String) -> Self {
        Self(phone)
    }

    /// Get the inner string
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Format for display
    pub fn format(&self) -> String {
        // Simple formatting for Indonesian numbers
        if self.0.starts_with("+62") || self.0.starts_with("62") {
            let num = self.0.trim_start_matches('+').trim_start_matches("62");
            format!("+62 {}", num)
        } else if self.0.starts_with('0') {
            self.0.clone()
        } else {
            self.0.clone()
        }
    }
}

impl fmt::Display for Phone {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.format())
    }
}

/// Phone validation errors
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PhoneError {
    Empty,
    TooShort,
    TooLong,
}

impl fmt::Display for PhoneError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "Phone cannot be empty"),
            Self::TooShort => write!(f, "Phone number is too short"),
            Self::TooLong => write!(f, "Phone number is too long"),
        }
    }
}

impl std::error::Error for PhoneError {}
