//! Data Handlers
//!
//! Handlers for data export and import.

use axum::{
    extract::State,
    http::header,
    response::{IntoResponse, Response},
};

use crate::api::server::AppState;
use crate::shared::errors::AppError;

/// Export assets as CSV
pub async fn export_assets(State(state): State<AppState>) -> Result<Response, AppError> {
    let csv_data = state.data_service.export_assets_csv().await?;

    let headers = [
        (header::CONTENT_TYPE, "text/csv"),
        (
            header::CONTENT_DISPOSITION,
            "attachment; filename=\"assets.csv\"",
        ),
    ];

    Ok((headers, csv_data).into_response())
}
