use axum::{
    extract::{Multipart, State},
    Extension, Json,
};

use crate::api::server::AppState;
use crate::application::dto::{ApiResponse, ChangePasswordRequest, UpdateProfileRequest};
use crate::domain::entities::{User, UserClaims as Claims};
use crate::shared::errors::AppError;

pub async fn get_profile(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ApiResponse<User>>, AppError> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;
    let user = state.user_service.get_profile(user_id).await?;
    Ok(Json(ApiResponse::success(user)))
}

pub async fn update_profile(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<Json<ApiResponse<User>>, AppError> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;
    let user = state.user_service.update_profile(user_id, payload).await?;
    Ok(Json(ApiResponse::success(user)))
}

pub async fn change_password(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;
    state.user_service.change_password(user_id, payload).await?;
    Ok(Json(ApiResponse::success(())))
}

pub async fn upload_avatar(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<User>>, AppError> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        let name = field.name().unwrap_or("").to_string();
        if name == "avatar" || name == "file" {
            let filename = field.file_name().unwrap_or("avatar.png").to_string();
            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(e.to_string()))?;

            if data.is_empty() {
                return Err(AppError::BadRequest("Empty file".to_string()));
            }

            let user = state
                .user_service
                .upload_avatar(user_id, filename, data.to_vec())
                .await?;

            return Ok(Json(ApiResponse::success(user)));
        }
    }

    Err(AppError::BadRequest("No avatar file found".to_string()))
}
