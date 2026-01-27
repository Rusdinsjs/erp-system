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
