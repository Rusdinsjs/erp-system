use crate::api::server::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use management_system_core::domain::entities::{
    ApprovalWorkflow, CreateEntityTypeRequest, UpdateEntityTypeRequest, UserClaims,
};
use uuid::Uuid;

pub async fn list_workflows(State(state): State<AppState>) -> impl IntoResponse {
    match state.approval_workflow_service.list_workflows().await {
        Ok(workflows) => Json(workflows).into_response(),
        Err(e) => e.into_response(),
    }
}

pub async fn get_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state.approval_workflow_service.get_workflow(id).await {
        Ok(workflow) => Json(workflow).into_response(),
        Err(e) => e.into_response(),
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
        Err(e) => e.into_response(),
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
        Err(e) => e.into_response(),
    }
}

pub async fn delete_workflow(
    State(state): State<AppState>,
    Extension(_claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state.approval_workflow_service.delete_workflow(id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => e.into_response(),
    }
}

// Entity Types Handlers

pub async fn list_entity_types(State(state): State<AppState>) -> impl IntoResponse {
    match state.approval_entity_type_service.get_entity_types().await {
        Ok(entity_types) => Json(entity_types).into_response(),
        Err(e) => e.into_response(),
    }
}

pub async fn create_entity_type(
    State(state): State<AppState>,
    Extension(_claims): Extension<UserClaims>,
    Json(payload): Json<CreateEntityTypeRequest>,
) -> impl IntoResponse {
    match state
        .approval_entity_type_service
        .create_entity_type(payload)
        .await
    {
        Ok(entity_type) => (StatusCode::CREATED, Json(entity_type)).into_response(),
        Err(e) => e.into_response(),
    }
}

pub async fn update_entity_type(
    State(state): State<AppState>,
    Extension(_claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateEntityTypeRequest>,
) -> impl IntoResponse {
    match state
        .approval_entity_type_service
        .update_entity_type(id, payload)
        .await
    {
        Ok(entity_type) => Json(entity_type).into_response(),
        Err(e) => e.into_response(),
    }
}

pub async fn delete_entity_type(
    State(state): State<AppState>,
    Extension(_claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state
        .approval_entity_type_service
        .delete_entity_type(id)
        .await
    {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => e.into_response(),
    }
}
