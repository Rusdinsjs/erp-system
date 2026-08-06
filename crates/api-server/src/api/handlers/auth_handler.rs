//! Auth Handler

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::api::server::AppState;
use management_system_core::shared::errors::AppError;

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
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
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
    let email_clean = payload.email.trim().to_lowercase();

    // QSEC-009: Check lockout status before proceeding with authentication
    if let Err(msg) = state.lockout_tracker.check_lockout(&email_clean).await {
        tracing::warn!("SECURITY AUDIT LOGIN_BLOCKED: Email={} Reason=AccountLocked", email_clean);
        return Err(AppError::Forbidden(msg));
    }

    // Attempt authentication
    match state.auth_service.login(&email_clean, &payload.password).await {
        Ok((user, token)) => {
            state.lockout_tracker.record_success(&email_clean).await;

            tracing::info!(
                "SECURITY AUDIT LOGIN_SUCCESS: Email={} UserID={} Role={}",
                user.email,
                user.id,
                user.role
            );

            Ok(Json(LoginResponse {
                success: true,
                token,
                user: UserInfo {
                    id: user.id.to_string(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    phone: user.phone,
                    avatar_url: user.avatar_url,
                },
            }))
        }
        Err(err) => {
            let (count, is_locked) = state.lockout_tracker.record_failed_attempt(&email_clean).await;
            tracing::warn!(
                "SECURITY AUDIT LOGIN_FAILED: Email={} FailedCount={} Locked={} Error={:?}",
                email_clean,
                count,
                is_locked,
                err
            );
            Err(AppError::Domain(err))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/auth/register",
    request_body = management_system_core::application::dto::user_dto::CreateUserRequest,
    responses(
        (status = 201, description = "User created", body = management_system_core::domain::entities::User),
        (status = 400, description = "Bad Request")
    ),
    tag = "auth"
)]
pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<management_system_core::application::dto::user_dto::CreateUserRequest>,
) -> Result<(axum::http::StatusCode, Json<management_system_core::domain::entities::User>), AppError> {
    if !state.allow_public_registration {
        return Err(AppError::Forbidden(
            "Public self-registration is disabled in production. Please contact an administrator for an invitation.".to_string(),
        ));
    }

    let user = state
        .auth_service
        .register(&payload.email, &payload.password, &payload.name)
        .await?;

    Ok((axum::http::StatusCode::CREATED, Json(user)))
}
