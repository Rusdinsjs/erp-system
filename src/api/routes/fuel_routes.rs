//! Fuel Routes

use crate::api::handlers::fuel_handler;
use crate::api::server::AppState;
use axum::{
    routing::{get, post},
    Router,
};

pub fn fuel_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/fuel",
            get(fuel_handler::list_fuel_history).post(fuel_handler::request_fuel),
        )
        .route("/api/fuel/pending", get(fuel_handler::list_pending_fuel))
        .route("/api/fuel/stats", get(fuel_handler::get_fuel_stats))
        .route("/api/fuel/analytics", get(fuel_handler::get_fuel_analytics))
        .route("/api/fuel/my-requests", get(fuel_handler::list_my_fuel))
        .route("/api/fuel/:id/approve", post(fuel_handler::approve_fuel))
        .route("/api/fuel/:id/reject", post(fuel_handler::reject_fuel))
        .route("/api/fuel/:id/complete", post(fuel_handler::complete_fuel))
}
