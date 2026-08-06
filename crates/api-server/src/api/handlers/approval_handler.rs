use axum::{
    extract::{Path, State},
    Extension, Json,
};
use serde::Deserialize;
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::application::dto::ApiResponse;
use management_system_core::domain::entities::UserClaims;
use management_system_core::infrastructure::repositories::ApprovalRequest;
use management_system_core::shared::errors::AppError;

#[derive(Deserialize)]
pub struct DelegateRequestDto {
    pub delegated_to: Uuid,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateRequestDto {
    pub resource_type: String,
    pub resource_id: Uuid,
    pub action_type: String,
    pub data: Option<JsonValue>,
}

#[derive(Deserialize)]
pub struct ApproveRequestDto {
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct RejectRequestDto {
    pub notes: String,
}

pub async fn create_approval_request(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(payload): Json<CreateRequestDto>,
) -> Result<Json<ApiResponse<ApprovalRequest>>, AppError> {
    let requester_id = claims.user_id();

    let request = state
        .approval_service
        .create_request(
            &payload.resource_type,
            payload.resource_id,
            &payload.action_type,
            requester_id,
            payload.data,
        )
        .await?;

    Ok(Json(ApiResponse::success(request)))
}

pub async fn list_my_requests(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
) -> Result<Json<ApiResponse<Vec<ApprovalRequest>>>, AppError> {
    let requester_id = claims.user_id();
    let requests = state
        .approval_service
        .list_my_requests(requester_id)
        .await?;
    Ok(Json(ApiResponse::success(requests)))
}

pub async fn list_pending_requests(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
) -> Result<Json<ApiResponse<Vec<ApprovalRequest>>>, AppError> {
    let role_code = claims.role.clone();

    // Use unified approval service - all modules now flow through approval_requests table
    let requests = state.approval_service.list_pending(&role_code).await?;

    Ok(Json(ApiResponse::success(requests)))
}

pub async fn approve_request(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApproveRequestDto>,
) -> Result<Json<ApiResponse<ApprovalRequest>>, AppError> {
    let approver_id = claims.user_id();
    let role_code = claims.role.clone();

    // Use unified approval service - all modules now flow through approval_requests table
    let request = state
        .approval_service
        .approve_request(id, approver_id, role_code, payload.notes)
        .await?;

    // Instantiate Asset if request is APPROVED_L2 (or final level)
    if request.status.starts_with("APPROVED_L") && request.resource_type == "asset" && request.action_type == "CREATE" {
        if let Some(snapshot) = &request.data_snapshot {
            if let Ok(create_req) = serde_json::from_value::<management_system_core::application::dto::CreateAssetRequest>(snapshot.clone()) {
                let user_id = Uuid::parse_str(&claims.sub).unwrap_or_else(|_| Uuid::nil());
                let _ = state.asset_service.create(create_req, user_id, 1).await?;
            }
        }
    }

    Ok(Json(ApiResponse::success(request)))
}

pub async fn reject_request(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RejectRequestDto>,
) -> Result<Json<ApiResponse<ApprovalRequest>>, AppError> {
    let approver_id = claims.user_id();
    let role_code = claims.role.clone();

    // Use unified approval service - all modules now flow through approval_requests table
    let request = state
        .approval_service
        .reject_request(id, approver_id, &role_code, payload.notes)
        .await?;

    Ok(Json(ApiResponse::success(request)))
}

pub async fn delegate_request(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<DelegateRequestDto>,
) -> Result<Json<ApiResponse<ApprovalRequest>>, AppError> {
    let delegator_id = claims.user_id();
    let role_code = claims.role.clone();

    // Use unified approval service - all modules now flow through approval_requests table
    let request = state
        .approval_service
        .delegate_request(id, delegator_id, &role_code, payload.delegated_to, payload.notes)
        .await?;

    Ok(Json(ApiResponse::success(request)))
}
