//! Attendance Handler
//!
//! HTTP handlers for attendance check-in/check-out operations.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::services::AttendanceService;
use crate::domain::entities::{
    AttendanceRecord, CheckInRequest, CheckOutRequest, TodayAttendanceStatus, UserClaims,
};
use crate::shared::errors::AppError;

/// Query params for attendance history
#[derive(Debug, Deserialize)]
pub struct AttendanceHistoryQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    30
}

/// Response wrapper
#[derive(Debug, Serialize)]
pub struct AttendanceResponse<T> {
    pub success: bool,
    pub data: T,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl<T> AttendanceResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data,
            message: None,
        }
    }

    pub fn with_message(data: T, message: &str) -> Self {
        Self {
            success: true,
            data,
            message: Some(message.to_string()),
        }
    }
}

/// Get today's attendance status for current user
pub async fn get_today_status(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
) -> Result<Json<AttendanceResponse<TodayAttendanceStatus>>, (StatusCode, Json<serde_json::Value>)>
{
    // Get employee_id from user
    let employee_id = get_employee_id_for_user(&state, claims.user_id()).await?;

    let status = AttendanceService::get_today_status(&state.pool, employee_id)
        .await
        .map_err(internal_error)?;

    Ok(Json(AttendanceResponse::success(status)))
}

/// Check in
pub async fn check_in(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(request): Json<CheckInRequest>,
) -> Result<Json<AttendanceResponse<AttendanceRecord>>, (StatusCode, Json<serde_json::Value>)> {
    let employee_id = get_employee_id_for_user(&state, claims.user_id()).await?;

    let record = AttendanceService::check_in(&state.pool, employee_id, request)
        .await
        .map_err(|e| match e {
            AppError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": msg })),
            ),
            _ => internal_error(e),
        })?;

    let message = match record.check_in_status.as_deref() {
        Some("late") => "Check-in berhasil (Terlambat)",
        _ => "Check-in berhasil",
    };

    Ok(Json(AttendanceResponse::with_message(record, message)))
}

/// Check out
pub async fn check_out(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(request): Json<CheckOutRequest>,
) -> Result<Json<AttendanceResponse<AttendanceRecord>>, (StatusCode, Json<serde_json::Value>)> {
    let employee_id = get_employee_id_for_user(&state, claims.user_id()).await?;

    let record = AttendanceService::check_out(&state.pool, employee_id, request)
        .await
        .map_err(|e| match e {
            AppError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": msg })),
            ),
            _ => internal_error(e),
        })?;

    Ok(Json(AttendanceResponse::with_message(
        record,
        "Check-out berhasil",
    )))
}

/// Get attendance history for current user
pub async fn get_my_history(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Query(query): Query<AttendanceHistoryQuery>,
) -> Result<Json<AttendanceResponse<Vec<AttendanceRecord>>>, (StatusCode, Json<serde_json::Value>)>
{
    let employee_id = get_employee_id_for_user(&state, claims.user_id()).await?;

    let records =
        AttendanceService::get_history(&state.pool, employee_id, query.limit, query.offset)
            .await
            .map_err(internal_error)?;

    Ok(Json(AttendanceResponse::success(records)))
}

/// Get all attendance today (admin)
pub async fn get_all_today(
    State(state): State<AppState>,
) -> Result<Json<AttendanceResponse<Vec<AttendanceRecord>>>, (StatusCode, Json<serde_json::Value>)>
{
    let records = AttendanceService::get_all_today(&state.pool)
        .await
        .map_err(internal_error)?;

    Ok(Json(AttendanceResponse::success(records)))
}

/// Get attendance history for specific employee (admin)
pub async fn get_employee_history(
    State(state): State<AppState>,
    Path(employee_id): Path<Uuid>,
    Query(query): Query<AttendanceHistoryQuery>,
) -> Result<Json<AttendanceResponse<Vec<AttendanceRecord>>>, (StatusCode, Json<serde_json::Value>)>
{
    let records =
        AttendanceService::get_history(&state.pool, employee_id, query.limit, query.offset)
            .await
            .map_err(internal_error)?;

    Ok(Json(AttendanceResponse::success(records)))
}

/// Scan face for attendance (Placeholder for now)
pub async fn scan_face(
    State(_state): State<AppState>,
    Json(_payload): Json<serde_json::Value>,
) -> Result<Json<AttendanceResponse<String>>, (StatusCode, Json<serde_json::Value>)> {
    // TODO: Implement actual face scanning logic
    Ok(Json(AttendanceResponse::success(
        "Face scan received".to_string(),
    )))
}

/// List attendance logs (Placeholder for now)
pub async fn list_logs(
    State(_state): State<AppState>,
) -> Result<Json<AttendanceResponse<Vec<AttendanceRecord>>>, (StatusCode, Json<serde_json::Value>)>
{
    // TODO: Implement listing logs
    Ok(Json(AttendanceResponse::success(vec![])))
}

// Helper functions

async fn get_employee_id_for_user(
    state: &AppState,
    user_id: Uuid,
) -> Result<Uuid, (StatusCode, Json<serde_json::Value>)> {
    let result = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM employees WHERE user_id = $1 AND is_active = true",
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| internal_error(AppError::Database(e.to_string())))?;

    result.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Employee record not found for this user" })),
        )
    })
}

fn internal_error<E: std::fmt::Display>(err: E) -> (StatusCode, Json<serde_json::Value>) {
    tracing::error!("Attendance error: {}", err);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({ "error": err.to_string() })),
    )
}
