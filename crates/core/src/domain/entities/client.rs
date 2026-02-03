//! Client Entity
//!
//! External customer/company for asset rental operations.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// External client for rentals
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Client {
    pub id: Uuid,
    pub client_code: String,
    pub name: String,
    pub company_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub contact_person: Option<String>,
    pub tax_id: Option<String>,
    pub is_active: Option<bool>,
    pub notes: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl Client {
    /// Create a new client with auto-generated code
    pub fn new(name: String, company_name: Option<String>) -> Self {
        let now = Utc::now();
        let client_code = format!("CLT-{}", now.format("%Y%m%d%H%M%S"));

        Self {
            id: Uuid::new_v4(),
            client_code,
            name,
            company_name,
            email: None,
            phone: None,
            address: None,
            city: None,
            contact_person: None,
            tax_id: None,
            is_active: Some(true),
            notes: None,
            created_at: Some(now),
            updated_at: Some(now),
        }
    }

    /// Check if client can rent assets
    pub fn can_rent(&self) -> bool {
        self.is_active.unwrap_or(true)
    }
}

/// Client summary for list views
#[derive(Debug, Clone, Serialize)]
pub struct ClientSummary {
    pub id: Uuid,
    pub client_code: String,
    pub name: String,
    pub company_name: Option<String>,
    pub phone: Option<String>,
    pub is_active: Option<bool>,
}

impl From<Client> for ClientSummary {
    fn from(client: Client) -> Self {
        Self {
            id: client.id,
            client_code: client.client_code,
            name: client.name,
            company_name: client.company_name,
            phone: client.phone,
            is_active: client.is_active,
        }
    }
}
