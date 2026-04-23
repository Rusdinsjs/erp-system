use axum::{
    extract::{Query, State},
    http::header,
    response::{IntoResponse, Response},
};
use chrono::NaiveDate;
use serde::Deserialize;

use crate::api::server::AppState;
use management_system_core::shared::errors::AppError;

#[derive(Deserialize)]
pub struct MaintenanceReportParams {
    start_date: NaiveDate,
    end_date: NaiveDate,
}

pub async fn export_assets(State(state): State<AppState>) -> Response {
    match state.report_service.generate_asset_inventory_csv().await {
        Ok(csv_content) => (
            [
                (header::CONTENT_TYPE, "text/csv"),
                (
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=\"asset_inventory.csv\"",
                ),
            ],
            csv_content,
        )
            .into_response(),
        Err(err) => AppError::from(err).into_response(),
    }
}

#[axum::debug_handler]
pub async fn export_assets_pdf(State(state): State<AppState>) -> Response {
    match state.report_service.generate_asset_inventory_pdf().await {
        Ok(pdf_bytes) => (
            [
                (header::CONTENT_TYPE, "application/pdf"),
                (
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=\"asset_inventory.pdf\"",
                ),
            ],
            pdf_bytes,
        )
            .into_response(),
        Err(err) => AppError::from(err).into_response(),
    }
}

pub async fn export_maintenance(
    State(state): State<AppState>,
    Query(params): Query<MaintenanceReportParams>,
) -> Response {
    match state
        .report_service
        .generate_maintenance_log_csv(params.start_date, params.end_date)
        .await
    {
        Ok(csv_content) => (
            [
                (header::CONTENT_TYPE, "text/csv"),
                (
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=\"maintenance_logs.csv\"",
                ),
            ],
            csv_content,
        )
            .into_response(),
        Err(err) => AppError::from(err).into_response(),
    }
}

#[derive(Deserialize)]
pub struct AnalysisParams {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

pub async fn get_capex_opex_analysis(
    State(state): State<AppState>,
    Query(params): Query<AnalysisParams>,
) -> Response {
    match state
        .report_service
        .get_capex_opex_analysis(params.start_date, params.end_date)
        .await
    {
        Ok(data) => axum::Json(serde_json::json!({
            "success": true,
            "data": data
        }))
        .into_response(),
        Err(err) => AppError::from(err).into_response(),
    }
}

pub async fn export_fuel_csv(State(state): State<AppState>) -> Response {
    match state.report_service.generate_fuel_report_csv().await {
        Ok(csv_content) => (
            [
                (header::CONTENT_TYPE, "text/csv"),
                (
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=\"fuel_report.csv\"",
                ),
            ],
            csv_content,
        )
            .into_response(),
        Err(err) => AppError::from(err).into_response(),
    }
}

pub async fn export_fuel_pdf(State(state): State<AppState>) -> Response {
    match state.report_service.generate_fuel_report_pdf().await {
        Ok(pdf_bytes) => (
            [
                (header::CONTENT_TYPE, "application/pdf"),
                (
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=\"fuel_report.pdf\"",
                ),
            ],
            pdf_bytes,
        )
            .into_response(),
        Err(err) => AppError::from(err).into_response(),
    }
}

pub async fn export_work_orders_csv(State(state): State<AppState>) -> Response {
    match state.report_service.generate_work_order_report_csv().await {
        Ok(csv_content) => (
            [
                (header::CONTENT_TYPE, "text/csv"),
                (
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=\"work_order_report.csv\"",
                ),
            ],
            csv_content,
        )
            .into_response(),
        Err(err) => AppError::from(err).into_response(),
    }
}

pub async fn export_work_orders_pdf(State(state): State<AppState>) -> Response {
    match state.report_service.generate_work_order_report_pdf().await {
        Ok(pdf_bytes) => (
            [
                (header::CONTENT_TYPE, "application/pdf"),
                (
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=\"work_order_report.pdf\"",
                ),
            ],
            pdf_bytes,
        )
            .into_response(),
        Err(err) => AppError::from(err).into_response(),
    }
}

pub async fn export_loans_csv(State(state): State<AppState>) -> Response {
    match state.report_service.generate_loan_report_csv().await {
        Ok(csv_content) => (
            [
                (header::CONTENT_TYPE, "text/csv"),
                (
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=\"loan_report.csv\"",
                ),
            ],
            csv_content,
        )
            .into_response(),
        Err(err) => AppError::from(err).into_response(),
    }
}

pub async fn export_loans_pdf(State(state): State<AppState>) -> Response {
    match state.report_service.generate_loan_report_pdf().await {
        Ok(pdf_bytes) => (
            [
                (header::CONTENT_TYPE, "application/pdf"),
                (
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=\"loan_report.pdf\"",
                ),
            ],
            pdf_bytes,
        )
            .into_response(),
        Err(err) => AppError::from(err).into_response(),
    }
}
