use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ContractRenewal {
    pub id: Uuid,
    pub original_contract_id: Uuid,
    pub new_contract_id: Option<Uuid>,
    pub renewal_type: String, // 'extend', 'modify', 'new'
    pub previous_end_date: NaiveDate,
    pub new_end_date: NaiveDate,
    pub notes: Option<String>,
    pub renewed_by: Option<Uuid>,
    pub renewed_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl ContractRenewal {
    pub fn new(
        original_contract_id: Uuid,
        renewal_type: String,
        previous_end_date: NaiveDate,
        new_end_date: NaiveDate,
        renewed_by: Option<Uuid>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            original_contract_id,
            new_contract_id: None,
            renewal_type,
            previous_end_date,
            new_end_date,
            notes: None,
            renewed_by,
            renewed_at: now,
            created_at: now,
            updated_at: now,
        }
    }
}
