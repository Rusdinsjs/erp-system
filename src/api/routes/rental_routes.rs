//! Rental Routes
//!
//! API routes for Rented-Out (external asset rental) operations.

use axum::{
    routing::{get, post, put},
    Router,
};

use crate::api::handlers::rental_billing_handler; // Added
use crate::api::handlers::rental_handler;
use crate::api::server::AppState;

pub fn rental_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/rentals/handovers/:id/photos",
            post(rental_handler::add_handover_photo),
        )
        // Client Endpoints
        .route(
            "/api/rentals",
            get(rental_handler::list_rentals).post(rental_handler::create_rental),
        )
        .route(
            "/api/rentals/pending",
            get(rental_handler::list_pending_rentals),
        )
        .route(
            "/api/rentals/overdue",
            get(rental_handler::list_overdue_rentals),
        )
        .route("/api/rentals/schedule", get(rental_handler::get_schedule))
        .route("/api/rentals/:id", get(rental_handler::get_rental))
        .route(
            "/api/rentals/:id/approve",
            put(rental_handler::approve_rental),
        )
        .route(
            "/api/rentals/:id/reject",
            put(rental_handler::reject_rental),
        )
        .route(
            "/api/rentals/:id/dispatch",
            post(rental_handler::dispatch_rental),
        )
        .route(
            "/api/rentals/:id/return",
            post(rental_handler::return_rental),
        )
        .route(
            "/api/rentals/:id/handovers",
            get(rental_handler::get_rental_handovers),
        )
        // Billing
        .route(
            "/api/rentals/:id/billing/preview",
            post(rental_billing_handler::preview_billing),
        )
        .route(
            "/api/rentals/:id/billing",
            get(rental_billing_handler::list_billings).post(rental_billing_handler::create_billing),
        )
        .route(
            "/api/rentals/:id/billing/:billing_id/pdf", // Note: :billing_id in this route refers to Billing ID, not Rental ID
            get(rental_billing_handler::download_invoice)
                .post(rental_billing_handler::email_invoice),
        )
        // Rental Rates
        .route(
            "/api/rental-rates",
            get(rental_handler::list_rental_rates).post(rental_handler::create_rental_rate),
        )
        .route(
            "/api/rental-rates/:id",
            put(rental_handler::update_rental_rate).delete(rental_handler::delete_rental_rate),
        )
}
