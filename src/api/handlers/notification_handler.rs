//! Notification Handler

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Serialize;
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{ApiResponse, PaginationParams};
use crate::infrastructure::repositories::Notification;
use crate::shared::errors::AppError;

#[derive(Serialize)]
pub struct UnreadCount {
    count: i64,
}

pub async fn list_notifications(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<Notification>>, AppError> {
    let notifications = state
        .notification_service
        .list_by_user(user_id, params.page(), params.per_page())
        .await?;
    Ok(Json(notifications))
}

pub async fn list_unread_notifications(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<Vec<Notification>>, AppError> {
    let notifications = state.notification_service.list_unread(user_id).await?;
    Ok(Json(notifications))
}

pub async fn count_unread_notifications(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<UnreadCount>, AppError> {
    let count = state.notification_service.count_unread(user_id).await?;
    Ok(Json(UnreadCount { count }))
}

pub async fn mark_notification_as_read(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    state.notification_service.mark_as_read(id).await?;
    Ok(Json(ApiResponse::success_with_message(
        (),
        "Marked as read",
    )))
}

pub async fn mark_all_notifications_as_read(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<ApiResponse<i64>>, AppError> {
    let count = state.notification_service.mark_all_as_read(user_id).await?;
    Ok(Json(ApiResponse::success_with_message(
        count,
        &format!("Marked {} as read", count),
    )))
}
