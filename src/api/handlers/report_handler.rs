use axum::{
    extract::{Query, State},
    response::{IntoResponse, Response},
};
use chrono::NaiveDate;
use serde::Deserialize;

use crate::api::server::AppState;
use crate::shared::errors::AppError;

#[derive(Deserialize)]
pub struct MaintenanceReportParams {
    start_date: NaiveDate,
    end_date: NaiveDate,
}

pub async fn export_assets(State(state): State<AppState>) -> Result<Response, AppError> {
    let csv_content = state.report_service.generate_asset_inventory_csv().await?;

    Ok((
        [
            ("Content-Type", "text/csv"),
            (
                "Content-Disposition",
                "attachment; filename=\"asset_inventory.csv\"",
            ),
        ],
        csv_content,
    )
        .into_response())
}

pub async fn export_maintenance(
    State(state): State<AppState>,
    Query(params): Query<MaintenanceReportParams>,
) -> Result<Response, AppError> {
    let csv_content = state
        .report_service
        .generate_maintenance_log_csv(params.start_date, params.end_date)
        .await?;

    Ok((
        [
            ("Content-Type", "text/csv"),
            (
                "Content-Disposition",
                "attachment; filename=\"maintenance_logs.csv\"",
            ),
        ],
        csv_content,
    )
        .into_response())
}
