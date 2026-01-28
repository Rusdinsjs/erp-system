use axum::{
    extract::State,
    response::{IntoResponse, Json},
};

use crate::api::server::AppState;
use crate::shared::errors::AppError;

pub async fn get_monthly_maintenance_trends(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let trends = state
        .analytics_service
        .get_monthly_maintenance_trends()
        .await?;
    Ok(Json(trends))
}

pub async fn get_asset_condition_distribution(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let stats = state
        .analytics_service
        .get_asset_condition_distribution()
        .await?;
    Ok(Json(stats))
}

pub async fn get_asset_status_distribution(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let stats = state
        .analytics_service
        .get_asset_status_distribution()
        .await?;
    Ok(Json(stats))
}
