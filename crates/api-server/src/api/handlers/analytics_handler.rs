use axum::{
    extract::State,
    response::{IntoResponse, Response, Json},
};

use crate::api::server::AppState;
use management_system_core::shared::errors::AppError;

pub async fn get_monthly_maintenance_trends(
    State(state): State<AppState>,
) -> Result<Response, AppError> {
    let trends = state
        .analytics_service
        .get_monthly_maintenance_trends()
        .await?;
    Ok(Json(trends).into_response())
}

pub async fn get_asset_condition_distribution(
    State(state): State<AppState>,
) -> Result<Response, AppError> {
    let stats = state
        .analytics_service
        .get_asset_condition_distribution()
        .await?;
    Ok(Json(stats).into_response())
}

pub async fn get_asset_status_distribution(
    State(state): State<AppState>,
) -> Result<Response, AppError> {
    let stats = state
        .analytics_service
        .get_asset_status_distribution()
        .await?;
    Ok(Json(stats).into_response())
}
