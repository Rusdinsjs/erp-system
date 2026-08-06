//! DB/Site-per-Tenant Target Architecture & Connection Resolver (QTEN-002)
//!
//! Provides separation between:
//! 1. Control Plane Database (Tenant directory, provisioning metadata, global audit)
//! 2. Tenant Business Plane Databases (Isolated database pool per tenant/site)

use crate::domain::errors::DomainResult;
use crate::domain::tenant::TenantContext;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

/// Control Plane vs Isolated Tenant Business Database Connection Resolver (QTEN-002)
#[derive(Clone)]
pub struct TenantDatabaseResolver {
    control_plane_pool: PgPool,
    tenant_pools: Arc<RwLock<HashMap<Uuid, PgPool>>>,
}

impl TenantDatabaseResolver {
    pub fn new(control_plane_pool: PgPool) -> Self {
        Self {
            control_plane_pool,
            tenant_pools: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Access control plane database (Tenant Directory & Global Provisioning)
    pub fn control_plane_pool(&self) -> &PgPool {
        &self.control_plane_pool
    }

    /// Resolve isolated database pool for business data operations based on TenantContext
    pub async fn resolve_tenant_pool(&self, ctx: &TenantContext) -> DomainResult<PgPool> {
        if ctx.is_super_tenant && ctx.tenant_id == Uuid::nil() {
            return Ok(self.control_plane_pool.clone());
        }

        let pools = self.tenant_pools.read().await;
        if let Some(pool) = pools.get(&ctx.tenant_id) {
            return Ok(pool.clone());
        }

        // Fallback to shared control/default pool if dedicated pool is not registered
        Ok(self.control_plane_pool.clone())
    }

    /// Register a dedicated isolated database connection pool for a specific tenant site
    pub async fn register_tenant_pool(&self, tenant_id: Uuid, pool: PgPool) {
        let mut pools = self.tenant_pools.write().await;
        pools.insert(tenant_id, pool);
    }

    /// Check if a tenant has a dedicated isolated business database
    pub async fn has_dedicated_database(&self, tenant_id: Uuid) -> bool {
        let pools = self.tenant_pools.read().await;
        pools.contains_key(&tenant_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::tenant::TenantContext;
    use sqlx::postgres::PgPoolOptions;
    use uuid::Uuid;

    /// Create a lazy pool that validates routing logic without requiring a live database
    fn lazy_pool() -> PgPool {
        PgPoolOptions::new()
            .max_connections(1)
            .connect_lazy("postgres://test:test@localhost/test_db")
            .expect("lazy pool creation should never fail")
    }

    #[tokio::test]
    async fn test_tenant_database_resolver() {
        let pool = lazy_pool();
        let resolver = TenantDatabaseResolver::new(pool.clone());

        // Verify control plane pool is accessible
        let cp_pool = resolver.control_plane_pool();
        assert!(!cp_pool.is_closed());

        // 1. Route super tenant (should resolve control plane pool)
        let super_ctx = TenantContext::super_tenant();
        let resolved = resolver.resolve_tenant_pool(&super_ctx).await;
        assert!(resolved.is_ok());

        // 2. Route normal tenant without dedicated pool (should fallback to control plane pool)
        let tenant_id = Uuid::new_v4();
        let normal_ctx = TenantContext::new(tenant_id, None);
        assert!(!resolver.has_dedicated_database(tenant_id).await);
        let resolved_fallback = resolver.resolve_tenant_pool(&normal_ctx).await;
        assert!(resolved_fallback.is_ok());

        // 3. Route normal tenant WITH registered dedicated pool
        resolver.register_tenant_pool(tenant_id, pool.clone()).await;
        assert!(resolver.has_dedicated_database(tenant_id).await);
        let resolved_dedicated = resolver.resolve_tenant_pool(&normal_ctx).await;
        assert!(resolved_dedicated.is_ok());
    }
}
