use crate::api::handlers::work_order_handler::{check_role, ROLE_SUPERVISOR};
use crate::api::responses::ApiResponse;
use crate::api::server::AppState;
use management_system_core::domain::entities::{
    MaintenanceTemplate, MaintenanceTemplateWithTasks, TemplateTask, UserClaims as Claims,
};
use management_system_core::shared::errors::AppError;
use axum::{
    extract::{Path, State},
    Extension, Json,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub asset_category_id: Option<Uuid>,
}

#[derive(Deserialize)]
pub struct AddTemplateTaskRequest {
    pub task_number: i32,
    pub description: String,
    pub instructions: Option<String>,
    pub expected_result: Option<String>,
}

#[derive(Deserialize)]
pub struct DuplicateTemplateRequest {
    pub new_name: String,
}

#[derive(Deserialize)]
pub struct ReorderTasksRequest {
    pub task_ids: Vec<Uuid>,
}

pub async fn list_maintenance_templates(
    State(state): State<AppState>,
) -> Result<Json<Vec<MaintenanceTemplate>>, AppError> {
    let templates = state.maintenance_template_service.list_templates().await?;
    Ok(Json(templates))
}

pub async fn get_maintenance_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<MaintenanceTemplateWithTasks>, AppError> {
    let template = state.maintenance_template_service.get_template(id).await?;
    Ok(Json(template))
}

pub async fn create_maintenance_template(
    State(state): State<AppState>,
    Extension(claims): axum::Extension<Claims>,
    Json(payload): Json<CreateTemplateRequest>,
) -> Result<Json<MaintenanceTemplate>, AppError> {
    check_role(&claims, ROLE_SUPERVISOR)?;

    let template = state
        .maintenance_template_service
        .create_template(payload.name, payload.description, payload.asset_category_id)
        .await?;
    Ok(Json(template))
}

pub async fn delete_maintenance_template(
    State(state): State<AppState>,
    Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    check_role(&claims, ROLE_SUPERVISOR)?;

    let success = state
        .maintenance_template_service
        .delete_template(id)
        .await?;
    Ok(Json(ApiResponse::success(success)))
}

pub async fn add_template_task(
    State(state): State<AppState>,
    Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<AddTemplateTaskRequest>,
) -> Result<Json<TemplateTask>, AppError> {
    check_role(&claims, ROLE_SUPERVISOR)?;

    let task = state
        .maintenance_template_service
        .add_task(
            id,
            payload.task_number,
            payload.description,
            payload.instructions,
            payload.expected_result,
        )
        .await?;
    Ok(Json(task))
}

pub async fn delete_template_task(
    State(state): State<AppState>,
    Extension(claims): axum::Extension<Claims>,
    Path((_id, task_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    check_role(&claims, ROLE_SUPERVISOR)?;

    let success = state
        .maintenance_template_service
        .delete_task(task_id)
        .await?;
    Ok(Json(ApiResponse::success(success)))
}

pub async fn duplicate_maintenance_template(
    State(state): State<AppState>,
    Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<DuplicateTemplateRequest>,
) -> Result<Json<MaintenanceTemplate>, AppError> {
    check_role(&claims, ROLE_SUPERVISOR)?;

    let template = state
        .maintenance_template_service
        .duplicate_template(id, payload.new_name)
        .await?;
    Ok(Json(template))
}

pub async fn reorder_template_tasks(
    State(state): State<AppState>,
    Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ReorderTasksRequest>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    check_role(&claims, ROLE_SUPERVISOR)?;

    state
        .maintenance_template_service
        .reorder_tasks(id, payload.task_ids)
        .await?;
    Ok(Json(ApiResponse::success(true)))
}

pub async fn get_maintenance_template_versions(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<MaintenanceTemplate>>, AppError> {
    let versions = state
        .maintenance_template_service
        .get_versions(id)
        .await?;
    Ok(Json(versions))
}

pub async fn apply_maintenance_template(
    State(state): State<AppState>,
    Extension(claims): axum::Extension<Claims>,
    Path((wo_id, template_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<usize>>, AppError> {
    check_role(&claims, ROLE_SUPERVISOR)?;

    let count = state
        .work_order_service
        .apply_template(wo_id, template_id)
        .await?;
    Ok(Json(ApiResponse::success_with_message(
        count,
        &format!("Applied {} tasks from template", count),
    )))
}
