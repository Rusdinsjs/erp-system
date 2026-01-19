use axum::{
    extract::{Extension, Path, State},
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::rental_dto::{BillingCreateRequest, BillingPreviewRequest};
use crate::domain::entities::UserClaims; // Fixed imports

/// Preview billing calculation
pub async fn preview_billing(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<BillingPreviewRequest>,
) -> impl IntoResponse {
    match state
        .rental_billing_service
        .preview_billing(id, payload.start_date, payload.end_date)
        .await
    {
        Ok(billing) => Json(billing).into_response(),
        Err(e) => {
            // Basic error mapping - should ideally use custom IntoResponse for DomainError
            // For now assuming the service returns DomainError which needs mapping or existing handler logic
            (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

/// Create/Finalize billing
pub async fn create_billing(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<BillingCreateRequest>,
) -> impl IntoResponse {
    match state
        .rental_billing_service
        .create_billing(id, payload.start_date, payload.end_date, claims.user_id())
        .await
    {
        Ok(billing) => Json(billing).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// Download billing invoice PDF
pub async fn download_invoice(
    State(state): State<AppState>,
    Path((rental_id, billing_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
    // Fetch asset info for PDF (name)
    let asset_name_result = state
        .rental_service
        .get_asset_name_for_rental(rental_id)
        .await;

    let asset_name = match asset_name_result {
        Ok(name_opt) => name_opt.unwrap_or_else(|| "Unknown Asset".to_string()),
        Err(e) => {
            // Log the error and proceed with a default name or return an error response
            eprintln!("Error fetching asset name for rental {}: {}", rental_id, e);
            "Unknown Asset".to_string()
        }
    };

    match state
        .pdf_service
        .generate_rental_invoice(billing_id, asset_name)
        .await
    {
        Ok(pdf_bytes) => (
            [
                (axum::http::header::CONTENT_TYPE, "application/pdf"),
                (
                    axum::http::header::CONTENT_DISPOSITION,
                    "attachment; filename=\"invoice.pdf\"",
                ),
            ],
            pdf_bytes,
        )
            .into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Debug, serde::Deserialize)]
pub struct EmailInvoiceRequest {
    email: String,
}

pub async fn email_invoice(
    State(state): State<AppState>,
    Path((rental_id, billing_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<EmailInvoiceRequest>,
) -> impl IntoResponse {
    // Fetch asset info
    let asset_name = match state
        .rental_service
        .get_asset_name_for_rental(rental_id)
        .await
    {
        Ok(opt) => opt.unwrap_or_else(|| "Unknown Asset".to_string()),
        Err(e) => {
            eprintln!("Error fetching asset name: {}", e);
            "Unknown Asset".to_string()
        }
    };

    // Generate PDF
    let pdf = match state
        .pdf_service
        .generate_rental_invoice(billing_id, asset_name)
        .await
    {
        Ok(bytes) => bytes,
        Err(e) => return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    };

    // Fetch billing details
    let billing = match state.rental_billing_service.get_billing(billing_id).await {
        Ok(b) => b,
        Err(e) => {
            return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    };

    let recipient = payload.email;
    match state
        .email_service
        .send_invoice(&recipient, pdf, &billing)
        .await
    {
        Ok(_) => Json(serde_json::json!({ "message": "Email sent successfully" })).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// List billings for rental
pub async fn list_billings(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state.rental_billing_service.list_by_rental(id).await {
        Ok(billings) => Json(billings).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
