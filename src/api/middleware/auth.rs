//! Auth Middleware

use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};

use crate::api::server::AppState;
use crate::domain::entities::UserClaims;
use crate::shared::utils::jwt::{decode_token, JwtConfig};

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

    let _claims: UserClaims = decode_token(token, &config).map_err(|e| {
        tracing::error!("Auth Middleware Decode Error: {:?}", e);
        StatusCode::UNAUTHORIZED
    })?;

    request.extensions_mut().insert(_claims);

    Ok(next.run(request).await)
}
