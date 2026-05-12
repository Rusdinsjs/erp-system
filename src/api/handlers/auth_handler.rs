//! Auth Handler

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::api::server::AppState;
use crate::shared::errors::AppError;

use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct LoginRequest {
    #[schema(example = "admin@example.com")]
    pub email: String,
    #[schema(example = "password")]
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct LoginResponse {
    pub success: bool,
    pub token: String,
    pub user: UserInfo,
}

#[derive(Serialize, ToSchema)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
}

#[utoipa::path(
    post,
    path = "/api/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = LoginResponse),
        (status = 401, description = "Unauthorized")
    ),
    tag = "auth"
)]
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

#[utoipa::path(
    post,
    path = "/api/auth/register",
    request_body = crate::application::dto::user_dto::CreateUserRequest,
    responses(
        (status = 201, description = "User created", body = crate::domain::entities::User),
        (status = 400, description = "Bad Request")
    ),
    tag = "auth"
)]
pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<crate::application::dto::user_dto::CreateUserRequest>,
) -> Result<(axum::http::StatusCode, Json<crate::domain::entities::User>), AppError> {
    let user = state
        .auth_service
        .register(&payload.email, &payload.password, &payload.name)
        .await?;

    Ok((axum::http::StatusCode::CREATED, Json(user)))
}
