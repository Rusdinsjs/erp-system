//! Architecture Boundary Enforcement Tests (QARC-001, QARC-003, QARC-005, QARC-010, 3R.1-001, 3R.1-002, 3R.1.1-001, 3R.1.1-002)
//!
//! Enforces:
//! 1. Dependency direction: `crates/core/src/domain/` MUST NOT import `infrastructure` modules (`use crate::infrastructure`).
//! 2. State separation: Universal Kernel `DocumentStatus` MUST NOT contain `Posted` state or `Amended` state.
//! 3. 3R.1.1-001: Plain `DocumentMetadata` envelope contains ZERO status, cancellation, or amendment fields.
//! 4. 3R.1.1-002: Generic `crates/core/src/domain/entities` contains ZERO Finance entity files (`finance.rs`, `journal.rs`).
//! 5. 3R.1.1-002: Pure domain models in `crates/finance/src/domain/entities/` contain ZERO `sqlx::FromRow` or `sqlx::Type` attributes.

#[cfg(test)]
mod architecture_tests {
    use crate::domain::document::{
        DocumentMetadata, DocumentStatus, SubmissionEnvelope, Submittable,
    };
    use std::fs;
    use std::path::Path;
    use uuid::Uuid;

    #[test]
    fn test_qarc_005_domain_layer_has_zero_infrastructure_imports() {
        let domain_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/domain");
        assert!(
            domain_dir.exists(),
            "Domain directory must exist at {:?}",
            domain_dir
        );

        let mut violations = Vec::new();

        fn check_dir(dir: &Path, violations: &mut Vec<String>) {
            for entry in fs::read_dir(dir).expect("Failed to read dir") {
                let entry = entry.expect("Failed entry");
                let path = entry.path();
                if path.is_dir() {
                    check_dir(&path, violations);
                } else if path.extension().and_then(|s| s.to_str()) == Some("rs") {
                    let content = fs::read_to_string(&path).expect("Failed to read file");
                    for (line_idx, line) in content.lines().enumerate() {
                        if line.contains("use crate::infrastructure")
                            && !line.trim_start().starts_with("//")
                        {
                            violations.push(format!(
                                "{}:{} -> Violation: domain layer cannot import infrastructure: '{}'",
                                path.display(),
                                line_idx + 1,
                                line.trim()
                            ));
                        }
                    }
                }
            }
        }

        check_dir(&domain_dir, &mut violations);

        if !violations.is_empty() {
            panic!(
                "QARC-005 Dependency Direction Violations Found (Domain -> Infrastructure):\n{}",
                violations.join("\n")
            );
        }
    }

    #[test]
    fn test_qarc_003_no_posted_or_amended_status_in_kernel_document_domain() {
        let doc_file = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/domain/document.rs");
        let content = fs::read_to_string(&doc_file).expect("Failed to read document.rs");

        assert!(
            !content.contains("Posted"),
            "QARC-003 Violation: Universal DocumentStatus in Kernel must NOT contain Posted state"
        );
        assert!(
            !content.contains("Amended,"),
            "QARC-003 Violation: Universal DocumentStatus in Kernel must NOT contain Amended state"
        );
    }

