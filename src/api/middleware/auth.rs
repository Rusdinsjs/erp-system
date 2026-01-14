//! Auth Middleware

use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};

use crate::domain::entities::UserClaims;
use crate::shared::utils::jwt::{decode_token, JwtConfig};

/// Auth middleware
pub async fn auth_middleware(mut request: Request, next: Next) -> Result<Response, StatusCode> {
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let config = JwtConfig::from_env();

    let _claims: UserClaims = decode_token(token, &config).map_err(|_| StatusCode::UNAUTHORIZED)?;

    request.extensions_mut().insert(_claims);

    Ok(next.run(request).await)
}
