//! Category Routes
//!
//! Routes for category management.

use axum::{
    routing::{delete, get},
    Router,
};

use crate::api::handlers::{category_handler, category_template_handler};
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
        // Template Routes
        .route(
            "/templates",
            get(category_template_handler::list_category_templates)
                .post(category_template_handler::upsert_category_template),
        )
        .route(
            "/templates/{category_id}",
            delete(category_template_handler::delete_category_template),
        )
        .route(
            "/{id}",
            get(category_handler::get_category)
                .put(category_handler::update_category)
                .delete(category_handler::delete_category),
        )
}
