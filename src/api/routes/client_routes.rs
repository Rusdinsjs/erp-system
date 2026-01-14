//! Client Routes

use axum::{routing::get, Router};

use crate::api::handlers::client_handler::*;
use crate::api::server::AppState;

pub fn client_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/clients",
            get(api_list_clients).post(api_create_client),
        )
        .route("/api/clients/search", get(api_search_clients))
        .route(
            "/api/clients/:id",
            get(api_get_client).put(api_update_client),
        )
}
