use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::domain::entities::user::UserClaims;
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
    Extension(claims): Extension<UserClaims>,
    Json(request): Json<CreateCategoryAttributeTemplateRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if claims.role_level > 2 {
        return Err(AppError::Forbidden(
            "Hanya Super Admin (L1) dan Manager (L2) yang dapat mengelola template kategori"
                .to_string(),
        ));
    }
    let template = state.category_template_service.upsert(request).await?;
    Ok(Json(serde_json::json!(template)))
}

/// Delete template
pub async fn delete_category_template(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(category_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    if claims.role_level > 2 {
        return Err(AppError::Forbidden(
            "Hanya Super Admin (L1) dan Manager (L2) yang dapat mengelola template kategori"
                .to_string(),
        ));
    }
    state.category_template_service.delete(category_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
