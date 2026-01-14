//! Auth Handler

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::api::server::AppState;
use crate::shared::errors::AppError;

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub token: String,
    pub user: UserInfo,
}

#[derive(Serialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    let (user, token) = state
        .auth_service
        .login(&payload.email, &payload.password)
        .await?;

    Ok(Json(LoginResponse {
        success: true,
        token,
        user: UserInfo {
            id: user.id.to_string(),
            email: user.email,
            name: user.name,
            role: user.role,
        },
    }))
}
