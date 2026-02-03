use axum::{
    routing::{get, post},
    Router,
};

use crate::api::handlers::asset_expense_handler;
use crate::api::server::AppState;

pub fn asset_expense_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/assets/:id/expenses",
            get(asset_expense_handler::list_asset_expenses)
                .post(asset_expense_handler::create_asset_expense),
        )
        .route(
            "/api/expenses/:id/approve",
            post(asset_expense_handler::approve_expense),
        )
        .route(
            "/api/expenses/:id/reject",
            post(asset_expense_handler::reject_expense),
        )
}
