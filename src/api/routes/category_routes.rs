//! Category Routes
//!
//! Routes for category management.

use axum::{routing::get, Router};

use crate::api::handlers::category_handler;
use crate::api::server::AppState;

/// Category routes
pub fn category_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/",
            get(category_handler::list_categories).post(category_handler::create_category),
        )
        .route("/tree", get(category_handler::get_category_tree))
        .route("/classification", get(category_handler::get_classification))
        .route(
            "/{id}",
            get(category_handler::get_category)
                .put(category_handler::update_category)
                .delete(category_handler::delete_category),
        )
}
