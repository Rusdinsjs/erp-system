//! DB/Site-per-Tenant Target Architecture & Connection Resolver (QTEN-002)
//!
//! Provides separation between:
//! 1. Control Plane Database (Tenant directory, provisioning metadata, global audit)
//! 2. Tenant Business Plane Databases (Isolated database pool per tenant/site)

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use sqlx::PgPool;
use uuid::Uuid;
use crate::domain::tenant::TenantContext;
use crate::domain::errors::{DomainError, DomainResult};

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
