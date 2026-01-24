use axum::{
    extract::State,
    response::{IntoResponse, Json},
};

use crate::api::server::AppState;
use crate::shared::errors::AppError;

pub async fn get_cost_analytics(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let costs = state.report_service.get_monthly_costs().await?;

    Ok(Json(costs))
}

pub async fn get_asset_status_distribution(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let stats = state.report_service.get_asset_status_distribution().await?;

    Ok(Json(stats))
}
