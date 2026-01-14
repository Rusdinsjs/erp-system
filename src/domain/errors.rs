//! Domain Errors
//!
//! Domain-specific error types.

use std::fmt;

/// Domain error types
#[derive(Debug, Clone)]
pub enum DomainError {
    /// Entity not found
    NotFound { entity: String, id: String },

    /// Validation error
    ValidationError { field: String, message: String },

    /// Business rule violation
    BusinessRuleViolation { rule: String, message: String },

    /// Invalid state transition
    InvalidStateTransition { from: String, to: String },

    /// Unauthorized operation
    Unauthorized { action: String },

    /// Conflict (duplicate, etc.)
    Conflict { message: String },

    /// External service error
    ExternalServiceError { service: String, message: String },

    /// Bad request
    BadRequest { message: String },

    /// Internal error
    Internal { message: String },

    /// Database error
    Database(String),
}

impl DomainError {
    pub fn not_found(entity: &str, id: impl ToString) -> Self {
        Self::NotFound {
            entity: entity.to_string(),
            id: id.to_string(),
        }
    }

    pub fn validation(field: &str, message: &str) -> Self {
        Self::ValidationError {
            field: field.to_string(),
            message: message.to_string(),
        }
    }

    pub fn business_rule(rule: &str, message: &str) -> Self {
        Self::BusinessRuleViolation {
            rule: rule.to_string(),
            message: message.to_string(),
        }
    }

    pub fn invalid_transition(from: &str, to: &str) -> Self {
        Self::InvalidStateTransition {
            from: from.to_string(),
            to: to.to_string(),
        }
    }

    pub fn unauthorized(action: &str) -> Self {
        Self::Unauthorized {
            action: action.to_string(),
        }
    }

    pub fn conflict(message: &str) -> Self {
        Self::Conflict {
            message: message.to_string(),
        }
    }

    pub fn bad_request(message: &str) -> Self {
        Self::BadRequest {
            message: message.to_string(),
        }
    }

    pub fn internal(message: impl ToString) -> Self {
        Self::Internal {
            message: message.to_string(),
        }
    }
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFound { entity, id } => {
                write!(f, "{} with id '{}' not found", entity, id)
            }
            Self::ValidationError { field, message } => {
                write!(f, "Validation error on field '{}': {}", field, message)
            }
            Self::BusinessRuleViolation { rule, message } => {
                write!(f, "Business rule '{}' violated: {}", rule, message)
            }
            Self::InvalidStateTransition { from, to } => {
                write!(f, "Invalid state transition from '{}' to '{}'", from, to)
            }
            Self::Unauthorized { action } => {
                write!(f, "Unauthorized to perform action: {}", action)
            }
            Self::Conflict { message } => {
                write!(f, "Conflict: {}", message)
            }
            Self::ExternalServiceError { service, message } => {
                write!(f, "External service '{}' error: {}", service, message)
            }
            Self::BadRequest { message } => {
                write!(f, "Bad request: {}", message)
            }
            Self::Internal { message } => {
                write!(f, "Internal error: {}", message)
            }
            Self::Database(message) => {
                write!(f, "Database error: {}", message)
            }
        }
    }
}

impl std::error::Error for DomainError {}

/// Result type alias for domain operations
pub type DomainResult<T> = Result<T, DomainError>;
