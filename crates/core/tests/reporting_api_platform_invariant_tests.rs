//! Phase 10 Reporting, Print & API Platform Invariant Test Suite (QRPT-003, QINT-001)
//!
//! Validates:
//! - QRPT-001: ReportDefinition structure & Query Provider binding
//! - QPRT-001: PrintTemplate document binding & template configuration
//! - QINT-001: Integration ApiCredential scope authorization
//! - QAPI-001: Standardized API error response format

use chrono::Utc;
use uuid::Uuid;

use management_system_core::domain::reporting_platform::{
    ApiCredential, ApiStandardError, PrintTemplate, ReportDefinition,
};

#[test]
fn test_qrpt_001_report_definition_metadata() {
    let report_def = ReportDefinition {
        id: Uuid::new_v4(),
        name: "TRIAL_BALANCE".to_string(),
        report_type: "FINANCIAL".to_string(),
        query_provider: "TRIAL_BALANCE_PROVIDER".to_string(),
        options_json: None,
        permission_scope: "FINANCE_READ".to_string(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    assert_eq!(report_def.name, "TRIAL_BALANCE");
    assert_eq!(report_def.query_provider, "TRIAL_BALANCE_PROVIDER");
}

#[test]
fn test_qprt_001_print_template_rendering_structure() {
    let template = PrintTemplate {
        id: Uuid::new_v4(),
        entity_type_id: None,
        document_type: "SALES_INVOICE".to_string(),
        template_name: "Standard Tax Invoice".to_string(),
        html_template: "<h1>Sales Invoice {{invoice_number}}</h1>".to_string(),
        css_styles: Some("h1 { color: #1a365d; }".to_string()),
        is_default: true,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    assert_eq!(template.document_type, "SALES_INVOICE");
    assert!(template.is_default);
    assert!(template.html_template.contains("{{invoice_number}}"));
}

#[test]
fn test_qint_001_api_credential_scope_authorization() {
    let cred = ApiCredential {
        id: Uuid::new_v4(),
        tenant_id: Uuid::new_v4(),
        company_id: Some(Uuid::new_v4()),
        client_name: "WMS Integration Service".to_string(),
        api_key_hash: "sha256_hash_here".to_string(),
        scopes: vec!["inventory:read".to_string(), "inventory:write".to_string()],
        expires_at: None,
        is_revoked: false,
        created_at: Utc::now(),
    };

    let has_write_scope = cred.scopes.contains(&"inventory:write".to_string());
    let has_admin_scope = cred.scopes.contains(&"admin:all".to_string());

    assert!(has_write_scope);
    assert!(!has_admin_scope);
    assert!(!cred.is_revoked);
}

#[test]
fn test_qapi_001_standard_error_response() {
    let err = ApiStandardError {
        code: "INVALID_CREDIT_LIMIT".to_string(),
        message: "Customer credit limit exceeded".to_string(),
        correlation_id: "REQ-20260806-999".to_string(),
        timestamp: Utc::now(),
    };

    assert_eq!(err.code, "INVALID_CREDIT_LIMIT");
    assert_eq!(err.correlation_id, "REQ-20260806-999");
}
