//! Phase 11 ERPQu App System Invariant Test Suite (QAPP-009)
//!
//! Validates:
//! - QAPP-001 / QAPP-009: AppManifest & SemVer kernel compatibility
//! - QAPP-003: App lifecycle status transitions
//! - QAPP-004: Namespaced app migration history tracking

use chrono::Utc;
use uuid::Uuid;

use management_system_core::domain::app_system::{
    AppManifest, AppMigrationEntry, AppStatus, InstalledApp,
};

#[test]
fn test_qapp_001_app_manifest_semver_compatibility() {
    let manifest = AppManifest {
        app_name: "erpqu-indonesia".to_string(),
        version: "1.0.0".to_string(),
        required_kernel_version: "1.0.0".to_string(),
        dependencies: vec![],
        description: Some("Indonesian Localization App".to_string()),
    };

    assert!(manifest.is_compatible_with_kernel("1.0.0"));
    assert!(manifest.is_compatible_with_kernel("1.2.0"));
    assert!(!manifest.is_compatible_with_kernel("2.0.0"));
}

#[test]
fn test_qapp_003_app_lifecycle_state_transitions() {
    let mut app = InstalledApp {
        app_name: "erpqu-indonesia".to_string(),
        version: "1.0.0".to_string(),
        required_kernel_version: "1.0.0".to_string(),
        status: AppStatus::Installed.as_str().to_string(),
        installed_at: Utc::now(),
        updated_at: Utc::now(),
    };

    assert_eq!(app.status, "INSTALLED");

    // Enable app
    app.set_status(AppStatus::Enabled);
    assert_eq!(app.status, "ENABLED");

    // Disable app
    app.set_status(AppStatus::Disabled);
    assert_eq!(app.status, "DISABLED");
}

#[test]
fn test_qapp_004_namespaced_app_migration_tracking() {
    let migration = AppMigrationEntry {
        id: Uuid::new_v4(),
        app_name: "erpqu-indonesia".to_string(),
        migration_name: "20260806000001_create_tax_invoice_tables.sql".to_string(),
        executed_at: Utc::now(),
    };

    assert_eq!(migration.app_name, "erpqu-indonesia");
    assert_eq!(
        migration.migration_name,
        "20260806000001_create_tax_invoice_tables.sql"
    );
}
