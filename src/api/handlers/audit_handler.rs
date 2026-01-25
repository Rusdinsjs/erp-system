use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{ApiResponse, AuditLogQuery, PaginatedResponse};
use crate::domain::entities::audit::AuditSession;
use crate::domain::entities::user::UserClaims;
use crate::domain::entities::AuditLogEntry;
use crate::shared::errors::AppError;
use axum::extract::Extension;

/// Start a new audit session
pub async fn start_audit_session(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let session = state.audit_service.start_session(user_id, None).await?;

    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            session,
            "Audit session started",
        )),
    ))
}

#[derive(serde::Serialize)]
pub struct AssetSessionWrapper {
    pub session: Option<AuditSession>,
}

/// Get the currently active audit session
pub async fn get_active_session(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<AssetSessionWrapper>>, AppError> {
    let session = state.audit_service.get_active_session().await?;

    Ok(Json(ApiResponse::success(AssetSessionWrapper { session })))
}

/// Close audit session
pub async fn close_session(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<AuditSession>>, AppError> {
    let session = state.audit_service.close_session(id).await?;
    Ok(Json(ApiResponse::success_with_message(
        session,
        "Audit session closed",
    )))
}

/// Submit an audit record (scan)
#[derive(serde::Deserialize)]
pub struct SubmitRecordRequest {
    pub asset_id: Uuid,
    pub status: String,
    pub notes: Option<String>,
}

pub async fn submit_audit_record(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<SubmitRecordRequest>,
) -> Result<Json<ApiResponse<crate::domain::entities::audit::AuditRecord>>, AppError> {
    let record = state
        .audit_service
        .submit_record(session_id, payload.asset_id, &payload.status, payload.notes)
        .await?;

    Ok(Json(ApiResponse::success_with_message(
        record,
        "Record submitted",
    )))
}

#[derive(serde::Serialize)]
pub struct AuditProgress {
    pub total: i64,
    pub audited: i64,
}

/// Get audit progress
pub async fn get_audit_progress(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<AuditProgress>>, AppError> {
    let (total, audited) = state.audit_service.get_progress(session_id).await?;

    Ok(Json(ApiResponse::success(AuditProgress { total, audited })))
}

/// Get system audit logs
#[utoipa::path(
    get,
    path = "/api/audit-logs",
    tag = "Audit",
    params(
        ("page" = Option<i64>, Query, description = "Page number"),
        ("per_page" = Option<i64>, Query, description = "Items per page"),
        ("entity_type" = Option<String>, Query, description = "Filter by entity type (table name)"),
        ("action" = Option<String>, Query, description = "Filter by action (CREATE, UPDATE, DELETE)"),
        ("user_id" = Option<Uuid>, Query, description = "Filter by user ID"),
        ("entity_id" = Option<Uuid>, Query, description = "Filter by entity/record ID")
    ),
    responses(
        (status = 200, description = "List of audit logs", body = PaginatedResponse<AuditLogEntry>)
    ),
    security(
        ("jwt_auth" = [])
    )
)]
pub async fn get_audit_logs(
    State(state): State<AppState>,
    Query(query): Query<AuditLogQuery>,
) -> Result<Json<PaginatedResponse<AuditLogEntry>>, AppError> {
    let logs = state.audit_service.get_system_logs(query).await?;
    Ok(Json(logs))
}
