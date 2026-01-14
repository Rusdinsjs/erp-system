//! User Handler

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{ApiResponse, CreateUserRequest, UpdateUserRequest};
use crate::domain::entities::{User, UserSummary};
use crate::shared::errors::AppError;

#[derive(Deserialize)]
pub struct ListUsersParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

pub async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<ListUsersParams>,
) -> Result<Json<ApiResponse<Vec<UserSummary>>>, AppError> {
    let limit = params.limit.unwrap_or(20);
    let offset = (params.page.unwrap_or(1) - 1) * limit;

    let users = state.user_service.list_users(limit, offset).await?;

    Ok(Json(ApiResponse::success(users)))
}

pub async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<ApiResponse<User>>, AppError> {
    let user = state.user_service.create_user(payload).await?;
    Ok(Json(ApiResponse::success(user)))
}

pub async fn update_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateUserRequest>,
) -> Result<Json<ApiResponse<User>>, AppError> {
    let user = state.user_service.update_user(id, payload).await?;
    Ok(Json(ApiResponse::success(user)))
}

pub async fn delete_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    state.user_service.delete_user(id).await?;
    Ok(Json(ApiResponse::success(())))
}
