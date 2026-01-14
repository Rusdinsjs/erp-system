//! Organization Entity
//!
//! Multi-tenant organization support with hierarchical structure.

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use uuid::Uuid;

/// Organization type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrganizationType {
    Company,
    Division,
    Department,
    Team,
}

impl OrganizationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Company => "company",
            Self::Division => "division",
            Self::Department => "department",
            Self::Team => "team",
        }
    }
}

/// Organization entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Organization {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub org_type: Option<String>,
    pub cost_center: Option<String>,
    pub budget: Option<Decimal>,
    pub manager_id: Option<Uuid>,
    pub is_active: bool,
    pub metadata: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Organization {
    pub fn new(code: String, name: String, org_type: OrganizationType) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            code,
            name,
            parent_id: None,
            org_type: Some(org_type.as_str().to_string()),
            cost_center: None,
            budget: None,
            manager_id: None,
            is_active: true,
            metadata: None,
            created_at: now,
            updated_at: now,
        }
    }
}
