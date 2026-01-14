use crate::api::server::AppState;
use crate::application::services::analytics_service::AssetRoiResponse;
use crate::shared::errors::AppError;
use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

pub async fn get_asset_roi(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
) -> Result<Json<AssetRoiResponse>, AppError> {
    let result = state.analytics_service.get_asset_roi(asset_id).await?;
    Ok(Json(result))
}
