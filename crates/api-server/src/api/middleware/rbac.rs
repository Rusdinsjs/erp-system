//! RBAC Middleware with Permission Checking

use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};
use management_system_core::domain::entities::UserClaims;
use management_system_core::shared::utils::jwt::{decode_token, JwtConfig};

/// Extract user claims from request
pub fn extract_user_claims(request: &Request) -> Option<UserClaims> {
    // Try to get from extensions first (if auth_middleware ran)
    if let Some(claims) = request.extensions().get::<UserClaims>() {
        tracing::debug!("Found claims in extensions: {:?}", claims.sub);
        return Some(claims.clone());
    } else {
        tracing::warn!("No claims in extensions!");
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

            // Check if user has permission (supporting wildcards and view/read, edit/update aliases)
            let has_permission = claims.permissions.iter().any(|p| {
                if *p == "*" || *p == permission {
                    return true;
                }
                if let Some(prefix) = p.strip_suffix(".*") {
                    if permission.starts_with(prefix) {
                        return true;
                    }
                }
                // Support aliases between .view/.read and .edit/.update
                let norm_user = p.replace(".view", ".read").replace(".edit", ".update");
                let norm_req = permission
                    .replace(".view", ".read")
                    .replace(".edit", ".update");
                norm_user == norm_req
            });

            if has_permission {
                Ok(next.run(request).await)
            } else {
                tracing::warn!(
                    "Permission denied. Required: {}, User Has: {:?}",
                    permission,
                    claims.permissions
                );

                let body = serde_json::json!({
                    "error": format!("Permission denied: {}", permission),
                    "code": "FORBIDDEN"
                });

                let response = axum::response::Response::builder()
                    .status(StatusCode::FORBIDDEN)
                    .header(axum::http::header::CONTENT_TYPE, "application/json")
                    .body(axum::body::Body::from(
                        serde_json::to_string(&body).unwrap(),
                    ))
                    .unwrap();

                Ok(response)
            }
        })
    }
}

/// Admin-only middleware
pub async fn admin_only_middleware(request: Request, next: Next) -> Result<Response, StatusCode> {
    let claims = extract_user_claims(&request).ok_or(StatusCode::UNAUTHORIZED)?;

    if claims.role == "admin"
        || claims.role == "super_admin"
        || claims.role.starts_with("admin_")
        || claims.role_level <= 2
    {
        Ok(next.run(request).await)
    } else {
        let body = serde_json::json!({
            "error": "Admin access required",
            "code": "FORBIDDEN_ADMIN"
        });

        let response = axum::response::Response::builder()
            .status(StatusCode::FORBIDDEN)
            .header(axum::http::header::CONTENT_TYPE, "application/json")
            .body(axum::body::Body::from(
                serde_json::to_string(&body).unwrap(),
            ))
            .unwrap();

        Ok(response)
    }
}
