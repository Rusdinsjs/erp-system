use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DataImport {
    pub id: Uuid,
    pub doctype_name: String,
    pub import_type: String, // 'Insert' or 'Update'
    pub file_name: String,
    pub status: String, // 'Pending', 'Validating', 'Success', 'Partial_Failed', 'Failed'
    pub total_rows: i32,
    pub successful_rows: i32,
    pub failed_rows: i32,
    pub created_by_user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DataImportLog {
    pub id: Uuid,
    pub data_import_id: Uuid,
    pub row_number: i32,
    pub status: String, // 'Success', 'Failed'
    pub record_identifier: Option<String>,
    pub messages: serde_json::Value,
    pub row_data: serde_json::Value,
    pub created_at: DateTime<Utc>,
}
