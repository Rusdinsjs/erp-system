//! Application Error Types

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

use crate::domain::errors::DomainError;

/// Application error
#[derive(Debug)]
pub enum AppError {
    Domain(DomainError),
    Database(String),
    Unauthorized(String),
    Forbidden(String),
    BadRequest(String),
    Internal(String),
}

impl From<DomainError> for AppError {
    fn from(err: DomainError) -> Self {
        Self::Domain(err)
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        Self::Database(err.to_string())
    }
}

impl From<uuid::Error> for AppError {
    fn from(err: uuid::Error) -> Self {
        Self::BadRequest(format!("Invalid UUID: {}", err))
    }
}

#[derive(Serialize)]
struct ErrorResponse {
    success: bool,
    error: String,
    code: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            Self::Domain(DomainError::NotFound { entity, id }) => (
                StatusCode::NOT_FOUND,
                "NOT_FOUND",
                format!("{} with id '{}' not found", entity, id),
            ),
            Self::Domain(DomainError::ValidationError { field, message }) => (
                StatusCode::BAD_REQUEST,
                "VALIDATION_ERROR",
                format!("{}: {}", field, message),
            ),
            Self::Domain(DomainError::BusinessRuleViolation { rule, message }) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "BUSINESS_RULE_VIOLATION",
                format!("{}: {}", rule, message),
            ),
            Self::Domain(DomainError::InvalidStateTransition { from, to }) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "INVALID_STATE_TRANSITION",
                format!("Cannot transition from '{}' to '{}'", from, to),
            ),
            Self::Domain(DomainError::Unauthorized { action }) => {
                if action == "Invalid credentials" || action == "Account is disabled" {
                    (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", action)
                } else {
                    (
                        StatusCode::FORBIDDEN,
                        "UNAUTHORIZED",
                        format!("Not authorized to: {}", action),
                    )
                }
            }
            Self::Domain(DomainError::Conflict { message }) => {
                (StatusCode::CONFLICT, "CONFLICT", message)
            }
            Self::Domain(DomainError::BadRequest { message }) => {
                (StatusCode::BAD_REQUEST, "BAD_REQUEST", message)
            }
            Self::Domain(DomainError::ExternalServiceError { service, message }) => (
                StatusCode::SERVICE_UNAVAILABLE,
                "SERVICE_ERROR",
                format!("{}: {}", service, message),
            ),
            Self::Database(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "DATABASE_ERROR", msg),
            Self::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", msg),
            Self::Forbidden(msg) => (StatusCode::FORBIDDEN, "FORBIDDEN", msg),
            Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, "BAD_REQUEST", msg),
            Self::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", msg),
            Self::Domain(DomainError::Internal { message }) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", message)
            }
            Self::Domain(DomainError::Database(message)) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "DATABASE_ERROR", message)
            }
        };

        let body = Json(ErrorResponse {
            success: false,
            error: message,
            code: code.to_string(),
        });

        (status, body).into_response()
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

pub type AppResult<T> = Result<T, AppError>;
