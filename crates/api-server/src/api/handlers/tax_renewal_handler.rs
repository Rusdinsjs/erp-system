use crate::api::responses::ApiResponse;
use crate::api::server::AppState;
use management_system_core::application::dto::{
    ApproveTaxRenewalRequest, CompleteTaxRenewalRequest, TaxRenewalDto, UpdateTaxRenewalCostRequest,
};
use management_system_core::domain::errors::DomainError;
use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

pub async fn list_renewals(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<ApiResponse<Vec<TaxRenewalDto>>>, DomainError> {
    let status = params.get("status").cloned();
    let renewals = state.tax_renewal_service.list_renewals(status).await?;

    // Convert to DTO (In a real app, we might join with Asset to get names)
    // For now we just map fields. Asset name retrieval would require fetching Asset or a join.
    // For efficiency let's assume the frontend fetches asset details separately or we enhance the repository.
    // Here we will do a simple mapping.

    let dtos = renewals
        .into_iter()
        .map(|r| TaxRenewalDto {
            id: r.id,
            asset_id: r.asset_id,
            asset_name: r.asset_name,
            license_plate: None,
            document_type: r.document_type,
            current_expiry: r.current_expiry,
            renewal_cost: r.renewal_cost,
            status: r.status,
            notes: r.notes,
            payment_destination: r.payment_destination,
            invoice_attachment: r.invoice_attachment,
            created_at: r.created_at,
            updated_at: r.updated_at,
        })
        .collect();

    Ok(Json(ApiResponse::success(dtos)))
}

pub async fn submit_cost(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTaxRenewalCostRequest>,
) -> Result<Json<ApiResponse<TaxRenewalDto>>, DomainError> {
    let domain_req = management_system_core::domain::entities::UpdateTaxRenewalCostRequest {
        renewal_cost: req.renewal_cost,
        notes: req.notes,
        payment_destination: req.payment_destination,
        invoice_attachment: req.invoice_attachment,
    };
    let renewal = state
        .tax_renewal_service
        .submit_cost(id, domain_req)
        .await?;

    Ok(Json(ApiResponse::success(TaxRenewalDto {
        id: renewal.id,
        asset_id: renewal.asset_id,
        asset_name: None,
        license_plate: None,
        document_type: renewal.document_type,
        current_expiry: renewal.current_expiry,
        renewal_cost: renewal.renewal_cost,
        status: renewal.status,
        notes: renewal.notes,
        payment_destination: renewal.payment_destination,
        invoice_attachment: renewal.invoice_attachment,
        created_at: renewal.created_at,
        updated_at: renewal.updated_at,
    })))
}

pub async fn approve_renewal(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApproveTaxRenewalRequest>,
) -> Result<Json<ApiResponse<TaxRenewalDto>>, DomainError> {
    let renewal = state
        .tax_renewal_service
        .approve_renewal(id, req.notes)
        .await?;

    Ok(Json(ApiResponse::success(TaxRenewalDto {
        id: renewal.id,
        asset_id: renewal.asset_id,
        asset_name: None,
        license_plate: None,
        document_type: renewal.document_type,
        current_expiry: renewal.current_expiry,
        renewal_cost: renewal.renewal_cost,
        status: renewal.status,
        notes: renewal.notes,
        payment_destination: renewal.payment_destination,
        invoice_attachment: renewal.invoice_attachment,
        created_at: renewal.created_at,
        updated_at: renewal.updated_at,
    })))
}

pub async fn reject_renewal(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApproveTaxRenewalRequest>,
) -> Result<Json<ApiResponse<TaxRenewalDto>>, DomainError> {
    let renewal = state
        .tax_renewal_service
        .reject_renewal(id, req.notes)
        .await?;

    Ok(Json(ApiResponse::success(TaxRenewalDto {
        id: renewal.id,
        asset_id: renewal.asset_id,
        asset_name: None,
        license_plate: None,
        document_type: renewal.document_type,
        current_expiry: renewal.current_expiry,
        renewal_cost: renewal.renewal_cost,
        status: renewal.status,
        notes: renewal.notes,
        payment_destination: renewal.payment_destination,
        invoice_attachment: renewal.invoice_attachment,
        created_at: renewal.created_at,
        updated_at: renewal.updated_at,
    })))
}

pub async fn complete_renewal(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<CompleteTaxRenewalRequest>,
) -> Result<Json<ApiResponse<TaxRenewalDto>>, DomainError> {
    let renewal = state
        .tax_renewal_service
        .complete_renewal(id, req.new_expiry_date)
        .await?;

    Ok(Json(ApiResponse::success(TaxRenewalDto {
        id: renewal.id,
        asset_id: renewal.asset_id,
        asset_name: None, // Frontend can fetch or we enhance later
        license_plate: None,
        document_type: renewal.document_type,
        current_expiry: renewal.current_expiry,
        renewal_cost: renewal.renewal_cost,
        status: renewal.status,
        notes: renewal.notes,
        payment_destination: renewal.payment_destination,
        invoice_attachment: renewal.invoice_attachment,
        created_at: renewal.created_at,
        updated_at: renewal.updated_at,
    })))
}
