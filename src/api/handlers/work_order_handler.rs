//! Work Order Handler with RBAC

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use rust_decimal::Decimal;
use serde::Deserialize;
use uuid::Uuid;

use crate::api::handlers::notification_ws::NotificationMessage;
use crate::api::server::AppState;
use crate::application::dto::{ApiResponse, PaginationParams};
use crate::application::services::CreateWorkOrderRequest;
use crate::domain::entities::{UserClaims as Claims, WorkOrder};
use crate::shared::errors::AppError;
use serde_json::json;

/// Role level constants
const ROLE_MANAGER: i32 = 2;
const ROLE_SUPERVISOR: i32 = 3;
const ROLE_OPERATOR: i32 = 4;

/// Check if user has required role level
fn check_role(claims: &Claims, required_level: i32) -> Result<(), AppError> {
    if claims.role_level > required_level {
        return Err(AppError::Forbidden(format!(
            "Requires role level {} or higher. Your level: {}",
            required_level, claims.role_level
        )));
    }
    Ok(())
}

/// Extract user ID from claims
fn get_user_id(claims: &Claims) -> Result<Uuid, AppError> {
    Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))
}

/// List work orders (all authenticated users)
pub async fn list_work_orders(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<WorkOrder>>, AppError> {
    let orders = state
        .work_order_service
        .list(params.page(), params.per_page())
        .await?;
    Ok(Json(orders))
}

/// List pending work orders
pub async fn list_pending_work_orders(
    State(state): State<AppState>,
) -> Result<Json<Vec<WorkOrder>>, AppError> {
    let orders = state.work_order_service.list_pending().await?;
    Ok(Json(orders))
}

/// List overdue work orders
pub async fn list_overdue_work_orders(
    State(state): State<AppState>,
) -> Result<Json<Vec<WorkOrder>>, AppError> {
    let orders = state.work_order_service.list_overdue().await?;
    Ok(Json(orders))
}

/// Get single work order
pub async fn get_work_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkOrder>, AppError> {
    let order = state.work_order_service.get_by_id(id).await?;
    Ok(Json(order))
}

/// Create work order (Operator+)
pub async fn create_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateWorkOrderRequest>,
) -> Result<(StatusCode, Json<ApiResponse<WorkOrder>>), AppError> {
    // Check role: Operator (4) or higher
    check_role(&claims, ROLE_OPERATOR)?;

    let user_id = get_user_id(&claims)?;
    let order = state
        .work_order_service
        .create(payload, Some(user_id))
        .await?;

    // Broadcast new work order event
    state
        .ws_manager
        .broadcast(&NotificationMessage {
            event_type: "WORK_ORDER_CREATED".to_string(),
            payload: json!({
                "id": order.id,
                "asset_id": order.asset_id,
                "status": order.status,
                "created_by": user_id
            }),
        })
        .await;

    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            order,
            "Work order created",
        )),
    ))
}

/// Approve work order (Supervisor+)
pub async fn approve_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<WorkOrder>>, AppError> {
    // Check role: Supervisor (3) or higher
    check_role(&claims, ROLE_SUPERVISOR)?;

    let approver_id = get_user_id(&claims)?;
    let order = state.work_order_service.approve(id, approver_id).await?;

    Ok(Json(ApiResponse::success_with_message(
        order,
        "Work order approved",
    )))
}

/// Assign work order to technician (Supervisor+)
pub async fn assign_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, technician_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<WorkOrder>>, AppError> {
    // Check role: Supervisor (3) or higher
    check_role(&claims, ROLE_SUPERVISOR)?;

    let order = state.work_order_service.assign(id, technician_id).await?;

    Ok(Json(ApiResponse::success_with_message(
        order,
        "Work order assigned",
    )))
}

/// Start work order (Assigned technician only)
pub async fn start_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<WorkOrder>>, AppError> {
    let user_id = get_user_id(&claims)?;

    // Get work order to check assignment
    let wo = state.work_order_service.get_by_id(id).await?;

    // Verify user is assigned technician (or Supervisor+ can override)
    if let Some(assigned) = wo.assigned_technician {
        if assigned != user_id && claims.role_level > ROLE_SUPERVISOR {
            return Err(AppError::Forbidden(
                "Only assigned technician or supervisor can start this work order".to_string(),
            ));
        }
    } else if claims.role_level > ROLE_SUPERVISOR {
        return Err(AppError::Forbidden(
            "Work order must be assigned before starting".to_string(),
        ));
    }

    let order = state.work_order_service.start_work(id).await?;

    Ok(Json(ApiResponse::success_with_message(
        order,
        "Work started",
    )))
}

