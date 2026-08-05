use axum::{
    routing::{get, patch, post},
    Router,
};

use crate::api::handlers::{approval_handler, approval_workflow_handler};
use crate::api::server::AppState;

pub fn approval_routes(_state: AppState) -> Router<AppState> {
    Router::new()
        .route(
            "/api/approvals/requests",
            post(approval_handler::create_approval_request),
        )
        .route(
            "/api/approvals/my-requests",
            get(approval_handler::list_my_requests),
        )
        .route(
            "/api/approvals/pending",
            get(approval_handler::list_pending_requests),
        )
        .route(
            "/api/approvals/:id/approve",
            post(approval_handler::approve_request),
        )
        .route(
            "/api/approvals/:id/reject",
            post(approval_handler::reject_request),
        )
        .route(
            "/api/approvals/:id/delegate",
            post(approval_handler::delegate_request),
        )
        .route(
            "/api/approval/entity-types",
            get(approval_workflow_handler::list_entity_types)
                .post(approval_workflow_handler::create_entity_type),
        )
        .route(
            "/api/approval/entity-types/:id",
            patch(approval_workflow_handler::update_entity_type)
                .delete(approval_workflow_handler::delete_entity_type),
        )
}
