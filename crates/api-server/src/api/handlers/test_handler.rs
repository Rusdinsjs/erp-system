use axum::{extract::State, response::Json, Extension};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::api::server::AppState;
use management_system_core::domain::entities::UserClaims;
use management_system_core::shared::errors::AppError;

#[derive(Deserialize)]
pub struct SendTestEmailRequest {
    pub email: String,
}

/// Send test email (QSEC-007: Development-gated operational endpoint)
pub async fn send_test_email(
    Extension(claims): Extension<UserClaims>,
    State(state): State<AppState>,
    axum::Json(payload): axum::Json<SendTestEmailRequest>,
) -> Result<Json<Value>, AppError> {
    // 1. Enforce super_admin / admin role check
    if claims.role != "super_admin" && claims.role != "admin" {
        return Err(AppError::Forbidden(
            "Access denied: only administrators can invoke diagnostic test endpoints".to_string(),
        ));
    }

    // 2. Strict environment check: disabled in production unless ALLOW_DEV_TEST_ROUTES=true
    let is_dev_allowed = std::env::var("ALLOW_DEV_TEST_ROUTES")
        .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
        .unwrap_or(cfg!(debug_assertions));

    if !is_dev_allowed {
        tracing::warn!(
            "Test email endpoint invocation blocked in production environment by user {}",
            claims.sub
        );
        return Err(AppError::Forbidden(
            "Diagnostic test endpoints are disabled in production environment".to_string(),
        ));
    }

    state
        .email_service
        .send_contract_activated_notification(&payload.email, "Test User", "TEST-001")
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(json!({
        "status": "success",
        "message": "Test email queued/sent"
    })))
}
