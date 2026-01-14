//! Client Handlers
//!
//! HTTP handlers for managing external clients.

use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{ApiResponse, PaginatedResponse, PaginationParams};
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
        .map_err(|e| AppError::Domain(e))?;

    Ok(Json(PaginatedResponse::new(
        clients,
        total,
        params.page(),
        params.per_page(),
    )))
}

pub async fn api_create_client(
    State(state): State<AppState>,
    Json(client): Json<Client>,
) -> Result<Json<ApiResponse<Client>>, AppError> {
    let created = state
        .client_service
        .create_client(client)
        .await
        .map_err(|e| AppError::Domain(e))?;

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
        .map_err(|e| AppError::Domain(e))?;

    Ok(Json(ApiResponse::success(client)))
}

pub async fn api_update_client(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(client): Json<Client>,
) -> Result<Json<ApiResponse<Client>>, AppError> {
    let updated = state
        .client_service
        .update_client(id, client)
        .await
        .map_err(|e| AppError::Domain(e))?;

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
        .map_err(|e| AppError::Domain(e))?;

    Ok(Json(ApiResponse::success(clients)))
}
