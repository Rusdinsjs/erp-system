//! Maintenance Team HTTP Handler

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use management_system_core::application::dto::{
    CreateMaintenanceTeamRequest, CreateTeamMemberRequest, MaintenanceTeamQuery, PaginatedResponse,
    UpdateMaintenanceTeamRequest,
};
use management_system_core::application::services::MaintenanceTeamService;
use management_system_core::domain::entities::{MaintenanceTeamDetail, MaintenanceTeamMember};
use uuid::Uuid;

use crate::api::AppState;

/// GET /api/v1/maintenance-teams
pub async fn list_teams(
    State(state): State<AppState>,
    Query(query): Query<MaintenanceTeamQuery>,
) -> Result<Json<PaginatedResponse<MaintenanceTeamDetail>>, (StatusCode, String)> {
    let repo = management_system_core::infrastructure::repositories::MaintenanceTeamRepository::new(state.pool.clone());
    let service = MaintenanceTeamService::new(repo);

    let result = service
        .list(query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(result))
}

/// GET /api/v1/maintenance-teams/:id
pub async fn get_team(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<MaintenanceTeamDetail>, (StatusCode, String)> {
    let repo = management_system_core::infrastructure::repositories::MaintenanceTeamRepository::new(state.pool.clone());
    let service = MaintenanceTeamService::new(repo);

    let result = service
        .get_by_id(id)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;

    Ok(Json(result))
}

/// POST /api/v1/maintenance-teams
pub async fn create_team(
    State(state): State<AppState>,
    Json(payload): Json<CreateMaintenanceTeamRequest>,
) -> Result<(StatusCode, Json<MaintenanceTeamDetail>), (StatusCode, String)> {
    let repo = management_system_core::infrastructure::repositories::MaintenanceTeamRepository::new(state.pool.clone());
    let service = MaintenanceTeamService::new(repo);

    let result = service
        .create(payload)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(result)))
}

/// PUT /api/v1/maintenance-teams/:id
pub async fn update_team(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateMaintenanceTeamRequest>,
) -> Result<Json<MaintenanceTeamDetail>, (StatusCode, String)> {
    let repo = management_system_core::infrastructure::repositories::MaintenanceTeamRepository::new(state.pool.clone());
    let service = MaintenanceTeamService::new(repo);

    let result = service
        .update(id, payload)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok(Json(result))
}

/// DELETE /api/v1/maintenance-teams/:id
pub async fn delete_team(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let repo = management_system_core::infrastructure::repositories::MaintenanceTeamRepository::new(state.pool.clone());
    let service = MaintenanceTeamService::new(repo);

    service
        .delete(id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/v1/maintenance-teams/:id/members
pub async fn add_team_member(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateTeamMemberRequest>,
) -> Result<(StatusCode, Json<MaintenanceTeamMember>), (StatusCode, String)> {
    let repo = management_system_core::infrastructure::repositories::MaintenanceTeamRepository::new(state.pool.clone());
    let service = MaintenanceTeamService::new(repo);

    let result = service
        .add_member(id, payload)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(result)))
}

/// DELETE /api/v1/maintenance-teams/:id/members/:member_id
pub async fn remove_team_member(
    State(state): State<AppState>,
    Path((_id, member_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, (StatusCode, String)> {
    let repo = management_system_core::infrastructure::repositories::MaintenanceTeamRepository::new(state.pool.clone());
    let service = MaintenanceTeamService::new(repo);

    service
        .remove_member(member_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}
