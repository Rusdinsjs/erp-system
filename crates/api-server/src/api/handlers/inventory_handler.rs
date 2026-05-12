use crate::api::server::AppState;
use management_system_core::application::dto::{
    ApiResponse, CreateInventoryCategoryRequest, CreateInventoryItemRequest,
    InventoryAdjustmentRequest, UpdateInventoryCategoryRequest, UpdateInventoryItemRequest,
};
use management_system_core::domain::entities::UserClaims as Claims;
use management_system_core::shared::errors::AppError;
use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

pub async fn create_inventory_category(
    State(state): State<AppState>,
    Json(payload): Json<CreateInventoryCategoryRequest>,
) -> Result<Json<ApiResponse<management_system_core::domain::entities::inventory::InventoryCategory>>, AppError> {
    let category = state.inventory_service.create_category(payload).await?;
    Ok(Json(ApiResponse::success(category)))
}

pub async fn list_inventory_categories(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<management_system_core::domain::entities::inventory::InventoryCategory>>>, AppError>
{
    let categories = state.inventory_service.list_categories().await?;
    Ok(Json(ApiResponse::success(categories)))
}

pub async fn get_inventory_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<management_system_core::domain::entities::inventory::InventoryCategory>>, AppError> {
    let category = state.inventory_service.get_category(id).await?.ok_or(
        AppError::NotFound(format!("Category with id {} not found", id)),
    )?;
    Ok(Json(ApiResponse::success(category)))
}

pub async fn update_inventory_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateInventoryCategoryRequest>,
) -> Result<Json<ApiResponse<management_system_core::domain::entities::inventory::InventoryCategory>>, AppError> {
    let category = state.inventory_service.update_category(id, payload).await?;
    Ok(Json(ApiResponse::success(category)))
}

pub async fn delete_inventory_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    let success = state.inventory_service.delete_category(id).await?;
    Ok(Json(ApiResponse::success(success)))
}

pub async fn create_item(
    State(state): State<AppState>,
    Json(payload): Json<CreateInventoryItemRequest>,
) -> Result<Json<ApiResponse<management_system_core::domain::entities::inventory::InventoryItem>>, AppError> {
    let item = state.inventory_service.create_item(payload).await?;
    Ok(Json(ApiResponse::success(item)))
}

pub async fn list_items(
    State(state): State<AppState>,
    Query(query): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<ApiResponse<Vec<management_system_core::domain::entities::inventory::InventoryItem>>>, AppError> {
    let category_id = query
        .get("category_id")
        .and_then(|id| Uuid::parse_str(id).ok());
    let search = query.get("search").cloned();
    let items = state.inventory_service.list_items(category_id, search).await?;
    Ok(Json(ApiResponse::success(items)))
}

pub async fn get_item(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<management_system_core::domain::entities::inventory::InventoryItem>>, AppError> {
    let item = state.inventory_service.get_item(id).await?.ok_or(
        AppError::NotFound(format!("Item with id {} not found", id)),
    )?;
    Ok(Json(ApiResponse::success(item)))
}

pub async fn update_item(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateInventoryItemRequest>,
) -> Result<Json<ApiResponse<management_system_core::domain::entities::inventory::InventoryItem>>, AppError> {
    let item = state.inventory_service.update_item(id, payload).await?;
    Ok(Json(ApiResponse::success(item)))
}

pub async fn delete_item(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    let success = state.inventory_service.delete_item(id).await?;
    Ok(Json(ApiResponse::success(success)))
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
    Json(payload): Json<management_system_core::application::dto::BatchInventoryAdjustmentRequest>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    let success = state
        .inventory_service
        .adjust_stock_batch(payload, Some(claims.user_id()))
        .await?;
    Ok(Json(ApiResponse::success(success)))
}

pub async fn list_movements_history(
    State(state): State<AppState>,
    Query(query): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<ApiResponse<Vec<management_system_core::domain::entities::inventory::InventoryMovement>>>, AppError> {
    let item_id = query
        .get("item_id")
        .and_then(|id| Uuid::parse_str(id).ok());
    let limit = query
        .get("limit")
        .and_then(|l| l.parse::<i64>().ok())
        .unwrap_or(50);
    
    let movements = state.inventory_service.list_movements(item_id, limit).await?;
    Ok(Json(ApiResponse::success(movements)))
}
