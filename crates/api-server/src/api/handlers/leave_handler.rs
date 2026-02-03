use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::application::dto::{CreateLeaveRequest, RejectLeaveRequest};
use management_system_core::domain::entities::user::UserClaims;
use management_system_core::shared::errors::{AppError, AppResult};

pub async fn request_leave(
    State(state): State<AppState>,
    Extension(_claims): Extension<UserClaims>,
    Json(req): Json<CreateLeaveRequest>,
) -> AppResult<Json<management_system_core::domain::entities::LeaveRequest>> {
    let leave_req = state.leave_service.request_leave(req).await?;
    Ok(Json(leave_req))
}

pub async fn my_leaves(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
) -> AppResult<Json<Vec<management_system_core::domain::entities::LeaveRequest>>> {
    // Parse user_id from subject
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID in token".to_string()))?;

    let requests = state.leave_service.my_leaves(user_id).await?;
    Ok(Json(requests))
}

pub async fn pending_leaves(
    State(state): State<AppState>,
    Extension(_): Extension<UserClaims>,
) -> AppResult<Json<Vec<management_system_core::domain::entities::LeaveRequest>>> {
    let requests = state.leave_service.pending_leaves().await?;
    Ok(Json(requests))
}

pub async fn approve_leave(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<management_system_core::domain::entities::LeaveRequest>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID in token".to_string()))?;

    let req = state.leave_service.approve_leave(id, user_id).await?;
    Ok(Json(req))
}

pub async fn reject_leave(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RejectLeaveRequest>,
) -> AppResult<Json<management_system_core::domain::entities::LeaveRequest>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID in token".to_string()))?;

    let req = state
        .leave_service
        .reject_leave(id, user_id, payload)
        .await?;
    Ok(Json(req))
}
