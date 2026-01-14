use axum::{
    extract::{Path, State},
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::domain::entities::{AuditRecord, AuditSession, UserClaims as Claims};
use crate::shared::errors::AppError;

#[derive(Deserialize)]
pub struct StartSessionRequest {
    notes: Option<String>,
}

#[derive(Deserialize)]
pub struct SubmitRecordRequest {
    asset_id: Uuid,
    status: String,
    notes: Option<String>,
}

#[derive(Serialize)]
pub struct AuditProgress {
    total: i64,
    audited: i64,
}

pub async fn start_audit_session(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<StartSessionRequest>,
) -> Result<Json<AuditSession>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;

    let session = state
        .audit_service
        .start_session(user_id, payload.notes)
        .await?;
    Ok(Json(session))
}

pub async fn get_active_session(
    State(state): State<AppState>,
) -> Result<Json<Option<AuditSession>>, AppError> {
    let session = state.audit_service.get_active_session().await?;
    Ok(Json(session))
}

pub async fn close_session(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<AuditSession>, AppError> {
    let session = state.audit_service.close_session(id).await?;
    Ok(Json(session))
}

pub async fn submit_audit_record(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<SubmitRecordRequest>,
) -> Result<Json<AuditRecord>, AppError> {
    let record = state
        .audit_service
        .submit_record(id, payload.asset_id, &payload.status, payload.notes)
        .await?;
    Ok(Json(record))
}

pub async fn get_audit_progress(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<AuditProgress>, AppError> {
    let (total, audited) = state.audit_service.get_progress(id).await?;
    Ok(Json(AuditProgress { total, audited }))
}
