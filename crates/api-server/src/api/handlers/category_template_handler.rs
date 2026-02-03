use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::domain::entities::CreateCategoryAttributeTemplateRequest;
use management_system_core::shared::errors::AppError;

/// List all category templates
pub async fn list_category_templates(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let templates = state.category_template_service.list_all().await?;
    Ok(Json(serde_json::json!({ "data": templates })))
}

/// Create or Update template for a category
pub async fn upsert_category_template(
    State(state): State<AppState>,
    Json(request): Json<CreateCategoryAttributeTemplateRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let template = state.category_template_service.upsert(request).await?;
    Ok(Json(serde_json::json!(template)))
}

/// Delete template
pub async fn delete_category_template(
    State(state): State<AppState>,
    Path(category_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    state.category_template_service.delete(category_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
