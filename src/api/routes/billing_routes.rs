//! Billing Routes
//!
//! Routes for rental billing operations.

use axum::{
    routing::{get, post},
    Router,
};

use crate::api::handlers::billing_handler;
use crate::api::server::AppState;

pub fn billing_routes() -> Router<AppState> {
    Router::new()
        // Billing CRUD
        .route(
            "/api/rentals/billing",
            post(billing_handler::create_billing_period),
        )
        .route(
            "/api/rentals/billing/:id",
            get(billing_handler::get_billing),
        )
        .route(
            "/api/rentals/:rental_id/billing",
            get(billing_handler::list_billing_by_rental),
        )
        // Billing Operations
        .route(
            "/api/rentals/billing/:id/calculate",
            post(billing_handler::calculate_billing),
        )
        .route(
            "/api/rentals/billing/:id/approve",
            post(billing_handler::approve_billing),
        )
        .route(
            "/api/rentals/billing/:id/invoice",
            post(billing_handler::generate_invoice),
        )
        .route(
            "/api/rentals/billing/:id/summary",
            get(billing_handler::get_billing_summary),
        )
}
