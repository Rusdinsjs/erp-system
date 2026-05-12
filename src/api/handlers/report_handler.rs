use axum::{
    extract::{Query, State},
    http::header,
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
            (header::CONTENT_TYPE, "text/csv"),
            (
                header::CONTENT_DISPOSITION,
                "attachment; filename=\"asset_inventory.csv\"",
            ),
        ],
        csv_content,
    )
        .into_response())
}

pub async fn export_assets_pdf(State(state): State<AppState>) -> Result<Response, AppError> {
    let pdf_bytes = state.report_service.generate_asset_inventory_pdf().await?;

    Ok((
        [
            (header::CONTENT_TYPE, "application/pdf"),
            (
                header::CONTENT_DISPOSITION,
                "attachment; filename=\"asset_inventory.pdf\"",
            ),
        ],
        pdf_bytes,
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
            (header::CONTENT_TYPE, "text/csv"),
            (
                header::CONTENT_DISPOSITION,
                "attachment; filename=\"maintenance_logs.csv\"",
            ),
        ],
        csv_content,
    )
        .into_response())
}

#[derive(Deserialize)]
pub struct AnalysisParams {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

pub async fn get_capex_opex_analysis(
    State(state): State<AppState>,
    Query(params): Query<AnalysisParams>,
) -> Result<axum::Json<serde_json::Value>, AppError> {
    let data = state
        .report_service
        .get_capex_opex_analysis(params.start_date, params.end_date)
        .await?;

    Ok(axum::Json(serde_json::json!({
        "success": true,
        "data": data
    })))
}
