//! Tenant Middleware (QTEN-001)

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use management_system_core::domain::entities::UserClaims;
use management_system_core::domain::tenant::TenantContext;

/// Tenant middleware: extracts mandatory TenantContext from UserClaims and X-Company-ID header
pub async fn tenant_middleware(
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let claims = request
        .extensions()
        .get::<UserClaims>()
        .cloned()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let mut tenant_ctx = TenantContext::from_claims(&claims).map_err(|e| {
        tracing::warn!("Tenant Middleware Error: {:?}", e);
        StatusCode::UNAUTHORIZED
    })?;

    // Optional X-Company-ID header extraction for multi-company context
    if let Some(company_header) = request.headers().get("x-company-id") {
        if let Ok(company_str) = company_header.to_str() {
            if let Ok(company_uuid) = Uuid::parse_str(company_str) {
                tenant_ctx.company_id = Some(company_uuid);
            }
        }
    }

    request.extensions_mut().insert(tenant_ctx);

    Ok(next.run(request).await)
}
