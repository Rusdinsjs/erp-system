//! Billing Handler
//!
//! HTTP handlers for rental billing operations.

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::application::dto::{
    ApproveBillingRequest, BillingSummaryResponse, CalculateBillingRequest,
    CreateBillingPeriodRequest, GenerateInvoiceRequest,
};
use management_system_core::domain::entities::{RentalBillingPeriod, UserClaims};
use management_system_core::shared::errors::AppResult;

/// Create billing period
pub async fn create_billing_period(
    State(state): State<AppState>,
    Json(request): Json<CreateBillingPeriodRequest>,
) -> AppResult<(StatusCode, Json<RentalBillingPeriod>)> {
    let billing = state.billing_service.create_billing_period(request).await?;
    Ok((StatusCode::CREATED, Json(billing)))
}

/// Get billing by ID
pub async fn get_billing(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<RentalBillingPeriod>> {
    let billing = state.billing_service.get_by_id(id).await?;
    Ok(Json(billing))
}

/// Calculate billing from approved timesheets
pub async fn calculate_billing(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(request): Json<CalculateBillingRequest>,
) -> AppResult<Json<RentalBillingPeriod>> {
    let calculated_by = Uuid::parse_str(&claims.sub)?;

    let billing = state
        .billing_service
        .calculate_billing(id, request, calculated_by)
        .await?;
    Ok(Json(billing))
}

/// Approve billing
pub async fn approve_billing(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(request): Json<ApproveBillingRequest>,
) -> AppResult<StatusCode> {
    let approved_by = Uuid::parse_str(&claims.sub)?;

    state
        .billing_service
        .approve_billing(id, request, approved_by)
        .await?;
    Ok(StatusCode::OK)
}

/// Generate invoice response
#[derive(Serialize)]
pub struct InvoiceResponse {
    pub invoice_number: String,
    pub message: String,
}

/// Generate invoice
pub async fn generate_invoice(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(request): Json<GenerateInvoiceRequest>,
) -> AppResult<Json<InvoiceResponse>> {
    let invoice_number = state.billing_service.generate_invoice(id, request).await?;

    Ok(Json(InvoiceResponse {
        invoice_number: invoice_number.clone(),
        message: format!("Invoice {} generated successfully", invoice_number),
    }))
}

/// Get billing summary with details
pub async fn get_billing_summary(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<BillingSummaryResponse>> {
    let summary = state.billing_service.get_billing_summary(id).await?;
    Ok(Json(summary))
}
