use axum::{
    routing::{get, post},
    Router,
};

use crate::api::handlers::approval_handler;
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
}
