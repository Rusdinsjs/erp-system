use axum::{extract::State, response::Json};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::api::server::AppState;
use crate::shared::errors::AppError;

#[derive(Deserialize)]
pub struct SendTestEmailRequest {
    pub email: String,
}

pub async fn send_test_email(
    State(state): State<AppState>,
    axum::Json(payload): axum::Json<SendTestEmailRequest>,
) -> Result<Json<Value>, AppError> {
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
