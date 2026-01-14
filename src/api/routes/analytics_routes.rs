use crate::api::handlers::analytics_handler;
use crate::api::server::AppState;
use axum::{routing::get, Router};

pub fn routes() -> Router<AppState> {
    Router::new().route(
        "/api/analytics/asset/:id/roi",
        get(analytics_handler::get_asset_roi),
    )
}
