//! Request Execution Context Middleware (QTEN-003)

use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};
use uuid::Uuid;

use management_system_core::domain::entities::UserClaims;
use management_system_core::domain::request_context::RequestContext;
use management_system_core::domain::tenant::TenantContext;

/// Request Context Middleware: builds immutable RequestContext for downstream handlers & services
pub async fn request_context_middleware(
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let claims = request
        .extensions()
        .get::<UserClaims>()
        .cloned()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let tenant_ctx = request
        .extensions()
        .get::<TenantContext>()
        .cloned()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let correlation_id = request
        .headers()
        .get("x-correlation-id")
        .or_else(|| request.headers().get("x-request-id"))
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let active_company_id = request
        .headers()
        .get("x-company-id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .or(tenant_ctx.company_id);

    let locale = request
        .headers()
        .get("accept-language")
        .or_else(|| request.headers().get("x-locale"))
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    let timezone = request
        .headers()
        .get("x-timezone")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    let req_ctx = RequestContext::new(
        &claims,
        tenant_ctx,
        active_company_id,
        locale,
        timezone,
        Some(correlation_id),
    )
    .map_err(|e| {
        tracing::warn!("RequestContext Middleware Error: {:?}", e);
        StatusCode::UNAUTHORIZED
    })?;

    request.extensions_mut().insert(req_ctx);

    Ok(next.run(request).await)
}
