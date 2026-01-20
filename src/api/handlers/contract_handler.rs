use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::contract_dto::{CreateContractRequest, UpdateContractRequest};
use crate::domain::entities::UserClaims;
use axum::Extension;

#[derive(Debug, Deserialize)]
pub struct ListContractsQuery {
    pub client_id: Option<Uuid>,
    pub expiring_soon: Option<bool>,
}

/// Create a new contract
pub async fn create_contract(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(payload): Json<CreateContractRequest>,
) -> impl IntoResponse {
    match state
        .contract_service
        .create_contract(payload, claims.user_id())
        .await
    {
        Ok(contract) => (axum::http::StatusCode::CREATED, Json(contract)).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// Get contract by ID
pub async fn get_contract(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state.contract_service.get_contract(id).await {
        Ok(contract) => Json(contract).into_response(),
        Err(e) => (axum::http::StatusCode::NOT_FOUND, e.to_string()).into_response(),
    }
}

/// List contracts
pub async fn list_contracts(
    State(state): State<AppState>,
    Query(query): Query<ListContractsQuery>,
) -> impl IntoResponse {
    let result = if query.expiring_soon.unwrap_or(false) {
        state.contract_service.list_expiring().await
    } else {
        // TODO: Handle client_id filter if needed
        state.contract_service.list_contracts().await
    };

    match result {
        Ok(contracts) => Json(contracts).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// Update contract
pub async fn update_contract(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateContractRequest>,
) -> impl IntoResponse {
    match state
        .contract_service
        .update_contract(id, payload, claims.user_id())
        .await
    {
        Ok(contract) => Json(contract).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
