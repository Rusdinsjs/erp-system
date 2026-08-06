//! Architecture Boundary Enforcement Tests (QARC-001, QARC-003, QARC-005, QARC-010, 3R.1-001, 3R.1-002)
//!
//! Enforces:
//! 1. Dependency direction: `crates/core/src/domain/` MUST NOT import `infrastructure` modules (`use crate::infrastructure`).
//! 2. State separation: Universal Kernel `DocumentStatus` MUST NOT contain `Posted` state.
//! 3. 3R.1-001: Plain `DocumentMetadata` envelope has no status field or automatic capability trait implementations.
//! 4. 3R.1-002: Generic `crates/core/src/infrastructure/repositories` MUST NOT contain `finance_repository.rs`.

#[cfg(test)]
mod architecture_tests {
    use crate::domain::document::{
        DocumentMetadata, DocumentStatus, LifecycleEnvelope, Submittable,
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
    fn test_qarc_003_no_posted_status_in_kernel_document_domain() {
        let doc_file = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/domain/document.rs");
        let content = fs::read_to_string(&doc_file).expect("Failed to read document.rs");

        // Assert that DocumentStatus enum definition does not contain Posted variant
        assert!(
            !content.contains("pub enum DocumentStatus {\n    #[default]\n    Draft,\n    Submitted,\n    Posted,"),
            "QARC-003 Violation: Universal DocumentStatus in Kernel must NOT contain Posted state"
        );
    }

    #[test]
    fn test_3r_1_001_plain_document_metadata_is_pure_envelope_without_automatic_capabilities() {
        let doc_file = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/domain/document.rs");
        let content = fs::read_to_string(&doc_file).expect("Failed to read document.rs");

        // Assert plain DocumentMetadata struct does not contain status: DocumentStatus field
        assert!(
            !content.contains("pub struct DocumentMetadata {\n    pub id: Uuid,\n    pub tenant_id: Uuid,\n    pub company_id: Option<Uuid>,\n    pub document_number: String,\n    pub status: DocumentStatus,"),
            "3R.1-001 Violation: Plain DocumentMetadata must NOT carry status field directly"
        );

        // Assert no impl Submittable for DocumentMetadata
        assert!(
            !content.contains("impl Submittable for DocumentMetadata"),
            "3R.1-001 Violation: Plain DocumentMetadata must NOT implement Submittable automatically"
        );

        // Verify runtime capability opt-in via LifecycleEnvelope
        let meta = DocumentMetadata::new(
            Uuid::new_v4(),
            None,
            "TEST-ENV-001".to_string(),
            Uuid::new_v4(),
        );
        let mut envelope = LifecycleEnvelope::new(meta);
        assert_eq!(envelope.status, DocumentStatus::Draft);
        envelope.submit(Uuid::new_v4()).unwrap();
        assert_eq!(envelope.status, DocumentStatus::Submitted);
    }

    #[test]
    fn test_3r_1_002_core_repositories_does_not_own_finance_repository() {
        let repo_mod =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("src/infrastructure/repositories/mod.rs");
        let content = fs::read_to_string(&repo_mod).expect("Failed to read repositories/mod.rs");

        assert!(
            !content.contains("pub mod finance_repository;"),
            "3R.1-002 Violation: Generic core infrastructure MUST NOT own finance_repository"
        );
    }
}
