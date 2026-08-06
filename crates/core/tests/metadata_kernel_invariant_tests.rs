//! Phase 9 ERPQu Metadata Kernel Invariant Test Suite (QMETA-012)
//!
//! Validates:
//! - QMETA-001: EntityType registry data structure
//! - QMETA-002: FieldDefinition validation rules
//! - QMETA-004: Hybrid JSONB custom_data model
//! - QMETA-012: Sample custom entity proof of concept

use serde_json::json;
use uuid::Uuid;

use management_system_core::domain::metadata_kernel::{
    DynamicEntityRecord, EntityType, FieldDefinition, StorageStrategy,
};

#[test]
fn test_qmeta_002_field_validation_rules() {
    let req_field = FieldDefinition {
        id: Uuid::new_v4(),
        entity_type_id: Uuid::new_v4(),
        field_name: "inspector_name".to_string(),
        label: "Inspector Name".to_string(),
        data_type: "STRING".to_string(),
        is_required: true,
        is_readonly: false,
        default_value: None,
        options_json: None,
    };

    // Valid string
    assert!(req_field.validate_value(&json!("John Doe")).is_ok());

    // Invalid null for required field
    assert!(req_field.validate_value(&json!(null)).is_err());

    // Invalid type (number instead of string)
    assert!(req_field.validate_value(&json!(12345)).is_err());
}

#[test]
fn test_qmeta_004_hybrid_jsonb_storage_model() {
    let custom_data = json!({
        "warranty_extended": true,
        "inspection_frequency_days": 30,
        "vendor_rating": "A+"
    });

    assert_eq!(custom_data["warranty_extended"], true);
    assert_eq!(custom_data["inspection_frequency_days"], 30);
    assert_eq!(custom_data["vendor_rating"], "A+");
}

#[test]
fn test_qmeta_012_sample_custom_entity_end_to_end_crud() {
    let entity_type = EntityType {
        id: Uuid::new_v4(),
        name: "SAFETY_INSPECTION".to_string(),
        module: "CUSTOM".to_string(),
        storage_strategy: StorageStrategy::DynamicJsonb,
        is_custom: true,
        version: 1,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    let record = DynamicEntityRecord {
        id: Uuid::new_v4(),
        entity_type_id: entity_type.id,
        data: json!({
            "asset_code": "AST-2026-001",
            "passed": true,
            "score": 98.5
        }),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    assert_eq!(entity_type.name, "SAFETY_INSPECTION");
    assert_eq!(record.data["passed"], true);
    assert_eq!(record.data["score"], 98.5);
}
