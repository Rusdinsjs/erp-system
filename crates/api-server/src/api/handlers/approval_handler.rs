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
    let role_level = claims.role_level;

    // 1. Get generic approvals
    let mut requests = state.approval_service.list_pending(role_level).await?;

    // 2. Get pending Work Orders (map to ApprovalRequest)
    let pending_work_orders = state.work_order_service.list_pending().await?;
    for wo in pending_work_orders {
        requests.push(ApprovalRequest {
            id: wo.id, // Use WO ID directly
            workflow_id: None,
            required_levels: Some(1),
            resource_type: "work_order".to_string(),
            resource_id: wo.id,
            action_type: "create_work_order".to_string(),
            requested_by: wo.created_by.unwrap_or_default(),
            data_snapshot: Some(serde_json::json!({
                "title": format!("WO #{}", wo.wo_number),
                "wo_type": wo.wo_type,
                "priority": wo.priority,
                "estimated_cost": wo.estimated_cost
            })),
            status: "PENDING".to_string(),
            current_approval_level: 1, // WO is typically 1 level
            approved_by_l1: None,
            approved_at_l1: None,
            notes_l1: None,
            approved_by_l2: None,
            approved_at_l2: None,
            notes_l2: None,
            created_at: wo.created_at,
            updated_at: wo.updated_at,
            requester_name: None, // Could fetch if critical
        });
    }

    // 3. Get pending Loans (map to ApprovalRequest)
    // Assuming loan_service.list_pending or list() with status filter exists
    // Using list() for now as list_pending wasn't explicitly seen, filtering manually
    // Actually loan_service methods seen: list, list_overdue. 'Requested' status is pending.
    // Let's assume fetching all for now or add a method. list(1, 100) might be enough.
    // Ideally we add list_pending to loan_service, but to avoid touching service let's fetch list.
    let loans = state.loan_service.list(1, 100).await?;
    let pending_loans: Vec<_> = loans
        .into_iter()
        .filter(|l| l.status == "requested")
        .collect();

    for loan in pending_loans {
        let asset_name = if let Ok(asset) = state.asset_service.get_by_id(loan.asset_id).await {
            asset.name
        } else {
            "Unknown Asset".to_string()
        };

        requests.push(ApprovalRequest {
            id: loan.id,
            workflow_id: None,
            required_levels: Some(1),
            resource_type: "loan".to_string(),
            resource_id: loan.asset_id,
            action_type: "loan_request".to_string(),
            requested_by: loan.borrower_id.unwrap_or_else(Uuid::nil),
            data_snapshot: Some(serde_json::json!({
                "asset_id": loan.asset_id,
                "asset_name": asset_name,
                "loan_date": loan.loan_date,
                "return_date": loan.expected_return_date
            })),
            status: "PENDING".to_string(),
            current_approval_level: 1,
            approved_by_l1: None,
            approved_at_l1: None,
            notes_l1: None,
            approved_by_l2: None,
            approved_at_l2: None,
            notes_l2: None,
            created_at: loan.created_at,
            updated_at: loan.updated_at,
            requester_name: None,
        });
    }

    // Sort by Date Descending
    requests.sort_by(|a, b| b.created_at.cmp(&a.created_at));

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

    // Check if it's a generic approval first
    if let Ok(Some(_req)) = state.approval_service.repository.find_by_id(id).await {
        let request = state
            .approval_service
            .approve_request(id, approver_id, role_code, payload.notes)
            .await?;

        // Instantiate Asset if request is APPROVED_L2
        if request.status == "APPROVED_L2" && request.resource_type == "Asset" && request.action_type == "CREATE" {
            if let Some(snapshot) = &request.data_snapshot {
                if let Ok(create_req) = serde_json::from_value::<management_system_core::application::dto::CreateAssetRequest>(snapshot.clone()) {
                    let user_id = Uuid::parse_str(&claims.sub).unwrap_or_else(|_| Uuid::nil());
                    let _ = state.asset_service.create(create_req, user_id, 1).await?;
                }
            }
        }

        return Ok(Json(ApiResponse::success(request)));
    }

    // If not found in generic requests, check Work Orders
    if let Ok(wo) = state.work_order_service.get_by_id(id).await {
        state.work_order_service.approve(id, approver_id).await?;
        
        // Map to ApprovalRequest directly
        let mapped = ApprovalRequest {
            id: wo.id,
            workflow_id: None,
            required_levels: Some(1),
            resource_type: "work_order".to_string(),
            resource_id: wo.id,
            action_type: "create_work_order".to_string(),
            requested_by: wo.created_by.unwrap_or_default(),
            data_snapshot: None,
            status: "APPROVED".to_string(),
            current_approval_level: 2,
            approved_by_l1: Some(approver_id),
            approved_at_l1: Some(chrono::Utc::now()),
            notes_l1: payload.notes.clone(),
            approved_by_l2: None,
            approved_at_l2: None,
            notes_l2: None,
            created_at: wo.created_at,
            updated_at: chrono::Utc::now(),
            requester_name: None,
        };
        
        return Ok(Json(ApiResponse::success(mapped)));
    }

    // Attempt Loan Approval
    if let Ok(loan) = state.loan_service.approve(id, approver_id).await {
        let mapped = ApprovalRequest {
            id: loan.id,
            workflow_id: None,
            required_levels: Some(1),
            resource_type: "loan".to_string(),
            resource_id: loan.asset_id,
            action_type: "loan_request".to_string(),
            requested_by: loan.borrower_id.unwrap_or_else(Uuid::nil),
            data_snapshot: None,
            status: "APPROVED".to_string(),
            current_approval_level: 2,
            approved_by_l1: Some(approver_id),
            approved_at_l1: Some(chrono::Utc::now()),
            notes_l1: payload.notes.clone(),
            approved_by_l2: None,
            approved_at_l2: None,
            notes_l2: None,
            created_at: loan.created_at,
            updated_at: chrono::Utc::now(),
            requester_name: None,
        };
        
        return Ok(Json(ApiResponse::success(mapped)));
    }

    Err(AppError::BadRequest("Request not found".to_string()))
}

pub async fn reject_request(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RejectRequestDto>,
) -> Result<Json<ApiResponse<ApprovalRequest>>, AppError> {
    let approver_id = claims.user_id();

    // Generic
    if let Ok(Some(_)) = state.approval_service.repository.find_by_id(id).await {
        let request = state
            .approval_service
            .reject_request(id, approver_id, payload.notes)
            .await?;
        return Ok(Json(ApiResponse::success(request)));
    }

    // Work Orders (Cancel/Reject)
    if state.work_order_service.get_by_id(id).await.is_ok() {
        return Err(AppError::BadRequest(
            "Rejection not fully implemented for Work Orders yet".to_string(),
        ));
    }

    Err(AppError::BadRequest(
        "Request not found or cannot be rejected".to_string(),
    ))
}
