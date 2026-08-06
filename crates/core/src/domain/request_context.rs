//! Immutable Request Execution Context (QTEN-003)
//!
//! Encapsulates authenticated user, session, tenant/site, active company,
//! locale/timezone, and request correlation ID across request execution bounds.

use uuid::Uuid;
use crate::domain::entities::UserClaims;
use crate::domain::tenant::TenantContext;
use crate::domain::errors::{DomainError, DomainResult};

/// Immutable Request Execution Context carried through handler, service, and repository parameters (QTEN-003)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestContext {
    pub user_id: Uuid,
    pub role: String,
    pub role_level: i32,
    pub session_id: Option<Uuid>,
    pub tenant_context: TenantContext,
    pub active_company_id: Option<Uuid>,
    pub locale: String,
    pub timezone: String,
    pub correlation_id: String,
}

impl RequestContext {
    pub fn new(
        claims: &UserClaims,
        tenant_context: TenantContext,
        active_company_id: Option<Uuid>,
        locale: Option<String>,
        timezone: Option<String>,
        correlation_id: Option<String>,
    ) -> DomainResult<Self> {
        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| DomainError::unauthorized("invalid_user_id"))?;

        let session_id = Uuid::parse_str(&claims.jti).ok();

        let final_correlation_id = correlation_id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let final_locale = locale.unwrap_or_else(|| "id-ID".to_string());
        let final_timezone = timezone.unwrap_or_else(|| "Asia/Jakarta".to_string());

        Ok(Self {
            user_id,
            role: claims.role.clone(),
            role_level: claims.role_level,
            session_id,
            tenant_context,
            active_company_id,
            locale: final_locale,
            timezone: final_timezone,
            correlation_id: final_correlation_id,
        })
    }

    /// Enforce mandatory active company context for company-scoped business operations
    pub fn require_active_company(&self) -> DomainResult<Uuid> {
        if let Some(company_id) = self.active_company_id {
            Ok(company_id)
        } else {
            Err(DomainError::unauthorized("missing_active_company_context"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_request_context_creation_and_company_enforcement() {
        let user_id = Uuid::new_v4();
        let org_id = Uuid::new_v4();
        let company_id = Uuid::new_v4();

        let claims = UserClaims {
            sub: user_id.to_string(),
            email: "user@example.com".to_string(),
            name: "Test User".to_string(),
            role: "manager".to_string(),
            role_level: 3,
            department: None,
            allowed_asset_group: None,
            org: Some(org_id.to_string()),
            employee_id: None,
            permissions: vec![],
            exp: Utc::now().timestamp() + 3600,
            iat: Utc::now().timestamp(),
            jti: Uuid::new_v4().to_string(),
        };

        let tenant_ctx = TenantContext::from_claims(&claims).unwrap();

        // 1. Without active company -> require_active_company fails
        let ctx_no_company = RequestContext::new(
            &claims,
            tenant_ctx.clone(),
            None,
            None,
            None,
            Some("corr-123".to_string()),
        )
        .unwrap();

        assert_eq!(ctx_no_company.correlation_id, "corr-123");
        assert!(ctx_no_company.require_active_company().is_err());

        // 2. With active company -> require_active_company succeeds
        let ctx_with_company = RequestContext::new(
            &claims,
            tenant_ctx,
            Some(company_id),
            Some("id-ID".to_string()),
            Some("Asia/Jakarta".to_string()),
            None,
        )
        .unwrap();

        assert_eq!(ctx_with_company.require_active_company().unwrap(), company_id);
    }
}
