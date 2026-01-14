use crate::api::server::AppState;
use crate::application::dto::{ApiResponse, CreateConversionRequest, ExecuteConversionRequest};
use crate::domain::entities::user::UserClaims;
use crate::shared::errors::AppError;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use uuid::Uuid;

/// Create a conversion request
pub async fn create_conversion_request(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(asset_id): Path<Uuid>, // We might not need this if it's in body, but RESTful
    Json(payload): Json<CreateConversionRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Ensure payload asset_id matches path
    if payload.asset_id != asset_id {
        return Err(AppError::BadRequest("Asset ID mismatch".into()));
    }

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let conversion = state
        .conversion_service
        .create_request(payload, user_id)
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            conversion,
            "Conversion request created",
        )),
    )
        .into_response())
}

/// Get pending conversion requests
pub async fn get_pending_conversions(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let conversions = state.conversion_service.get_pending_requests().await?;

    Ok((StatusCode::OK, Json(ApiResponse::success(conversions))).into_response())
}

/// Get conversion requests for an asset
pub async fn get_asset_conversions(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let conversions = state
        .conversion_service
        .get_asset_conversions(asset_id)
        .await?;

    Ok((StatusCode::OK, Json(ApiResponse::success(conversions))).into_response())
}

/// Get a single conversion request
pub async fn get_conversion(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let conversion = state.conversion_service.get_conversion(id).await?;
    Ok((StatusCode::OK, Json(ApiResponse::success(conversion))).into_response())
}

/// Reject a conversion request
pub async fn reject_conversion(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let _user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let conversion = state.conversion_service.reject_request(id).await?;

    Ok((
        StatusCode::OK,
        Json(ApiResponse::success_with_message(
            conversion,
            "Conversion request rejected",
        )),
    )
        .into_response())
}

/// Approve a conversion request
pub async fn approve_conversion(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let conversion = state
        .conversion_service
        .approve_request(id, user_id)
        .await?;

    Ok((
        StatusCode::OK,
        Json(ApiResponse::success_with_message(
            conversion,
            "Conversion request approved",
        )),
    )
        .into_response())
}

/// Execute a conversion request
pub async fn execute_conversion(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ExecuteConversionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let conversion = state
        .conversion_service
        .execute_conversion(id, user_id, payload)
        .await?;

    Ok((
        StatusCode::OK,
        Json(ApiResponse::success_with_message(
            conversion,
            "Conversion executed successfully",
        )),
    )
        .into_response())
}
