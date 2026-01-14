//! RBAC Handler

use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::ApiResponse;
use crate::domain::entities::{Permission, Role};
use crate::shared::errors::AppError;

pub async fn list_roles(State(state): State<AppState>) -> Result<Json<Vec<Role>>, AppError> {
    let roles = state.rbac_service.list_roles().await?;
    Ok(Json(roles))
}

pub async fn list_permissions(
    State(state): State<AppState>,
) -> Result<Json<Vec<Permission>>, AppError> {
    let permissions = state.rbac_service.list_permissions().await?;
    Ok(Json(permissions))
}

pub async fn get_role_permissions(
    State(state): State<AppState>,
    Path(role_id): Path<Uuid>,
) -> Result<Json<Vec<Permission>>, AppError> {
    let permissions = state.rbac_service.get_role_permissions(role_id).await?;
    Ok(Json(permissions))
}

pub async fn get_user_roles(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<Vec<Role>>, AppError> {
    let roles = state.rbac_service.get_user_roles(user_id).await?;
    Ok(Json(roles))
}

pub async fn get_user_permissions(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<Vec<Permission>>, AppError> {
    let permissions = state.rbac_service.get_user_permissions(user_id).await?;
    Ok(Json(permissions))
}

pub async fn assign_role(
    State(state): State<AppState>,
    Path((user_id, role_code)): Path<(Uuid, String)>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    state
        .rbac_service
        .assign_role(user_id, &role_code, None, None)
        .await?;
    Ok(Json(ApiResponse::success_with_message((), "Role assigned")))
}

pub async fn remove_role(
    State(state): State<AppState>,
    Path((user_id, role_code)): Path<(Uuid, String)>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    state.rbac_service.remove_role(user_id, &role_code).await?;
    Ok(Json(ApiResponse::success_with_message((), "Role removed")))
}
