use crate::api::server::AppState;
use crate::domain::entities::Location;
use axum::{
    extract::{Path, State},
    response::Json,
};
use serde_json::json;
use uuid::Uuid;

// Helper to map errors
fn internal_error<E>(err: E) -> (axum::http::StatusCode, Json<serde_json::Value>)
where
    E: std::fmt::Display,
{
    tracing::error!("Internal Server Error: {}", err);
    (
        axum::http::StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "error": err.to_string() })),
    )
}

pub async fn list_locations(
    State(state): State<AppState>,
) -> Result<Json<Vec<Location>>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let locations = state
        .location_service
        .list_locations()
        .await
        .map_err(internal_error)?;
    Ok(Json(locations))
}

pub async fn get_location(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Location>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let location = state
        .location_service
        .get_location(id)
        .await
        .map_err(internal_error)?;

    match location {
        Some(loc) => Ok(Json(loc)),
        None => Err((
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({ "error": "Location not found" })),
        )),
    }
}

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CreateLocationRequest {
    pub parent_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub location_type: String,
    pub address: Option<String>,
    pub latitude: Option<String>,
    pub longitude: Option<String>,
    pub capacity: Option<i32>,
}

pub async fn create_location(
    State(state): State<AppState>,
    Json(payload): Json<CreateLocationRequest>,
) -> Result<Json<Location>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let location = Location {
        id: Uuid::new_v4(),
        parent_id: payload.parent_id,
        code: payload.code,
        name: payload.name,
        location_type: Some(payload.location_type),
        address: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
        capacity: payload.capacity,
        current_count: Some(0),
        qr_code: None,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    let created = state
        .location_service
        .create_location(location)
        .await
        .map_err(internal_error)?;
    Ok(Json(created))
}

pub async fn update_location(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateLocationRequest>,
) -> Result<Json<Location>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    // For update, we might need to fetch existing first to keep created_at, or just overwrite.
    // Simplifying by trusting payload, but ideally should merge.
    // Since service takes `Location`, let's check if we can get existing.

    let mut location = state
        .location_service
        .get_location(id)
        .await
        .map_err(internal_error)?
        .ok_or((
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({ "error": "Location not found" })),
        ))?;

    location.parent_id = payload.parent_id;
    location.code = payload.code;
    location.name = payload.name;
    location.location_type = Some(payload.location_type);
    location.address = payload.address;
    location.latitude = payload.latitude;
    location.longitude = payload.longitude;
    location.capacity = payload.capacity;
    // Keep id, created_at, current_count

    let updated = state
        .location_service
        .update_location(location)
        .await
        .map_err(internal_error)?;
    Ok(Json(updated))
}

pub async fn delete_location(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    state
        .location_service
        .delete_location(id)
        .await
        .map_err(internal_error)?;
    Ok(Json(json!({ "message": "Location deleted" })))
}

pub async fn get_location_hierarchy(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let hierarchy = state
        .location_service
        .get_hierarchy()
        .await
        .map_err(internal_error)?;
    Ok(Json(hierarchy))
}
