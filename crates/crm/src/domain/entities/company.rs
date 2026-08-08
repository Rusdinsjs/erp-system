//! Company Entity Master (QTEN-004)

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::FromRow)]
pub struct Company {
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
    pub default_bank_account_id: Option<Uuid>,
    pub fiscal_year_start_month: i32,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

impl Company {
    pub fn new(
        tenant_id: Uuid,
        code: String,
        name: String,
        legal_name: Option<String>,
        tax_id: Option<String>,
        base_currency: Option<String>,
        country: Option<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            tenant_id,
            code,
            name,
            legal_name,
            tax_id,
            base_currency: base_currency.unwrap_or_else(|| "IDR".to_string()),
            country: country.unwrap_or_else(|| "Indonesia".to_string()),
            address: None,
            phone: None,
            email: None,
            default_bank_account_id: None,
            fiscal_year_start_month: 1,
            status: "ACTIVE".to_string(),
            created_at: now,
            updated_at: now,
            deleted_at: None,
        }
    }

    pub fn is_active(&self) -> bool {
        self.status.eq_ignore_ascii_case("ACTIVE") && self.deleted_at.is_none()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_company_creation_defaults() {
        let tenant_id = Uuid::new_v4();
        let company = Company::new(
            tenant_id,
            "CMP-001".to_string(),
            "PT ERPQu Utama".to_string(),
            Some("PT ERPQu Utama Legal".to_string()),
            Some("12.345.678.9-012.000".to_string()),
            None,
            None,
        );

        assert_eq!(company.tenant_id, tenant_id);
        assert_eq!(company.base_currency, "IDR");
        assert_eq!(company.country, "Indonesia");
        assert!(company.is_active());
    }
}
