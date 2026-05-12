use crate::api::server::AppState;
use crate::application::dto::common::ApiResponse;
use crate::domain::entities::setting::{Setting, UpdateSettingRequest};
use crate::domain::entities::user::User;
use crate::shared::errors::AppError;
use axum::{
    extract::{Path, State},
    Extension, Json,
};

/// List all settings (Admin Only)
#[utoipa::path(
    get,
    path = "/api/settings",
    tag = "Settings",
    responses(
        (status = 200, description = "List of all settings", body = ApiResponse<Vec<Setting>>)
    ),
    security(
        ("jwt" = [])
    )
)]
pub async fn get_all_settings(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<Setting>>>, AppError> {
    let settings = state.settings_service.list_settings().await?;

    Ok(Json(ApiResponse {
        success: true,
        message: None,
        data: Some(settings),
    }))
}

/// Update a setting (Admin Only)
#[utoipa::path(
    put,
    path = "/api/settings/{key}",
    tag = "Settings",
    params(
        ("key" = String, Path, description = "Setting Key (e.g. app_name)")
    ),
    request_body = UpdateSettingRequest,
    responses(
        (status = 200, description = "Setting updated successfully", body = ApiResponse<Setting>)
    ),
    security(
        ("jwt" = [])
    )
)]
pub async fn update_setting(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Path(key): Path<String>,
    Json(payload): Json<UpdateSettingRequest>,
) -> Result<Json<ApiResponse<Setting>>, AppError> {
    let setting = state
        .settings_service
        .update_setting(&key, payload.value, payload.description, user.id)
        .await?;

    Ok(Json(ApiResponse {
        success: true,
        message: Some("Setting updated successfully".to_string()),
        data: Some(setting),
    }))
}

/// Get public settings (No Auth)
#[utoipa::path(
    get,
    path = "/api/public-settings",
    tag = "Settings",
    responses(
        (status = 200, description = "Public configuration", body = ApiResponse<serde_json::Value>)
    )
)]
pub async fn get_public_settings(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let config = state.settings_service.get_public_settings().await?;

    Ok(Json(ApiResponse {
        success: true,
        message: None,
        data: Some(config),
    }))
}