#[derive(Deserialize)]
pub struct CompleteWorkOrderRequest {
    pub work_performed: String,
    pub actual_cost: Option<Decimal>,
}

/// Complete work order (Assigned technician only)
pub async fn complete_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CompleteWorkOrderRequest>,
) -> Result<Json<ApiResponse<WorkOrder>>, AppError> {
    let user_id = get_user_id(&claims)?;

    // Get work order to check assignment
    let wo = state.work_order_service.get_by_id(id).await?;

    // Verify user is assigned technician (or Supervisor+ can override)
    if let Some(assigned) = wo.assigned_technician {
        if assigned != user_id && claims.role_level > ROLE_SUPERVISOR {
            return Err(AppError::Forbidden(
                "Only assigned technician or supervisor can complete this work order".to_string(),
            ));
        }
    } else if claims.role_level > ROLE_SUPERVISOR {
        return Err(AppError::Forbidden(
            "Work order must be assigned before completing".to_string(),
        ));
    }
    let order = state
        .work_order_service
        .complete(id, user_id, &payload.work_performed, payload.actual_cost)
        .await?;

    // Broadcast work order completion
    state
        .ws_manager
        .broadcast(&NotificationMessage {
            event_type: "WORK_ORDER_COMPLETED".to_string(),
            payload: json!({
                "id": order.id,
                "status": order.status,
                "completed_by": user_id
            }),
        })
        .await;

    Ok(Json(ApiResponse::success_with_message(
        order,
        "Work order completed",
    )))
}

/// Cancel work order (Manager+)
pub async fn cancel_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<WorkOrder>>, AppError> {
    // Check role: Manager (2) or higher
    check_role(&claims, ROLE_MANAGER)?;

    // TODO: Implement cancel in service
    let order = state.work_order_service.get_by_id(id).await?;

    Ok(Json(ApiResponse::success_with_message(
        order,
        "Work order cancelled",
    )))
}

#[derive(Deserialize)]
pub struct AddTaskRequest {
    pub task_number: i32,
    pub description: String,
}

#[derive(Deserialize)]
pub struct AddPartRequest {
    pub part_name: String,
    pub quantity: Decimal,
    pub unit_cost: Decimal,
}

// Handlers for Tasks
pub async fn get_work_order_tasks(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<crate::domain::entities::ChecklistItem>>, AppError> {
    let tasks = state.work_order_service.get_checklist(id).await?;
    Ok(Json(tasks))
}

pub async fn add_work_order_task(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<AddTaskRequest>,
) -> Result<Json<crate::domain::entities::ChecklistItem>, AppError> {
    check_role(&claims, ROLE_OPERATOR)?;

    let task = state
        .work_order_service
        .add_checklist_item(id, payload.task_number, payload.description)
        .await?;
    Ok(Json(task))
}

pub async fn remove_work_order_task(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((_id, task_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    check_role(&claims, ROLE_SUPERVISOR)?;

    state
        .work_order_service
        .remove_checklist_item(task_id)
        .await?;
    Ok(Json(ApiResponse::success_with_message(
        true,
        "Task removed",
    )))
}

// Handlers for Parts
pub async fn get_work_order_parts(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<crate::domain::entities::WorkOrderPart>>, AppError> {
    let parts = state.work_order_service.get_parts(id).await?;
    Ok(Json(parts))
}

pub async fn add_work_order_part(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<AddPartRequest>,
) -> Result<Json<crate::domain::entities::WorkOrderPart>, AppError> {
    check_role(&claims, ROLE_OPERATOR)?;

    let part = state
        .work_order_service
        .add_part(id, payload.part_name, payload.quantity, payload.unit_cost)
        .await?;
    Ok(Json(part))
}

pub async fn remove_work_order_part(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, part_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    check_role(&claims, ROLE_OPERATOR)?;

    state.work_order_service.remove_part(part_id, id).await?;
    Ok(Json(ApiResponse::success_with_message(
        true,
        "Part removed",
    )))
}
