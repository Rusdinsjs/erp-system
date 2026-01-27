use axum::{extract::State, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    api::{responses::ApiResponse, AppState},
    domain::entities::maintenance::{CreateMaintenanceScheduleRequest, MaintenanceSchedule},
    shared::errors::AppError,
};

#[derive(Deserialize)]
pub struct ListSchedulesParams {
    pub asset_id: Option<Uuid>,
}

pub async fn list_schedules(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<MaintenanceSchedule>>>, AppError> {
    let schedules = state.maintenance_service.list_schedules_raw().await?;
    Ok(Json(ApiResponse::success(schedules)))
}

pub async fn create_schedule(
    State(state): State<AppState>,
    Json(payload): Json<CreateMaintenanceScheduleRequest>,
) -> Result<Json<ApiResponse<MaintenanceSchedule>>, AppError> {
    let schedule = state.maintenance_service.create_schedule(payload).await?;
    Ok(Json(ApiResponse::success(schedule)))
}

pub async fn run_schedule(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    axum::extract::Extension(claims): axum::extract::Extension<
        crate::domain::entities::user::UserClaims,
    >,
) -> Result<Json<ApiResponse<crate::domain::entities::MaintenanceRecord>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID in token".to_string()))?;

    let record = state
        .maintenance_service
        .run_schedule_now(id, user_id)
        .await?;
    Ok(Json(ApiResponse::success(record)))
}
