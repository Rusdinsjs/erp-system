//! Timesheet Routes
//!
//! Routes for rental timesheet operations.

use axum::{
    routing::{get, post, put},
    Router,
};

use crate::api::handlers::timesheet_handler;
use crate::api::server::AppState;

pub fn timesheet_routes() -> Router<AppState> {
    Router::new()
        // Timesheet CRUD
        .route(
            "/api/rentals/timesheets",
            post(timesheet_handler::create_timesheet),
        )
        .route(
            "/api/rentals/timesheets/:id",
            get(timesheet_handler::get_timesheet),
        )
        .route(
            "/api/rentals/timesheets/:id",
            put(timesheet_handler::update_timesheet),
        )
        .route(
            "/api/rentals/:rental_id/timesheets",
            get(timesheet_handler::list_timesheets),
        )
        // Workflow
        .route(
            "/api/rentals/timesheets/:id/submit",
            post(timesheet_handler::submit_timesheet),
        )
        .route(
            "/api/rentals/timesheets/:id/verify",
            post(timesheet_handler::verify_timesheet),
        )
        .route(
            "/api/rentals/timesheets/:id/approve",
            post(timesheet_handler::client_approve_timesheet),
        )
        // Summary
        .route(
            "/api/rentals/timesheets/summary",
            get(timesheet_handler::get_timesheet_summary),
        )
        .route(
            "/api/rentals/timesheets/pending",
            get(timesheet_handler::list_pending_verification),
        )
        // Client Contact (PIC)
        .route(
            "/api/rentals/clients/contacts",
            post(timesheet_handler::create_client_contact),
        )
        .route(
            "/api/rentals/clients/:client_id/contacts",
            get(timesheet_handler::list_client_contacts),
        )
}
