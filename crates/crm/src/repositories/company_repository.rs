//! Company Repository (QTEN-004)

use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::Company;
use management_system_core::domain::errors::{DomainError, DomainResult};
use management_system_core::domain::tenant::TenantContext;

#[async_trait]
pub trait CompanyRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid, ctx: &TenantContext) -> DomainResult<Option<Company>>;
    async fn find_by_tenant_id(&self, ctx: &TenantContext) -> DomainResult<Vec<Company>>;
    async fn create(&self, company: &Company, ctx: &TenantContext) -> DomainResult<Company>;
    async fn update(&self, company: &Company, ctx: &TenantContext) -> DomainResult<Company>;
}

pub struct PgCompanyRepository {
    pool: PgPool,
}

impl PgCompanyRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl CompanyRepository for PgCompanyRepository {
    async fn find_by_id(&self, id: Uuid, ctx: &TenantContext) -> DomainResult<Option<Company>> {
        let query = if ctx.is_super_tenant {
            sqlx::query_as::<_, Company>(
                r#"
                SELECT id, tenant_id, code, name, legal_name, tax_id,
                       base_currency, country, address, phone, email,
                       default_bank_account_id, fiscal_year_start_month,
                       status, created_at, updated_at, deleted_at
                FROM crm.companies
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(id)
            .fetch_optional(&self.pool)
            .await
        } else {
            sqlx::query_as::<_, Company>(
                r#"
                SELECT id, tenant_id, code, name, legal_name, tax_id,
                       base_currency, country, address, phone, email,
                       default_bank_account_id, fiscal_year_start_month,
                       status, created_at, updated_at, deleted_at
                FROM crm.companies
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

    async fn find_by_tenant_id(&self, ctx: &TenantContext) -> DomainResult<Vec<Company>> {
        let query = if ctx.is_super_tenant && ctx.tenant_id == Uuid::nil() {
            sqlx::query_as::<_, Company>(
                r#"
                SELECT id, tenant_id, code, name, legal_name, tax_id,
                       base_currency, country, address, phone, email,
                       default_bank_account_id, fiscal_year_start_month,
                       status, created_at, updated_at, deleted_at
                FROM crm.companies
                WHERE deleted_at IS NULL
                ORDER BY code ASC
                "#,
            )
            .fetch_all(&self.pool)
            .await
        } else {
            sqlx::query_as::<_, Company>(
                r#"
                SELECT id, tenant_id, code, name, legal_name, tax_id,
                       base_currency, country, address, phone, email,
                       default_bank_account_id, fiscal_year_start_month,
                       status, created_at, updated_at, deleted_at
                FROM crm.companies
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

    async fn create(&self, company: &Company, ctx: &TenantContext) -> DomainResult<Company> {
        ctx.enforce_boundary(company.tenant_id)?;

        let created = sqlx::query_as::<_, Company>(
            r#"
            INSERT INTO crm.companies (
                id, tenant_id, code, name, legal_name, tax_id,
                base_currency, country, address, phone, email,
                default_bank_account_id, fiscal_year_start_month, status,
                created_at, updated_at, deleted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id, tenant_id, code, name, legal_name, tax_id,
                      base_currency, country, address, phone, email,
                      default_bank_account_id, fiscal_year_start_month,
                      status, created_at, updated_at, deleted_at
            "#,
        )
        .bind(company.id)
        .bind(company.tenant_id)
        .bind(&company.code)
        .bind(&company.name)
        .bind(&company.legal_name)
        .bind(&company.tax_id)
        .bind(&company.base_currency)
        .bind(&company.country)
        .bind(&company.address)
        .bind(&company.phone)
        .bind(&company.email)
        .bind(company.default_bank_account_id)
        .bind(company.fiscal_year_start_month)
        .bind(&company.status)
        .bind(company.created_at)
        .bind(company.updated_at)
        .bind(company.deleted_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(created)
    }

    async fn update(&self, company: &Company, ctx: &TenantContext) -> DomainResult<Company> {
        ctx.enforce_boundary(company.tenant_id)?;

        let updated = sqlx::query_as::<_, Company>(
            r#"
            UPDATE crm.companies
            SET code = $3,
                name = $4,
                legal_name = $5,
                tax_id = $6,
                base_currency = $7,
                country = $8,
                address = $9,
                phone = $10,
                email = $11,
                default_bank_account_id = $12,
                fiscal_year_start_month = $13,
                status = $14,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
            RETURNING id, tenant_id, code, name, legal_name, tax_id,
                      base_currency, country, address, phone, email,
                      default_bank_account_id, fiscal_year_start_month,
                      status, created_at, updated_at, deleted_at
            "#,
        )
        .bind(company.id)
        .bind(company.tenant_id)
        .bind(&company.code)
        .bind(&company.name)
        .bind(&company.legal_name)
        .bind(&company.tax_id)
        .bind(&company.base_currency)
        .bind(&company.country)
        .bind(&company.address)
        .bind(&company.phone)
        .bind(&company.email)
        .bind(company.default_bank_account_id)
        .bind(company.fiscal_year_start_month)
        .bind(&company.status)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(updated)
    }
}
