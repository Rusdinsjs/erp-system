use crate::api::handlers::contract_handler;
use crate::api::server::AppState;
use axum::{
    routing::{get, patch, post},
    Router,
};

pub fn contract_routes() -> Router<AppState> {
    Router::new()
        .route("/api/contracts", post(contract_handler::create_contract))
        .route("/api/contracts", get(contract_handler::list_contracts))
        .route("/api/contracts/:id", get(contract_handler::get_contract))
        .route(
            "/api/contracts/:id",
            patch(contract_handler::update_contract),
        )
}
