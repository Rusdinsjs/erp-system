//! Mobile API Routes

use axum::{
    routing::{get, post},
    Router,
};

use crate::api::handlers::mobile_handler;
use crate::api::server::AppState;

/// Mobile API routes
pub fn mobile_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/scan/:code", get(mobile_handler::scan_asset))
        .route("/audit", post(mobile_handler::audit_asset))
        .route("/my-loans", get(mobile_handler::my_loans))
        .with_state(state) // State is typically inherited but explicit is fine or omitted if merged
}
