//! Explicit Tenant & Company Context Kernel (QTEN-001 & QTEN-002)

use crate::domain::entities::UserClaims;
use crate::domain::errors::{DomainError, DomainResult};
use uuid::Uuid;

/// Explicit Tenant & Company Context carried through handler, service, and repository layers (QTEN-001)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TenantContext {
    pub tenant_id: Uuid,          // Primary Organization / Tenant ID
    pub company_id: Option<Uuid>, // Selected Operating Company ID (if multi-company)
    pub is_super_tenant: bool,    // System / SuperAdmin global scope
}

impl TenantContext {
    pub fn new(tenant_id: Uuid, company_id: Option<Uuid>) -> Self {
        Self {
            tenant_id,
            company_id,
            is_super_tenant: false,
        }
    }

    pub fn super_tenant() -> Self {
        Self {
            tenant_id: Uuid::nil(),
            company_id: None,
            is_super_tenant: true,
        }
    }

    /// Extract mandatory TenantContext from authenticated UserClaims
    pub fn from_claims(claims: &UserClaims) -> DomainResult<Self> {
        if claims.role == "super_admin" || claims.role_level <= 1 {
            let tenant_id = claims
                .org
                .as_deref()
                .and_then(|id| Uuid::parse_str(id).ok())
                .unwrap_or_else(Uuid::nil);
            return Ok(Self {
                tenant_id,
                company_id: None,
                is_super_tenant: true,
            });
        }

        let org_str = claims
            .org
            .as_ref()
            .ok_or_else(|| DomainError::unauthorized("missing_tenant_context"))?;

        let tenant_id =
            Uuid::parse_str(org_str).map_err(|_| DomainError::unauthorized("invalid_tenant_id"))?;

        Ok(Self {
            tenant_id,
            company_id: None,
            is_super_tenant: false,
        })
    }

    /// Enforce cross-tenant boundary isolation check
    pub fn enforce_boundary(&self, target_tenant_id: Uuid) -> DomainResult<()> {
        if self.is_super_tenant {
            return Ok(());
        }
        if self.tenant_id != target_tenant_id {
            return Err(DomainError::unauthorized("cross_tenant_access_denied"));
        }
        Ok(())
    }
}

/// Query Scoping Rule for tenant isolation and soft-delete filtering (QTEN-002)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QueryScope {
    pub tenant_ctx: TenantContext,
    pub include_deleted: bool,
}

impl QueryScope {
    pub fn new(tenant_ctx: TenantContext) -> Self {
        Self {
            tenant_ctx,
            include_deleted: false,
        }
    }

    pub fn with_include_deleted(mut self, include_deleted: bool) -> Self {
        self.include_deleted = include_deleted;
        self
    }

    /// Default SQL filter clause builder for repositories
    pub fn build_where_clause(&self, table_alias: Option<&str>) -> String {
        let prefix = table_alias.map(|a| format!("{}.", a)).unwrap_or_default();
        let mut clauses = Vec::new();

        if !self.include_deleted {
            clauses.push(format!("{}deleted_at IS NULL", prefix));
        }

        if !self.tenant_ctx.is_super_tenant {
            clauses.push(format!("{}organization_id = $1", prefix));
        }

        if clauses.is_empty() {
            "1=1".to_string()
        } else {
            clauses.join(" AND ")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normal_user_tenant_boundary_enforcement() {
        let tenant_a = Uuid::new_v4();
        let tenant_b = Uuid::new_v4();

        let ctx_a = TenantContext::new(tenant_a, None);

        // Same tenant access succeeds
        assert!(ctx_a.enforce_boundary(tenant_a).is_ok());

        // Cross tenant access fails
        let cross_res = ctx_a.enforce_boundary(tenant_b);
        assert!(cross_res.is_err());
        if let Err(DomainError::Unauthorized { action }) = cross_res {
            assert_eq!(action, "cross_tenant_access_denied");
        } else {
            panic!("Expected Unauthorized error");
        }
    }

    #[test]
    fn test_super_tenant_bypasses_boundary() {
        let super_ctx = TenantContext::super_tenant();
        let target_tenant = Uuid::new_v4();

        assert!(super_ctx.enforce_boundary(target_tenant).is_ok());
    }

    #[test]
    fn test_query_scope_sql_clause_generation() {
        let tenant_id = Uuid::new_v4();
        let ctx = TenantContext::new(tenant_id, None);

        // Standard query scope: deleted_at IS NULL AND organization_id = $1
        let scope = QueryScope::new(ctx.clone());
        let clause = scope.build_where_clause(Some("a"));
        assert_eq!(clause, "a.deleted_at IS NULL AND a.organization_id = $1");

        // Audit path with deleted records included
        let audit_scope = scope.with_include_deleted(true);
        let audit_clause = audit_scope.build_where_clause(Some("a"));
        assert_eq!(audit_clause, "a.organization_id = $1");

        // Super tenant audit scope
        let super_audit_scope =
            QueryScope::new(TenantContext::super_tenant()).with_include_deleted(true);
        assert_eq!(super_audit_scope.build_where_clause(None), "1=1");
    }
}
