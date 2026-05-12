use crate::api::server::AppState;
use crate::domain::entities::{ApprovalWorkflow, UserClaims};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use uuid::Uuid;

pub async fn list_workflows(State(state): State<AppState>) -> impl IntoResponse {
    match state.approval_workflow_service.list_workflows().await {
        Ok(workflows) => Json(workflows).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn get_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state.approval_workflow_service.get_workflow(id).await {
        Ok(workflow) => Json(workflow).into_response(),
        Err(e) => (StatusCode::NOT_FOUND, e.to_string()).into_response(),
    }
}

pub async fn create_workflow(
    State(state): State<AppState>,
    Extension(_claims): Extension<UserClaims>,
    Json(payload): Json<ApprovalWorkflow>,
) -> impl IntoResponse {
    match state
        .approval_workflow_service
        .create_workflow(payload)
        .await
    {
        Ok(workflow) => (StatusCode::CREATED, Json(workflow)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn update_workflow(
    State(state): State<AppState>,
    Extension(_claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApprovalWorkflow>,
) -> impl IntoResponse {
    match state
        .approval_workflow_service
        .update_workflow(id, payload)
        .await
    {
        Ok(workflow) => Json(workflow).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn delete_workflow(
    State(state): State<AppState>,
    Extension(_claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state.approval_workflow_service.delete_workflow(id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
