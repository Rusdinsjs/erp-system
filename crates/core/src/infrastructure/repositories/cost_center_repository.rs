//! Cost Center Repository (QTEN-005)

use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::CostCenter;
use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::tenant::TenantContext;

#[async_trait]
pub trait CostCenterRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid, ctx: &TenantContext) -> DomainResult<Option<CostCenter>>;
    async fn find_by_tenant_id(&self, ctx: &TenantContext) -> DomainResult<Vec<CostCenter>>;
    async fn create(
        &self,
        cost_center: &CostCenter,
        ctx: &TenantContext,
    ) -> DomainResult<CostCenter>;
    async fn update(
        &self,
        cost_center: &CostCenter,
        ctx: &TenantContext,
    ) -> DomainResult<CostCenter>;
}

pub struct PgCostCenterRepository {
    pool: PgPool,
}

impl PgCostCenterRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl CostCenterRepository for PgCostCenterRepository {
    async fn find_by_id(&self, id: Uuid, ctx: &TenantContext) -> DomainResult<Option<CostCenter>> {
        let query = if ctx.is_super_tenant {
            sqlx::query_as::<_, CostCenter>(
                r#"
                SELECT id, tenant_id, company_id, code, name, parent_id,
                       manager_id, status, created_at, updated_at, deleted_at
                FROM cost_centers
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(id)
            .fetch_optional(&self.pool)
            .await
        } else {
            sqlx::query_as::<_, CostCenter>(
                r#"
                SELECT id, tenant_id, company_id, code, name, parent_id,
                       manager_id, status, created_at, updated_at, deleted_at
                FROM cost_centers
                WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
                "#,
            )
            .bind(id)
            .bind(ctx.tenant_id)
            .fetch_optional(&self.pool)
            .await
        };

        query.map_err(|e| DomainError::Database(e.to_string()))
    }

    async fn find_by_tenant_id(&self, ctx: &TenantContext) -> DomainResult<Vec<CostCenter>> {
        let query = if ctx.is_super_tenant && ctx.tenant_id == Uuid::nil() {
            sqlx::query_as::<_, CostCenter>(
                r#"
                SELECT id, tenant_id, company_id, code, name, parent_id,
                       manager_id, status, created_at, updated_at, deleted_at
                FROM cost_centers
                WHERE deleted_at IS NULL
                ORDER BY code ASC
                "#,
            )
            .fetch_all(&self.pool)
            .await
        } else {
            sqlx::query_as::<_, CostCenter>(
                r#"
                SELECT id, tenant_id, company_id, code, name, parent_id,
                       manager_id, status, created_at, updated_at, deleted_at
                FROM cost_centers
                WHERE tenant_id = $1 AND deleted_at IS NULL
                ORDER BY code ASC
                "#,
            )
            .bind(ctx.tenant_id)
            .fetch_all(&self.pool)
            .await
        };

        query.map_err(|e| DomainError::Database(e.to_string()))
    }

    async fn create(
        &self,
        cost_center: &CostCenter,
        ctx: &TenantContext,
    ) -> DomainResult<CostCenter> {
        ctx.enforce_boundary(cost_center.tenant_id)?;

        let created = sqlx::query_as::<_, CostCenter>(
            r#"
            INSERT INTO cost_centers (
                id, tenant_id, company_id, code, name, parent_id,
                manager_id, status, created_at, updated_at, deleted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, tenant_id, company_id, code, name, parent_id,
                      manager_id, status, created_at, updated_at, deleted_at
            "#,
        )
        .bind(cost_center.id)
        .bind(cost_center.tenant_id)
        .bind(cost_center.company_id)
        .bind(&cost_center.code)
        .bind(&cost_center.name)
        .bind(cost_center.parent_id)
        .bind(cost_center.manager_id)
        .bind(&cost_center.status)
        .bind(cost_center.created_at)
        .bind(cost_center.updated_at)
        .bind(cost_center.deleted_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(created)
    }

    async fn update(
        &self,
        cost_center: &CostCenter,
        ctx: &TenantContext,
    ) -> DomainResult<CostCenter> {
        ctx.enforce_boundary(cost_center.tenant_id)?;

        let updated = sqlx::query_as::<_, CostCenter>(
            r#"
            UPDATE cost_centers
            SET company_id = $3,
                code = $4,
                name = $5,
                parent_id = $6,
                manager_id = $7,
                status = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
            RETURNING id, tenant_id, company_id, code, name, parent_id,
                      manager_id, status, created_at, updated_at, deleted_at
            "#,
        )
        .bind(cost_center.id)
        .bind(cost_center.tenant_id)
        .bind(cost_center.company_id)
        .bind(&cost_center.code)
        .bind(&cost_center.name)
        .bind(cost_center.parent_id)
        .bind(cost_center.manager_id)
        .bind(&cost_center.status)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(updated)
    }
}
