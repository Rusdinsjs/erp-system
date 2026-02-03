//! Location Routes
//!
//! API routes for Location operations.

use axum::{routing::get, Router};

use crate::api::handlers::location_handler;

use crate::api::server::AppState;

pub fn location_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/locations",
            get(location_handler::list_locations).post(location_handler::create_location),
        )
        .route(
            "/api/locations/hierarchy",
            get(location_handler::get_location_hierarchy),
        )
        .route(
            "/api/locations/:id",
            get(location_handler::get_location)
                .put(location_handler::update_location)
                .delete(location_handler::delete_location),
        )
}
