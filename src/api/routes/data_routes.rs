//! Data Routes
//!
//! Routes for data export/import.

use axum::{routing::get, Router};

use crate::api::handlers::data_handler;
use crate::api::server::AppState;

/// Data routes
pub fn data_routes() -> Router<AppState> {
    Router::new().route("/export/assets", get(data_handler::export_assets))
    // .route("/import/assets", post(data_handler::import_assets))
}
