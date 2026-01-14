//! Mobile API Handlers
//!
//! Handlers optimized for mobile application usage.

use axum::{
    extract::{Path, State},
    response::{IntoResponse, Response},
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::UpdateAssetRequest;
use crate::domain::entities::{Loan, UserClaims};
use crate::domain::errors::DomainError;
use crate::shared::errors::AppError;

/// Get asset by code (QR Scan)
pub async fn scan_asset(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Response, AppError> {
    // Try to find by code first via service
    if let Ok(asset) = state.asset_service.get_by_code(&code).await {
        return Ok(Json(asset).into_response());
    }

    // If matches UUID format, try get_by_id
    if let Ok(id) = Uuid::parse_str(&code) {
        if let Ok(asset) = state.asset_service.get_by_id(id).await {
            return Ok(Json(asset).into_response());
        }
    }

    Err(AppError::Domain(DomainError::not_found("Asset", code)))
}

/// My Loans Response
#[derive(Serialize)]
pub struct MyLoansResponse {
    active: Vec<Loan>,
    history: Vec<Loan>,
}

/// Get my loans
pub async fn my_loans(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
) -> Result<Response, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;
    let loans = state.loan_service.list_by_user(user_id).await?;

    // Split into active and history
    let (active, history): (Vec<Loan>, Vec<Loan>) = loans.into_iter().partition(|l| {
        l.status == "requested"
            || l.status == "approved"
            || l.status == "checked_out"
            || l.status == "in_use"
            || l.status == "overdue"
    });

    Ok(Json(MyLoansResponse { active, history }).into_response())
}

/// Audit Request
#[derive(Deserialize)]
pub struct AuditRequest {
    pub asset_id: Uuid,
    pub condition_id: Option<i32>,
    pub location_id: Option<Uuid>,
    pub notes: Option<String>,
}

/// Submit Audit
pub async fn audit_asset(
    State(state): State<AppState>,
    Extension(_claims): Extension<UserClaims>,
    Json(payload): Json<AuditRequest>,
) -> Result<Response, AppError> {
    // Reuse AssetService::update to update condition/location
    let update_req = UpdateAssetRequest {
        condition_id: payload.condition_id,
        location_id: payload.location_id,
        notes: payload.notes,
        ..Default::default()
    };

    let asset = state
        .asset_service
        .update(payload.asset_id, update_req)
        .await?;

    Ok(Json(asset).into_response())
}
