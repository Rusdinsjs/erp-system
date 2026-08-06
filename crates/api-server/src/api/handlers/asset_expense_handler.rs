use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::application::dto::asset_expense_dto::{AssetExpenseResponse, CreateAssetExpenseRequest};
use management_system_core::domain::entities::UserClaims as Claims;
use management_system_core::shared::errors::AppError;

/// Create a new asset expense
#[utoipa::path(
    post,
    path = "/api/assets/{id}/expenses",
    request_body = CreateAssetExpenseRequest,
    responses(
        (status = 201, description = "Asset expense created successfully", body = AssetExpenseResponse),
        (status = 400, description = "Bad Request"),
        (status = 500, description = "Internal Server Error")
    ),
    security(
        ("jwt" = [])
    )
)]
pub async fn create_asset_expense(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateAssetExpenseRequest>,
) -> Result<(StatusCode, Json<AssetExpenseResponse>), AppError> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;

    let expense = state
        .asset_expense_service
        .create(id, payload, user_id)
        .await?;

    Ok((StatusCode::CREATED, Json(expense)))
}

/// List expenses for an asset
#[utoipa::path(
    get,
    path = "/api/assets/{id}/expenses",
    responses(
        (status = 200, description = "List of asset expenses", body = Vec<AssetExpenseResponse>),
        (status = 404, description = "Asset not found"),
        (status = 500, description = "Internal Server Error")
    ),
    security(
        ("jwt" = [])
    )
)]
pub async fn list_asset_expenses(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<AssetExpenseResponse>>, AppError> {
    let expenses = state.asset_expense_service.find_by_asset(id).await?;

    Ok(Json(expenses))
}

#[derive(serde::Deserialize)]
pub struct ApprovalActionRequest {
    pub notes: Option<String>,
}

/// Approve an expense
#[utoipa::path(
    post,
    path = "/api/expenses/{id}/approve",
    request_body = ApprovalActionRequest,
    responses(
        (status = 200, description = "Expense approved successfully", body = AssetExpenseResponse),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Expense or Request not found"),
        (status = 500, description = "Internal Server Error")
    ),
    security(
        ("jwt" = [])
    )
)]
pub async fn approve_expense(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApprovalActionRequest>,
) -> Result<Json<AssetExpenseResponse>, AppError> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;

    let role_code = claims.role.clone();

    let expense = state
        .asset_expense_service
        .approve_expense(id, user_id, role_code, payload.notes)
        .await?;

    Ok(Json(expense))
}

/// Reject an expense
#[utoipa::path(
    post,
    path = "/api/expenses/{id}/reject",
    request_body = ApprovalActionRequest,
    responses(
        (status = 200, description = "Expense rejected successfully", body = AssetExpenseResponse),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Expense or Request not found"),
        (status = 500, description = "Internal Server Error")
    ),
    security(
        ("jwt" = [])
    )
)]
pub async fn reject_expense(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApprovalActionRequest>,
) -> Result<Json<AssetExpenseResponse>, AppError> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;

    let notes = payload.notes.unwrap_or_else(|| "Rejected".to_string());

    let expense = state
        .asset_expense_service
        .reject_expense(id, user_id, &claims.role, notes)
        .await?;

    Ok(Json(expense))
}
