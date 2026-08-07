use crate::api::handlers::metadata_handler;
use axum::{
    routing::{delete, get, post},
    Router,
};

pub fn metadata_routes() -> Router<crate::api::server::AppState> {
    Router::new()
        .route(
            "/",
            post(metadata_handler::register_entity_type),
        )
        .route(
            "/:entity_name",
            get(metadata_handler::get_entity_bundle),
        )
        .route(
            "/:entity_name/fields",
            post(metadata_handler::add_custom_field),
        )
        .route(
            "/:entity_name/fields/:field_id",
            delete(metadata_handler::remove_custom_field),
        )
}
