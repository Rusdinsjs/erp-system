use crate::api::server::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use management_system_core::domain::metadata_kernel::StorageStrategy;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct RegisterEntityRequest {
    pub name: String,
    pub module: String,
    pub storage_strategy: StorageStrategy,
    pub is_custom: bool,
}

#[derive(Deserialize)]
pub struct AddCustomFieldRequest {
    pub field_name: String,
    pub label: String,
    pub data_type: String,
    pub is_required: bool,
}

pub async fn register_entity_type(
    State(state): State<AppState>,
    Json(payload): Json<RegisterEntityRequest>,
) -> impl IntoResponse {
    match state
        .metadata_service
        .register_entity_type(
            &payload.name,
            &payload.module,
            payload.storage_strategy,
            payload.is_custom,
        )
        .await
    {
        Ok(entity) => (StatusCode::CREATED, Json(entity)).into_response(),
        Err(e) => {
            let error_response = serde_json::json!({ "error": e });
            (StatusCode::BAD_REQUEST, Json(error_response)).into_response()
        }
    }
}

pub async fn get_entity_bundle(
    State(state): State<AppState>,
    Path(entity_name): Path<String>,
) -> impl IntoResponse {
    match state.metadata_service.get_entity_bundle(&entity_name).await {
        Ok(bundle) => (StatusCode::OK, Json(bundle)).into_response(),
        Err(e) => {
            let error_response = serde_json::json!({ "error": e });
            (StatusCode::NOT_FOUND, Json(error_response)).into_response()
        }
    }
}

pub async fn add_custom_field(
    State(state): State<AppState>,
    Path(entity_name): Path<String>,
    Json(payload): Json<AddCustomFieldRequest>,
) -> impl IntoResponse {
    match state
        .metadata_service
        .add_custom_field(
            &entity_name,
            &payload.field_name,
            &payload.label,
            &payload.data_type,
            payload.is_required,
        )
        .await
    {
        Ok(field) => (StatusCode::CREATED, Json(field)).into_response(),
        Err(e) => {
            let error_response = serde_json::json!({ "error": e });
            (StatusCode::BAD_REQUEST, Json(error_response)).into_response()
        }
    }
}

pub async fn remove_custom_field(
    State(state): State<AppState>,
    Path((_entity_name, field_id)): Path<(String, Uuid)>,
) -> impl IntoResponse {
    match state.metadata_service.remove_field(field_id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => {
            let error_response = serde_json::json!({ "error": e });
            (StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)).into_response()
        }
    }
}
