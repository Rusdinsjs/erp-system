use crate::api::server::AppState;
use crate::application::dto::{
    ApiResponse, CreateInventoryCategoryRequest, CreateInventoryItemRequest,
    InventoryAdjustmentRequest,
};
use crate::domain::entities::UserClaims as Claims;
use crate::shared::errors::AppError;
use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

pub async fn create_inventory_category(
    State(state): State<AppState>,
    Json(payload): Json<CreateInventoryCategoryRequest>,
) -> Result<Json<ApiResponse<crate::domain::entities::inventory::InventoryCategory>>, AppError> {
    let category = state.inventory_service.create_category(payload).await?;
    Ok(Json(ApiResponse::success(category)))
}

pub async fn list_inventory_categories(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<crate::domain::entities::inventory::InventoryCategory>>>, AppError>
{
    let categories = state.inventory_service.list_categories().await?;
    Ok(Json(ApiResponse::success(categories)))
}

pub async fn create_item(
    State(state): State<AppState>,
    Json(payload): Json<CreateInventoryItemRequest>,
) -> Result<Json<ApiResponse<crate::domain::entities::inventory::InventoryItem>>, AppError> {
    let item = state.inventory_service.create_item(payload).await?;
    Ok(Json(ApiResponse::success(item)))
}

pub async fn list_items(
    State(state): State<AppState>,
    Query(query): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<ApiResponse<Vec<crate::domain::entities::inventory::InventoryItem>>>, AppError> {
    let category_id = query
        .get("category_id")
        .and_then(|id| Uuid::parse_str(id).ok());
    let items = state.inventory_service.list_items(category_id).await?;
    Ok(Json(ApiResponse::success(items)))
}

pub async fn adjust_stock(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<InventoryAdjustmentRequest>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    let success = state
        .inventory_service
        .adjust_stock(id, payload, Some(claims.user_id()))
        .await?;
    Ok(Json(ApiResponse::success(success)))
}

pub async fn batch_adjust_stock(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<crate::application::dto::BatchInventoryAdjustmentRequest>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    let success = state
        .inventory_service
        .adjust_stock_batch(payload, Some(claims.user_id()))
        .await?;
    Ok(Json(ApiResponse::success(success)))
}
