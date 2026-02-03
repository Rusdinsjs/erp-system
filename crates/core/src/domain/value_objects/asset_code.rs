//! Asset Code Value Object
//!
//! Validated asset code with formatting rules.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Asset code value object
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AssetCode(String);

impl AssetCode {
    /// Create a new asset code with validation
    pub fn new(code: &str) -> Result<Self, AssetCodeError> {
        let code = code.trim().to_uppercase();

        if code.is_empty() {
            return Err(AssetCodeError::Empty);
        }

        if code.len() < 3 {
            return Err(AssetCodeError::TooShort);
        }

        if code.len() > 50 {
            return Err(AssetCodeError::TooLong);
        }

        // Only allow alphanumeric and hyphens
        if !code
            .chars()
            .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
        {
            return Err(AssetCodeError::InvalidCharacters);
        }

        Ok(Self(code))
    }

    /// Create without validation (for database reads)
    pub fn from_trusted(code: String) -> Self {
        Self(code)
    }

    /// Get the inner string
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Generate a new asset code with prefix and sequence
    pub fn generate(prefix: &str, sequence: u64) -> Self {
        let code = format!("{}-{:06}", prefix.to_uppercase(), sequence);
        Self(code)
    }
}

impl fmt::Display for AssetCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<AssetCode> for String {
    fn from(code: AssetCode) -> Self {
        code.0
    }
}

/// Asset code validation errors
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AssetCodeError {
    Empty,
    TooShort,
    TooLong,
    InvalidCharacters,
}

impl fmt::Display for AssetCodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "Asset code cannot be empty"),
            Self::TooShort => write!(f, "Asset code must be at least 3 characters"),
            Self::TooLong => write!(f, "Asset code cannot exceed 50 characters"),
            Self::InvalidCharacters => write!(
                f,
                "Asset code can only contain alphanumeric characters, hyphens, and underscores"
            ),
        }
    }
}

impl std::error::Error for AssetCodeError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_asset_code() {
        assert!(AssetCode::new("ABC-001").is_ok());
        assert!(AssetCode::new("LAPTOP-2024-001").is_ok());
    }

    #[test]
    fn test_invalid_asset_code() {
        assert!(AssetCode::new("").is_err());
        assert!(AssetCode::new("AB").is_err());
        assert!(AssetCode::new("ABC@001").is_err());
    }

    #[test]
    fn test_generate_asset_code() {
        let code = AssetCode::generate("LAPTOP", 1);
        assert_eq!(code.as_str(), "LAPTOP-000001");
    }
}
