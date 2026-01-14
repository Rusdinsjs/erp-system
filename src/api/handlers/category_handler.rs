//! Category Handlers
//!
//! HTTP handlers for category operations.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{CreateCategoryRequest, UpdateCategoryRequest};
use crate::domain::entities::user::UserClaims;
use crate::shared::errors::AppError;
use axum::extract::Extension;

/// List all categories
pub async fn list_categories(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
) -> Result<Json<serde_json::Value>, AppError> {
    let department_filter = if claims.role == "super_admin" {
        None
    } else {
        claims.department.as_deref()
    };
    let categories = state.category_service.list_all(department_filter).await?;
    Ok(Json(serde_json::json!({ "data": categories })))
}

/// Get category tree structure
pub async fn get_category_tree(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
) -> Result<Json<serde_json::Value>, AppError> {
    let department_filter = if claims.role == "super_admin" {
        None
    } else {
        claims.department.as_deref()
    };
    let tree = state.category_service.get_tree(department_filter).await?;
    Ok(Json(serde_json::json!({ "data": tree })))
}

/// Get classification view (grouped by main category)
pub async fn get_classification(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
) -> Result<Json<serde_json::Value>, AppError> {
    let department_filter = if claims.role == "super_admin" {
        None
    } else {
        claims.department.as_deref()
    };
    let classification = state
        .category_service
        .get_classification(department_filter)
        .await?;
    Ok(Json(serde_json::json!({ "data": classification })))
}

/// Get single category by ID
pub async fn get_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let category = state.category_service.get_by_id(id).await?;
    Ok(Json(serde_json::json!(category)))
}

/// Create new category
pub async fn create_category(
    State(state): State<AppState>,
    Json(request): Json<CreateCategoryRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), AppError> {
    let category = state.category_service.create(request).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!(category))))
}

/// Update category
pub async fn update_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateCategoryRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let category = state.category_service.update(id, request).await?;
    Ok(Json(serde_json::json!(category)))
}

/// Delete category
pub async fn delete_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    state.category_service.delete(id).await?;
    Ok(StatusCode::NO_CONTENT)
}
