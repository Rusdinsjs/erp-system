//! Auth Middleware

use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};

use crate::api::server::AppState;
use management_system_core::domain::entities::UserClaims;
use management_system_core::shared::utils::jwt::decode_token;

/// Auth middleware
pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let config = &state.jwt_config;

    let claims: UserClaims = decode_token(token, config).map_err(|e| {
        tracing::error!("Auth Middleware Decode Error: {:?}", e);
        StatusCode::UNAUTHORIZED
    })?;

    // QSEC-008: Check JTI token revocation & user session invalidation (e.g. role mutation)
    if state.session_tracker.is_jti_revoked(&claims.jti).await {
        tracing::warn!("Auth Middleware: Blocked revoked JTI token: {}", claims.jti);
        return Err(StatusCode::UNAUTHORIZED);
    }

    if state
        .session_tracker
        .is_user_token_invalidated(claims.user_id(), claims.iat)
        .await
    {
        tracing::warn!(
            "Auth Middleware: Blocked token for user {} invalidated by role/security mutation",
            claims.sub
        );
        return Err(StatusCode::UNAUTHORIZED);
    }

    request.extensions_mut().insert(claims);

    Ok(next.run(request).await)
}
