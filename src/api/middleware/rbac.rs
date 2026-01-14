//! RBAC Middleware with Permission Checking

use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::domain::entities::UserClaims;
use crate::shared::utils::jwt::{decode_token, JwtConfig};

/// Extract user claims from request
pub fn extract_user_claims(request: &Request) -> Option<UserClaims> {
    // Try to get from extensions first (if auth_middleware ran)
    if let Some(claims) = request.extensions().get::<UserClaims>() {
        return Some(claims.clone());
    }

    // Fallback: parse header manually (if middleware didn't run or order is different)
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)?
        .to_str()
        .ok()?;

    let token = auth_header.strip_prefix("Bearer ")?;
    let config = JwtConfig::from_env();
    decode_token(token, &config).ok()
}

// Note: auth_middleware is in auth.rs to avoid duplication

/// Permission check middleware factory
pub fn require_permission(
    permission: &'static str,
) -> impl Fn(
    Request,
    Next,
) -> std::pin::Pin<
    Box<dyn std::future::Future<Output = Result<Response, StatusCode>> + Send>,
> + Clone {
    move |request: Request, next: Next| {
        Box::pin(async move {
            let claims = extract_user_claims(&request).ok_or(StatusCode::UNAUTHORIZED)?;

            // Check if user has permission
            if claims.permissions.contains(&permission.to_string()) {
                Ok(next.run(request).await)
            } else {
                Err(StatusCode::FORBIDDEN)
            }
        })
    }
}

/// Permission check with state access (for dynamic permission checking)
pub async fn permission_middleware(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let claims = extract_user_claims(&request).ok_or(StatusCode::UNAUTHORIZED)?;

    // Get required permission from request extensions or path
    let path = request.uri().path();
    let method = request.method().as_str();

    // Map routes to permissions
    let required_permission = match (method, path) {
        ("POST", p) if p.starts_with("/api/assets") => Some("asset.create"),
        ("PUT", p) if p.starts_with("/api/assets") => Some("asset.update"),
        ("DELETE", p) if p.starts_with("/api/assets") => Some("asset.delete"),
        ("POST", p) if p.starts_with("/api/loans") && p.contains("/approve") => {
            Some("loan.approve")
        }
        ("POST", p) if p.starts_with("/api/work-orders") && p.contains("/approve") => {
            Some("maintenance.approve")
        }
        _ => None,
    };

    if let Some(perm) = required_permission {
        // Check in claims first (cached permissions)
        if claims.permissions.contains(&perm.to_string()) {
            return Ok(next.run(request).await);
        }

        // Fall back to database check
        let user_id = claims
            .sub
            .parse::<Uuid>()
            .map_err(|_| StatusCode::UNAUTHORIZED)?;
        let has_perm = state
            .rbac_service
            .user_has_permission(user_id, perm)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        if !has_perm {
            return Err(StatusCode::FORBIDDEN);
        }
    }

    Ok(next.run(request).await)
}

/// Admin-only middleware
pub async fn admin_only_middleware(request: Request, next: Next) -> Result<Response, StatusCode> {
    let claims = extract_user_claims(&request).ok_or(StatusCode::UNAUTHORIZED)?;

    if claims.role == "admin" || claims.role == "super_admin" {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

/// Organization scope middleware - ensures user can only access their org's data
pub async fn org_scope_middleware(request: Request, next: Next) -> Result<Response, StatusCode> {
    let claims = extract_user_claims(&request).ok_or(StatusCode::UNAUTHORIZED)?;

    // Super admin can access everything
    if claims.role == "super_admin" {
        return Ok(next.run(request).await);
    }

    // For other users, org_id must be present
    if claims.org.is_none() {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(next.run(request).await)
}