    #[test]
    fn test_3r_1_1_001_plain_document_metadata_is_pure_envelope_without_cancellation_or_amendment_fields(
    ) {
        let doc_file = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/domain/document.rs");
        let content = fs::read_to_string(&doc_file).expect("Failed to read document.rs");

        assert!(
            !content.contains("pub cancelled_by: Option<Uuid>,"),
            "3R.1.1-001 Violation: Plain DocumentMetadata must NOT carry cancelled_by field"
        );
        assert!(
            !content.contains("pub cancellation_reason: Option<String>,"),
            "3R.1.1-001 Violation: Plain DocumentMetadata must NOT carry cancellation_reason field"
        );
        assert!(
            !content.contains("pub amended_from_id: Option<Uuid>,"),
            "3R.1.1-001 Violation: Plain DocumentMetadata must NOT carry amended_from_id field"
        );
        assert!(
            !content.contains("impl Submittable for DocumentMetadata"),
            "3R.1.1-001 Violation: Plain DocumentMetadata must NOT implement Submittable automatically"
        );

        let meta = DocumentMetadata::new(
            Uuid::new_v4(),
            None,
            "TEST-ENV-001".to_string(),
            Uuid::new_v4(),
        );
        assert!(
            !content.contains("impl Cancellable for SubmissionEnvelope"),
            "3R.1.1-001 Violation: submission capability must not automatically grant cancellation"
        );
        assert!(
            !content.contains("impl Amendable<SubmissionEnvelope> for SubmissionEnvelope"),
            "3R.1.1-001 Violation: submission capability must not automatically grant amendment"
        );

        let mut envelope = SubmissionEnvelope::new(meta);
        assert_eq!(envelope.status, DocumentStatus::Draft);
        envelope.submit(Uuid::new_v4()).unwrap();
        assert_eq!(envelope.status, DocumentStatus::Submitted);
    }

    #[test]
    fn test_3r_1_1_002_core_domain_and_repositories_contain_zero_finance_files() {
        let finance_entity_file =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("src/domain/entities/finance.rs");
        let journal_entity_file =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("src/domain/entities/journal.rs");
        let finance_repo_file = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("src/infrastructure/repositories/finance_repository.rs");
        let journal_repo_file = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("src/infrastructure/repositories/journal_repository.rs");

        assert!(
            !finance_entity_file.exists(),
            "3R.1.1-002 Violation: core must not contain finance.rs entity"
        );
        assert!(
            !journal_entity_file.exists(),
            "3R.1.1-002 Violation: core must not contain journal.rs entity"
        );
        assert!(
            !finance_repo_file.exists(),
            "3R.1.1-002 Violation: core must not contain finance_repository.rs"
        );
        assert!(
            !journal_repo_file.exists(),
            "3R.1.1-002 Violation: core must not contain journal_repository.rs"
        );
    }

    #[test]
    fn test_3r_1_1_002_finance_knowledge_does_not_reenter_generic_core() {
        let core_src = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
        let forbidden = [
            "FinanceRepository",
            "JournalRepository",
            "ExpenseAnalysis",
            "SystemEvent::ExpenseCreated",
            "SystemEvent::PurchaseOrderCreated",
            "FROM expenses",
        ];
        let mut violations = Vec::new();

        fn scan(dir: &Path, forbidden: &[&str], violations: &mut Vec<String>) {
            for entry in fs::read_dir(dir).expect("read core source") {
                let path = entry.expect("read core entry").path();
                if path.is_dir() {
                    scan(&path, forbidden, violations);
                } else if path.extension().and_then(|ext| ext.to_str()) == Some("rs")
                    && !path.ends_with("architecture_boundary_tests.rs")
                {
                    let source = fs::read_to_string(&path).expect("read core source file");
                    for token in forbidden {
                        if source.contains(token) {
                            violations.push(format!("{} contains {token}", path.display()));
                        }
                    }
                }
            }
        }

        scan(&core_src, &forbidden, &mut violations);
        assert!(
            violations.is_empty(),
            "Finance leakage into core: {violations:?}"
        );
    }

    #[test]
    fn test_3r_1_1_002_pure_finance_domain_entities_have_zero_sqlx_persistence_attributes() {
        let finance_domain_dir =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../finance/src/domain/entities");
        assert!(
            finance_domain_dir.exists(),
            "Finance domain entities dir must exist"
        );

        for entry in fs::read_dir(&finance_domain_dir).expect("Read dir failed") {
            let entry = entry.unwrap();
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("rs") {
                let content = fs::read_to_string(&path).expect("Read file failed");
                assert!(
                    !content.contains("sqlx::FromRow"),
                    "3R.1.1-002 Violation: Pure domain model in {:?} must not use sqlx::FromRow",
                    path
                );
                assert!(
                    !content.contains("sqlx::Type"),
                    "3R.1.1-002 Violation: Pure domain model in {:?} must not use sqlx::Type",
                    path
                );
            }
        }
    }
}
