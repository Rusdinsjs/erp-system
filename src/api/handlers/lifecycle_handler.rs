//! Lifecycle API Handler
//!
//! Endpoints for asset lifecycle state transitions.

use axum::{
    extract::{Path, State},
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::ApiResponse;
use crate::application::services::lifecycle_service::{
    LifecycleService, StateInfo, StateInfoWithApproval, TransitionRequestResult,
};
use crate::domain::entities::{LifecycleHistory, UserClaims as Claims};
use crate::shared::errors::AppError;

#[derive(Deserialize)]
pub struct TransitionRequest {
    pub target_state: String,
    pub reason: Option<String>,
}

/// Response for transition request
#[derive(Serialize)]
#[serde(tag = "result_type")]
pub enum TransitionResponse {
    /// Transition executed immediately
    Executed { history: LifecycleHistory },
    /// Approval request created
    ApprovalCreated {
        approval_request_id: Uuid,
        message: String,
    },
}

/// POST /api/assets/:id/lifecycle/request-transition
/// Request a transition (may require approval)
pub async fn request_transition(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(asset_id): Path<Uuid>,
    Json(req): Json<TransitionRequest>,
) -> Result<Json<ApiResponse<TransitionResponse>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;

    let result = state
        .lifecycle_service
        .request_transition(asset_id, &req.target_state, req.reason.clone(), user_id)
        .await?;

    match result {
        TransitionRequestResult::Executed { history } => {
            Ok(Json(ApiResponse::success(TransitionResponse::Executed {
                history,
            })))
        }
        TransitionRequestResult::RequiresApproval {
            from_state,
            to_state,
            data,
            requested_by,
        } => {
            // Create approval request
            let approval_request = state
                .approval_service
                .create_request(
                    "lifecycle_transition",
                    asset_id,
                    &format!("transition_to_{}", to_state),
                    requested_by,
                    Some(data),
                )
                .await?;

            Ok(Json(ApiResponse::success(
                TransitionResponse::ApprovalCreated {
                    approval_request_id: approval_request.id,
                    message: format!(
                        "Transition from '{}' to '{}' requires approval. Request created.",
                        from_state, to_state
                    ),
                },
            )))
        }
    }
}

/// POST /api/assets/:id/lifecycle/transition (legacy - direct transition)
pub async fn transition_asset(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(asset_id): Path<Uuid>,
    Json(req): Json<TransitionRequest>,
) -> Result<Json<ApiResponse<LifecycleHistory>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;

    let history = state
        .lifecycle_service
        .transition_asset(asset_id, &req.target_state, req.reason, Some(user_id))
        .await?;

    Ok(Json(ApiResponse::success(history)))
}

/// GET /api/assets/:id/lifecycle/history
pub async fn get_lifecycle_history(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<LifecycleHistory>>>, AppError> {
    let history = state.lifecycle_service.get_history(asset_id).await?;
    Ok(Json(ApiResponse::success(history)))
}

/// GET /api/assets/:id/lifecycle/valid-transitions
pub async fn get_valid_transitions(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<StateInfo>>>, AppError> {
    let transitions = state
        .lifecycle_service
        .get_valid_transitions(asset_id)
        .await?;
    let state_infos: Vec<_> = transitions
        .into_iter()
        .map(|s| StateInfo {
            value: s.as_str().to_string(),
            label: s.display_name().to_string(),
            color: s.color().to_string(),
            is_terminal: s.is_terminal(),
        })
        .collect();
    Ok(Json(ApiResponse::success(state_infos)))
}

/// GET /api/assets/:id/lifecycle/valid-transitions-with-approval
pub async fn get_valid_transitions_with_approval(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<StateInfoWithApproval>>>, AppError> {
    let transitions = state
        .lifecycle_service
        .get_valid_transitions_with_approval(asset_id)
        .await?;
    Ok(Json(ApiResponse::success(transitions)))
}

/// GET /api/lifecycle/states
pub async fn get_all_states() -> Json<ApiResponse<Vec<StateInfo>>> {
    let states = LifecycleService::get_all_states();
    Json(ApiResponse::success(states))
}

/// GET /api/assets/:id/lifecycle/status
pub async fn get_current_status(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
) -> Result<Json<ApiResponse<StateInfo>>, AppError> {
    let status = state.lifecycle_service.get_current_status(asset_id).await?;
    Ok(Json(ApiResponse::success(status)))
}
