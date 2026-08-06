use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Metadata Storage Strategy Enum (QMETA-001, QMETA-004)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StorageStrategy {
    Typed,
    HybridJsonb,
    DynamicJsonb,
}

/// EntityType Registry Entity (QMETA-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityType {
    pub id: Uuid,
    pub name: String,
    pub module: String,
    pub storage_strategy: StorageStrategy,
    pub is_custom: bool,
    pub version: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// FieldDefinition Metadata Entity (QMETA-002)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDefinition {
    pub id: Uuid,
    pub entity_type_id: Uuid,
    pub field_name: String,
    pub label: String,
    pub data_type: String, // "STRING", "NUMBER", "DECIMAL", "BOOLEAN", "DATE", "DATETIME", "JSON"
    pub is_required: bool,
    pub is_readonly: bool,
    pub default_value: Option<String>,
    pub options_json: Option<serde_json::Value>,
}

impl FieldDefinition {
    /// Validate dynamic json value against field metadata specification (QMETA-002, QMETA-006)
    pub fn validate_value(&self, value: &serde_json::Value) -> Result<(), String> {
        if value.is_null() {
            if self.is_required {
                return Err(format!("Field '{}' is required", self.label));
            } else {
                return Ok(());
            }
        }

        match self.data_type.as_str() {
            "STRING" => {
                if !value.is_string() {
                    return Err(format!("Field '{}' must be a string", self.label));
                }
            }
            "NUMBER" | "DECIMAL" => {
                if !value.is_number() {
                    return Err(format!("Field '{}' must be a number", self.label));
                }
            }
            "BOOLEAN" => {
                if !value.is_boolean() {
                    return Err(format!("Field '{}' must be a boolean", self.label));
                }
            }
            _ => {}
        }

        Ok(())
    }
}

/// LayoutDefinition Metadata Entity (QMETA-003)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutDefinition {
    pub id: Uuid,
    pub entity_type_id: Uuid,
    pub layout_name: String,
    pub layout_json: serde_json::Value,
}

/// Dynamic Custom Entity Record (QMETA-012 Sample Custom Entity Proof)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DynamicEntityRecord {
    pub id: Uuid,
    pub entity_type_id: Uuid,
    pub data: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
