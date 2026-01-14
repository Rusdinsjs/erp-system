use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use crate::utils::jwt::{validate_token, Claims};

/// Extract user info from validated token
#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct CurrentUser {
    pub id: Uuid,
    pub email: String,
    pub role: String,
}

impl From<Claims> for CurrentUser {
    fn from(claims: Claims) -> Self {
        Self {
            id: claims.sub,
            email: claims.email,
            role: claims.role,
        }
    }
}

/// Authentication middleware
pub async fn auth_middleware(mut request: Request, next: Next) -> Result<Response, StatusCode> {
    // Get JWT secret from environment
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "your-super-secret-key-change-in-production".to_string());

    // Extract token from Authorization header
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => return Err(StatusCode::UNAUTHORIZED),
    };

    // Validate token
    let token_data = validate_token(token, &jwt_secret).map_err(|_| StatusCode::UNAUTHORIZED)?;

    // Add current user to request extensions
    let current_user = CurrentUser::from(token_data.claims);
    request.extensions_mut().insert(current_user);

    Ok(next.run(request).await)
}

/// Role-based authorization check
#[allow(dead_code)]
pub fn require_role(user: &CurrentUser, allowed_roles: &[&str]) -> Result<(), StatusCode> {
    if allowed_roles.contains(&user.role.as_str()) {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}
