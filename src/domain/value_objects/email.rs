//! Email Value Object

use serde::{Deserialize, Serialize};
use std::fmt;

/// Email value object with validation
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Email(String);

impl Email {
    /// Create a new email with validation
    pub fn new(email: &str) -> Result<Self, EmailError> {
        let email = email.trim().to_lowercase();

        if email.is_empty() {
            return Err(EmailError::Empty);
        }

        // Basic email validation
        if !email.contains('@') {
            return Err(EmailError::InvalidFormat);
        }

        let parts: Vec<&str> = email.split('@').collect();
        if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty() {
            return Err(EmailError::InvalidFormat);
        }

        if !parts[1].contains('.') {
            return Err(EmailError::InvalidFormat);
        }

        Ok(Self(email))
    }

    /// Create without validation (for database reads)
    pub fn from_trusted(email: String) -> Self {
        Self(email)
    }

    /// Get the inner string
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Get the domain part
    pub fn domain(&self) -> &str {
        self.0.split('@').nth(1).unwrap_or("")
    }
}

impl fmt::Display for Email {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<Email> for String {
    fn from(email: Email) -> Self {
        email.0
    }
}

/// Email validation errors
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EmailError {
    Empty,
    InvalidFormat,
}

impl fmt::Display for EmailError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "Email cannot be empty"),
            Self::InvalidFormat => write!(f, "Invalid email format"),
        }
    }
}

impl std::error::Error for EmailError {}
