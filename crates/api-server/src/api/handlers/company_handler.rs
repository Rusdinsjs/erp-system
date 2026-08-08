//! Company Handler - ERPNext/Frappe Framework Company App Module
//! Handles company profiles, hierarchy trees (Holding & Subsidiaries), deeds (Akta Pendirian & Akta Perubahan), financial defaults & address settings

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::api::server::AppState;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct CompanyAmendmentDeedRow {
    pub id: Uuid,
    pub company_id: Uuid,
    pub deed_no: String,
    pub deed_date: Option<chrono::NaiveDate>,
    pub notary_name: Option<String>,
    pub approval_no: Option<String>,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CompanyAmendmentDeedPayload {
    #[serde(default)]
    pub id: Option<Uuid>,
    pub deed_no: String,
    #[serde(default)]
    pub deed_date: Option<chrono::NaiveDate>,
    #[serde(default)]
    pub notary_name: Option<String>,
    #[serde(default)]
    pub approval_no: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CompanyRow {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub tax_id: Option<String>,
    pub base_currency: String,
    pub country: String,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub logo_url: Option<String>,
    pub domain: Option<String>,
    pub website: Option<String>,
    pub parent_company_id: Option<Uuid>,
    pub parent_company_name: Option<String>,
    pub incorporation_date: Option<chrono::NaiveDate>,
    pub registration_no: Option<String>,
    // Akta Pendirian Perusahaan (Deed of Establishment)
    pub establishment_deed_no: Option<String>,
    pub establishment_deed_date: Option<chrono::NaiveDate>,
    pub establishment_notary_name: Option<String>,
    pub establishment_approval_no: Option<String>,
    // Financial defaults
    pub default_bank_account_id: Option<Uuid>,
    pub default_cash_account_id: Option<Uuid>,
    pub default_income_account_id: Option<Uuid>,
    pub default_expense_account_id: Option<Uuid>,
    pub default_receivable_account_id: Option<Uuid>,
    pub default_payable_account_id: Option<Uuid>,
    pub fiscal_year_start_month: Option<i32>,
    pub is_group: bool,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CompanyQuery {
    pub search: Option<String>,
    pub status: Option<String>,
    pub is_group: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCompanyPayload {
    pub code: String,
    pub name: String,
    #[serde(default)]
    pub legal_name: Option<String>,
    #[serde(default)]
    pub tax_id: Option<String>,
    #[serde(default)]
    pub base_currency: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub address: Option<String>,
    #[serde(default)]
    pub phone: Option<String>,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub logo_url: Option<String>,
    #[serde(default)]
    pub domain: Option<String>,
    #[serde(default)]
    pub website: Option<String>,
    #[serde(default)]
    pub parent_company_id: Option<Uuid>,
    #[serde(default)]
    pub incorporation_date: Option<chrono::NaiveDate>,
    #[serde(default)]
    pub registration_no: Option<String>,
    // Akta Pendirian
    #[serde(default)]
    pub establishment_deed_no: Option<String>,
    #[serde(default)]
    pub establishment_deed_date: Option<chrono::NaiveDate>,
    #[serde(default)]
    pub establishment_notary_name: Option<String>,
    #[serde(default)]
    pub establishment_approval_no: Option<String>,
    // Akta Perubahan (Multiple)
    #[serde(default)]
    pub amendment_deeds: Option<Vec<CompanyAmendmentDeedPayload>>,
    // Financial defaults
    #[serde(default)]
    pub default_bank_account_id: Option<Uuid>,
    #[serde(default)]
    pub default_cash_account_id: Option<Uuid>,
    #[serde(default)]
    pub default_income_account_id: Option<Uuid>,
    #[serde(default)]
    pub default_expense_account_id: Option<Uuid>,
    #[serde(default)]
    pub default_receivable_account_id: Option<Uuid>,
    #[serde(default)]
    pub default_payable_account_id: Option<Uuid>,
    #[serde(default)]
    pub fiscal_year_start_month: Option<i32>,
    #[serde(default)]
    pub is_group: Option<bool>,
    #[serde(default)]
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CompanyTreeNode {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub tax_id: Option<String>,
    pub is_group: bool,
    pub status: String,
    pub children: Vec<CompanyTreeNode>,
}

/// GET /api/companies - List all companies
use sqlx::Row;

fn map_company_row(r: &sqlx::postgres::PgRow) -> CompanyRow {
    CompanyRow {
        id: r.get("id"),
        tenant_id: r.get("tenant_id"),
        code: r.get("code"),
        name: r.get("name"),
        legal_name: r.try_get("legal_name").ok(),
        tax_id: r.try_get("tax_id").ok(),
        base_currency: r.try_get("base_currency").unwrap_or_else(|_| "IDR".to_string()),
        country: r.try_get("country").unwrap_or_else(|_| "Indonesia".to_string()),
        address: r.try_get("address").ok(),
        phone: r.try_get("phone").ok(),
        email: r.try_get("email").ok(),
        logo_url: r.try_get("logo_url").ok(),
        domain: r.try_get("domain").ok(),
        website: r.try_get("website").ok(),
        parent_company_id: r.try_get("parent_company_id").ok(),
        parent_company_name: r.try_get("parent_company_name").ok(),
        incorporation_date: r.try_get("incorporation_date").ok(),
        registration_no: r.try_get("registration_no").ok(),
        establishment_deed_no: r.try_get("establishment_deed_no").ok(),
        establishment_deed_date: r.try_get("establishment_deed_date").ok(),
        establishment_notary_name: r.try_get("establishment_notary_name").ok(),
        establishment_approval_no: r.try_get("establishment_approval_no").ok(),
        default_bank_account_id: r.try_get("default_bank_account_id").ok(),
        default_cash_account_id: r.try_get("default_cash_account_id").ok(),
        default_income_account_id: r.try_get("default_income_account_id").ok(),
        default_expense_account_id: r.try_get("default_expense_account_id").ok(),
        default_receivable_account_id: r.try_get("default_receivable_account_id").ok(),
        default_payable_account_id: r.try_get("default_payable_account_id").ok(),
        fiscal_year_start_month: r.try_get("fiscal_year_start_month").ok(),
        is_group: r.try_get("is_group").unwrap_or(false),
        status: r.try_get("status").unwrap_or_else(|_| "ACTIVE".to_string()),
        created_at: r.try_get("created_at").unwrap_or_else(|_| chrono::Utc::now()),
        updated_at: r.try_get("updated_at").unwrap_or_else(|_| chrono::Utc::now()),
    }
}

/// GET /api/companies - List all companies
pub async fn list_companies(
    State(state): State<AppState>,
    Query(params): Query<CompanyQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = &state.pool;

    let mut query = String::from(
        r#"
        SELECT 
            c.id, c.tenant_id, c.code, c.name, c.legal_name, c.tax_id, c.base_currency, c.country,
            c.address, c.phone, c.email, c.logo_url, c.domain, c.website, c.parent_company_id,
            p.name AS parent_company_name,
            c.incorporation_date, c.registration_no,
            c.establishment_deed_no, c.establishment_deed_date, c.establishment_notary_name, c.establishment_approval_no,
            c.default_bank_account_id,
            c.default_cash_account_id, c.default_income_account_id, c.default_expense_account_id,
            c.default_receivable_account_id, c.default_payable_account_id,
            c.fiscal_year_start_month, c.is_group, c.status, c.created_at, c.updated_at
        FROM public.companies c
        LEFT JOIN public.companies p ON c.parent_company_id = p.id
        WHERE c.deleted_at IS NULL
        "#,
    );

    if let Some(search) = &params.search {
        if !search.trim().is_empty() {
            query.push_str(&format!(
                " AND (c.name ILIKE '%{}%' OR c.code ILIKE '%{}%' OR c.legal_name ILIKE '%{}%')",
                search.trim(),
                search.trim(),
                search.trim()
            ));
        }
    }

    if let Some(status) = &params.status {
        if !status.trim().is_empty() {
            query.push_str(&format!(" AND c.status = '{}'", status.trim()));
        }
    }

    if let Some(is_group) = params.is_group {
        query.push_str(&format!(" AND c.is_group = {}", is_group));
    }

    query.push_str(" ORDER BY c.is_group DESC, c.name ASC");

    let raw_rows = sqlx::query(&query)
        .fetch_all(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    let rows: Vec<CompanyRow> = raw_rows.iter().map(map_company_row).collect();

    Ok(Json(serde_json::json!({
        "data": rows,
        "total": rows.len()
    })))
}

/// GET /api/companies/tree - Get Company Hierarchy Tree (Frappe Tree View)
pub async fn get_company_tree(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = &state.pool;

    let raw_rows = sqlx::query(
        r#"
        SELECT 
            c.id, c.tenant_id, c.code, c.name, c.legal_name, c.tax_id, c.base_currency, c.country,
            c.address, c.phone, c.email, c.logo_url, c.domain, c.website, c.parent_company_id,
            p.name AS parent_company_name,
            c.incorporation_date, c.registration_no,
            c.establishment_deed_no, c.establishment_deed_date, c.establishment_notary_name, c.establishment_approval_no,
            c.default_bank_account_id,
            c.default_cash_account_id, c.default_income_account_id, c.default_expense_account_id,
            c.default_receivable_account_id, c.default_payable_account_id,
            c.fiscal_year_start_month, c.is_group, c.status, c.created_at, c.updated_at
        FROM public.companies c
        LEFT JOIN public.companies p ON c.parent_company_id = p.id
        WHERE c.deleted_at IS NULL
        ORDER BY c.is_group DESC, c.name ASC
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    let rows: Vec<CompanyRow> = raw_rows.iter().map(map_company_row).collect();

    // Build hierarchy tree
    let root_nodes: Vec<&CompanyRow> = rows.iter().filter(|r| r.parent_company_id.is_none()).collect();
    
    fn build_node(parent: &CompanyRow, all_rows: &[CompanyRow]) -> CompanyTreeNode {
        let children = all_rows
            .iter()
            .filter(|r| r.parent_company_id == Some(parent.id))
            .map(|r| build_node(r, all_rows))
            .collect();

        CompanyTreeNode {
            id: parent.id,
            code: parent.code.clone(),
            name: parent.name.clone(),
            legal_name: parent.legal_name.clone(),
            tax_id: parent.tax_id.clone(),
            is_group: parent.is_group,
            status: parent.status.clone(),
            children,
        }
    }

    let tree: Vec<CompanyTreeNode> = root_nodes.into_iter().map(|r| build_node(r, &rows)).collect();

    Ok(Json(serde_json::json!({
        "data": tree
    })))
}

/// GET /api/companies/:id - Get Company details with Akta Perubahan (amendment deeds)
pub async fn get_company(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = &state.pool;

    let company_raw = sqlx::query(
        r#"
        SELECT 
            c.id, c.tenant_id, c.code, c.name, c.legal_name, c.tax_id, c.base_currency, c.country,
            c.address, c.phone, c.email, c.logo_url, c.domain, c.website, c.parent_company_id,
            p.name AS parent_company_name,
            c.incorporation_date, c.registration_no,
            c.establishment_deed_no, c.establishment_deed_date, c.establishment_notary_name, c.establishment_approval_no,
            c.default_bank_account_id,
            c.default_cash_account_id, c.default_income_account_id, c.default_expense_account_id,
            c.default_receivable_account_id, c.default_payable_account_id,
            c.fiscal_year_start_month, c.is_group, c.status, c.created_at, c.updated_at
        FROM public.companies c
        LEFT JOIN public.companies p ON c.parent_company_id = p.id
        WHERE c.id = $1 AND c.deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    let company = company_raw.map(|ref r| map_company_row(r));

    match company {
        Some(c) => {
            let amendment_deeds = sqlx::query_as::<_, CompanyAmendmentDeedRow>(
                r#"
                SELECT id, company_id, deed_no, deed_date, notary_name, approval_no, description, created_at, updated_at
                FROM public.company_amendment_deeds
                WHERE company_id = $1
                ORDER BY deed_date ASC, created_at ASC
                "#,
            )
            .bind(id)
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            let mut company_json = serde_json::to_value(&c).unwrap();
            if let Some(obj) = company_json.as_object_mut() {
                obj.insert("amendment_deeds".to_string(), serde_json::to_value(amendment_deeds).unwrap());
            }

            Ok(Json(serde_json::json!({ "data": company_json })))
        }
        None => Err((StatusCode::NOT_FOUND, "Company not found".to_string())),
    }
}

/// POST /api/companies - Create Company with Akta Pendirian & Akta Perubahan
pub async fn create_company(
    State(state): State<AppState>,
    Json(payload): Json<CreateCompanyPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = &state.pool;
    let tenant_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();

    let new_id = Uuid::new_v4();
    let base_currency = payload.base_currency.unwrap_or_else(|| "IDR".to_string());
    let country = payload.country.unwrap_or_else(|| "Indonesia".to_string());
    let is_group = payload.is_group.unwrap_or(false);
    let status = payload.status.unwrap_or_else(|| "ACTIVE".to_string());
    let fiscal_start = payload.fiscal_year_start_month.unwrap_or(1);

    sqlx::query(
        r#"
        INSERT INTO public.companies (
            id, tenant_id, code, name, legal_name, tax_id, base_currency, country,
            address, phone, email, logo_url, domain, website, parent_company_id,
            incorporation_date, registration_no,
            establishment_deed_no, establishment_deed_date, establishment_notary_name, establishment_approval_no,
            default_bank_account_id, default_cash_account_id, default_income_account_id,
            default_expense_account_id, default_receivable_account_id, default_payable_account_id,
            fiscal_year_start_month, is_group, status
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15,
            $16, $17,
            $18, $19, $20, $21,
            $22, $23, $24, $25, $26, $27,
            $28, $29, $30
        )
        "#,
    )
    .bind(new_id)
    .bind(tenant_id)
    .bind(&payload.code)
    .bind(&payload.name)
    .bind(&payload.legal_name)
    .bind(&payload.tax_id)
    .bind(&base_currency)
    .bind(&country)
    .bind(&payload.address)
    .bind(&payload.phone)
    .bind(&payload.email)
    .bind(&payload.logo_url)
    .bind(&payload.domain)
    .bind(&payload.website)
    .bind(payload.parent_company_id)
    .bind(payload.incorporation_date)
    .bind(&payload.registration_no)
    .bind(&payload.establishment_deed_no)
    .bind(payload.establishment_deed_date)
    .bind(&payload.establishment_notary_name)
    .bind(&payload.establishment_approval_no)
    .bind(payload.default_bank_account_id)
    .bind(payload.default_cash_account_id)
    .bind(payload.default_income_account_id)
    .bind(payload.default_expense_account_id)
    .bind(payload.default_receivable_account_id)
    .bind(payload.default_payable_account_id)
    .bind(fiscal_start)
    .bind(is_group)
    .bind(&status)
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create company: {}", e)))?;

    // Insert Akta Perubahan (amendment deeds) if provided
    if let Some(deeds) = payload.amendment_deeds {
        for deed in deeds {
            sqlx::query(
                r#"
                INSERT INTO public.company_amendment_deeds (
                    id, company_id, deed_no, deed_date, notary_name, approval_no, description
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(new_id)
            .bind(&deed.deed_no)
            .bind(deed.deed_date)
            .bind(&deed.notary_name)
            .bind(&deed.approval_no)
            .bind(&deed.description)
            .execute(pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save amendment deed: {}", e)))?;
        }
    }

    Ok(Json(serde_json::json!({
        "message": "Company created successfully",
        "id": new_id
    })))
}

/// PUT /api/companies/:id - Update Company with Akta Pendirian & Akta Perubahan
pub async fn update_company(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateCompanyPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = &state.pool;

    let base_currency = payload.base_currency.unwrap_or_else(|| "IDR".to_string());
    let country = payload.country.unwrap_or_else(|| "Indonesia".to_string());
    let is_group = payload.is_group.unwrap_or(false);
    let status = payload.status.unwrap_or_else(|| "ACTIVE".to_string());
    let fiscal_start = payload.fiscal_year_start_month.unwrap_or(1);

    let res = sqlx::query(
        r#"
        UPDATE public.companies SET
            code = $1,
            name = $2,
            legal_name = $3,
            tax_id = $4,
            base_currency = $5,
            country = $6,
            address = $7,
            phone = $8,
            email = $9,
            logo_url = $10,
            domain = $11,
            website = $12,
            parent_company_id = $13,
            incorporation_date = $14,
            registration_no = $15,
            establishment_deed_no = $16,
            establishment_deed_date = $17,
            establishment_notary_name = $18,
            establishment_approval_no = $19,
            default_bank_account_id = $20,
            default_cash_account_id = $21,
            default_income_account_id = $22,
            default_expense_account_id = $23,
            default_receivable_account_id = $24,
            default_payable_account_id = $25,
            fiscal_year_start_month = $26,
            is_group = $27,
            status = $28,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $29 AND deleted_at IS NULL
        "#,
    )
    .bind(&payload.code)
    .bind(&payload.name)
    .bind(&payload.legal_name)
    .bind(&payload.tax_id)
    .bind(&base_currency)
    .bind(&country)
    .bind(&payload.address)
    .bind(&payload.phone)
    .bind(&payload.email)
    .bind(&payload.logo_url)
    .bind(&payload.domain)
    .bind(&payload.website)
    .bind(payload.parent_company_id)
    .bind(payload.incorporation_date)
    .bind(&payload.registration_no)
    .bind(&payload.establishment_deed_no)
    .bind(payload.establishment_deed_date)
    .bind(&payload.establishment_notary_name)
    .bind(&payload.establishment_approval_no)
    .bind(payload.default_bank_account_id)
    .bind(payload.default_cash_account_id)
    .bind(payload.default_income_account_id)
    .bind(payload.default_expense_account_id)
    .bind(payload.default_receivable_account_id)
    .bind(payload.default_payable_account_id)
    .bind(fiscal_start)
    .bind(is_group)
    .bind(&status)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update company: {}", e)))?;

    if res.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Company not found".to_string()));
    }

    // Sync Akta Perubahan (amendment deeds) if payload provides them
    if let Some(deeds) = payload.amendment_deeds {
        // Remove existing amendment deeds for this company and replace with payload list
        sqlx::query("DELETE FROM public.company_amendment_deeds WHERE company_id = $1")
            .bind(id)
            .execute(pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to clear old deeds: {}", e)))?;

        for deed in deeds {
            sqlx::query(
                r#"
                INSERT INTO public.company_amendment_deeds (
                    id, company_id, deed_no, deed_date, notary_name, approval_no, description
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                "#,
            )
            .bind(deed.id.unwrap_or_else(Uuid::new_v4))
            .bind(id)
            .bind(&deed.deed_no)
            .bind(deed.deed_date)
            .bind(&deed.notary_name)
            .bind(&deed.approval_no)
            .bind(&deed.description)
            .execute(pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update amendment deed: {}", e)))?;
        }
    }

    Ok(Json(serde_json::json!({
        "message": "Company updated successfully"
    })))
}

/// DELETE /api/companies/:id - Soft Delete Company
pub async fn delete_company(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = &state.pool;

    let res = sqlx::query(
        "UPDATE public.companies SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to delete company: {}", e)))?;

    if res.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Company not found".to_string()));
    }

    Ok(Json(serde_json::json!({
        "message": "Company deleted successfully"
    })))
}
