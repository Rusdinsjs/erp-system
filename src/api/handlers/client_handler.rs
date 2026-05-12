//! Client Handlers
//!
//! HTTP handlers for managing external clients.

use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{
    ApiResponse, CreateClientRequest, PaginatedResponse, PaginationParams, UpdateClientRequest,
};
use crate::domain::entities::Client;
use crate::shared::errors::AppError;

use serde::Deserialize;

#[derive(Deserialize)]
pub struct SearchParams {
    pub q: String,
    pub limit: Option<i64>,
}

pub async fn api_list_clients(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedResponse<Client>>, AppError> {
    let (clients, total) = state
        .client_service
        .list_clients(params.per_page(), params.offset())
        .await
        .map_err(AppError::Domain)?;

    Ok(Json(PaginatedResponse::new(
        clients,
        total,
        params.page(),
        params.per_page(),
    )))
}

pub async fn api_create_client(
    State(state): State<AppState>,
    Json(request): Json<CreateClientRequest>,
) -> Result<Json<ApiResponse<Client>>, AppError> {
    // Create entity from DTO
    let mut client = Client::new(request.name, request.company_name);
    client.email = request.email;
    client.phone = request.phone;
    client.address = request.address;
    client.city = request.city;
    client.contact_person = request.contact_person;
    client.tax_id = request.tax_id;
    client.notes = request.notes;

    let created = state
        .client_service
        .create_client(client)
        .await
        .map_err(AppError::Domain)?;

    Ok(Json(ApiResponse::success(created)))
}

pub async fn api_get_client(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Client>>, AppError> {
    let client = state
        .client_service
        .get_client(id)
        .await
        .map_err(AppError::Domain)?;

    Ok(Json(ApiResponse::success(client)))
}

pub async fn api_update_client(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateClientRequest>,
) -> Result<Json<ApiResponse<Client>>, AppError> {
    // Fetch existing client
    let mut client = state
        .client_service
        .get_client(id)
        .await
        .map_err(AppError::Domain)?;

    // Apply updates from request
    if let Some(name) = request.name {
        client.name = name;
    }
    if let Some(company_name) = request.company_name {
        client.company_name = Some(company_name);
    }
    if let Some(email) = request.email {
        client.email = Some(email);
    }
    if let Some(phone) = request.phone {
        client.phone = Some(phone);
    }
    if let Some(address) = request.address {
        client.address = Some(address);
    }
    if let Some(city) = request.city {
        client.city = Some(city);
    }
    if let Some(contact_person) = request.contact_person {
        client.contact_person = Some(contact_person);
    }
    if let Some(tax_id) = request.tax_id {
        client.tax_id = Some(tax_id);
    }
    if let Some(is_active) = request.is_active {
        client.is_active = Some(is_active);
    }
    if let Some(notes) = request.notes {
        client.notes = Some(notes);
    }

    let updated = state
        .client_service
        .update_client(id, client)
        .await
        .map_err(AppError::Domain)?;

    Ok(Json(ApiResponse::success(updated)))
}

pub async fn api_search_clients(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> Result<Json<ApiResponse<Vec<Client>>>, AppError> {
    let limit = params.limit.unwrap_or(20);
    let clients = state
        .client_service
        .search_clients(&params.q, limit)
        .await
        .map_err(AppError::Domain)?;

    Ok(Json(ApiResponse::success(clients)))
}
