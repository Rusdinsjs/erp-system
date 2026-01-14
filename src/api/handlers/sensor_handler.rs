//! Sensor Handler

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::ApiResponse;
use crate::domain::entities::SensorReading;
use crate::infrastructure::repositories::{SensorAlert, SensorThreshold};
use crate::shared::errors::AppError;

#[derive(Deserialize)]
pub struct SensorReadingPayload {
    pub sensor_id: String,
    pub temperature: Option<f64>,
    pub humidity: Option<f64>,
    pub vibration_x: Option<f64>,
    pub vibration_y: Option<f64>,
    pub vibration_z: Option<f64>,
    pub pressure: Option<f64>,
    pub power_consumption: Option<f64>,
    pub custom_value: Option<f64>,
    pub unit: Option<String>,
}

#[derive(Deserialize)]
pub struct ThresholdPayload {
    pub sensor_type: String,
    pub min_value: Option<f64>,
    pub max_value: Option<f64>,
    pub warning_min: Option<f64>,
    pub warning_max: Option<f64>,
}

#[derive(Deserialize)]
pub struct DateRangeParams {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub sensor_id: String,
}

pub async fn record_reading(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
    Json(payload): Json<SensorReadingPayload>,
) -> Result<StatusCode, AppError> {
    let mut reading = SensorReading::new(asset_id, payload.sensor_id);
    reading.temperature = payload.temperature;
    reading.humidity = payload.humidity;
    reading.vibration_x = payload.vibration_x;
    reading.vibration_y = payload.vibration_y;
    reading.vibration_z = payload.vibration_z;
    reading.pressure = payload.pressure;
    reading.power_consumption = payload.power_consumption;
    reading.custom_value = payload.custom_value;
    reading.unit = payload.unit;

    state.sensor_service.record_reading(reading).await?;
    Ok(StatusCode::CREATED)
}

pub async fn get_latest_readings(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
) -> Result<Json<Vec<SensorReading>>, AppError> {
    let readings = state
        .sensor_service
        .get_latest_readings(asset_id, 100)
        .await?;
    Ok(Json(readings))
}

pub async fn get_readings_in_range(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
    Query(params): Query<DateRangeParams>,
) -> Result<Json<Vec<SensorReading>>, AppError> {
    let readings = state
        .sensor_service
        .get_readings_in_range(asset_id, &params.sensor_id, params.start, params.end)
        .await?;
    Ok(Json(readings))
}

pub async fn set_threshold(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
    Json(payload): Json<ThresholdPayload>,
) -> Result<Json<ApiResponse<SensorThreshold>>, AppError> {
    let threshold = state
        .sensor_service
        .set_threshold(
            asset_id,
            &payload.sensor_type,
            payload.min_value,
            payload.max_value,
            payload.warning_min,
            payload.warning_max,
        )
        .await?;
    Ok(Json(ApiResponse::success(threshold)))
}

pub async fn list_active_alerts(
    State(state): State<AppState>,
) -> Result<Json<Vec<SensorAlert>>, AppError> {
    let alerts = state.sensor_service.list_active_alerts(None).await?;
    Ok(Json(alerts))
}

pub async fn acknowledge_alert(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    // TODO: Get user from auth context
    let user_id = Uuid::new_v4();
    state.sensor_service.acknowledge_alert(id, user_id).await?;
    Ok(Json(ApiResponse::success_with_message(
        (),
        "Alert acknowledged",
    )))
}
