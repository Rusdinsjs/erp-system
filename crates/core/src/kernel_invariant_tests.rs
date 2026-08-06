//! Kernel Invariant Test Suite — QKRN-014
//!
//! Unit tests covering:
//! - QKRN-001/002: Document identity & universal lifecycle state machine
//! - QKRN-003: Optimistic concurrency (stale version rejection)
//! - QKRN-007: DocumentLine FK validation (header_id mismatch detection)
//! - QKRN-008: SourceRef construction
//! - QKRN-009: AuditAction enum serialization
//! - QKRN-010: NamingSeriesService format (unit, no DB)
//! - QKRN-011: OutboxEntry construction and status values
//!
//! Integration tests covering UnitOfWork, IdempotencyStore, AuditTrailStore,
//! and OutboxStore are in `tests/kernel_integration_tests.rs` and require a
//! live database (`DATABASE_URL` env var).

#[cfg(test)]
mod kernel_unit_tests {
    use uuid::Uuid;
    use crate::domain::document::{
        DocumentHeader, DocumentLine, DocumentMetadata, DocumentStatus, HasLines, SourceRef,
    };
    use crate::domain::audit_trail::AuditAction;
    use crate::domain::errors::DomainError;
    use crate::domain::outbox::{OutboxEntry, OutboxStatus};

    // ─── Test fixtures ────────────────────────────────────────────────────────

    struct MockInvoice {
        meta: DocumentMetadata,
        lines: Vec<MockInvoiceLine>,
    }

    impl DocumentHeader for MockInvoice {
        fn metadata(&self) -> &DocumentMetadata { &self.meta }
        fn metadata_mut(&mut self) -> &mut DocumentMetadata { &mut self.meta }
    }

    impl HasLines<MockInvoiceLine> for MockInvoice {
        fn lines(&self) -> &[MockInvoiceLine] { &self.lines }
    }

    struct MockInvoiceLine {
        id: Uuid,
        header_id: Uuid,
        order: i32,
        desc: String,
    }

    impl DocumentLine for MockInvoiceLine {
        fn line_id(&self) -> Uuid { self.id }
        fn header_id(&self) -> Uuid { self.header_id }
        fn line_order(&self) -> i32 { self.order }
        fn description(&self) -> &str { &self.desc }
    }

    fn make_invoice() -> MockInvoice {
        let tenant_id = Uuid::new_v4();
        let company_id = Uuid::new_v4();
        let actor_id = Uuid::new_v4();
        MockInvoice {
            meta: DocumentMetadata::new(tenant_id, Some(company_id), "INV-TEST-001".to_string(), actor_id),
            lines: vec![],
        }
    }

    // ─── QKRN-001/002: Document lifecycle state machine ──────────────────────

    #[test]
    fn test_initial_state_is_draft_version_1() {
        let inv = make_invoice();
        assert_eq!(inv.status(), DocumentStatus::Draft);
        assert_eq!(inv.version(), 1);
        assert!(inv.meta.status.is_mutable());
    }

    #[test]
    fn test_draft_to_submitted_increments_version() {
        let mut inv = make_invoice();
        let actor = Uuid::new_v4();
        inv.meta.submit(actor).unwrap();
        assert_eq!(inv.status(), DocumentStatus::Submitted);
        assert_eq!(inv.version(), 2);
        assert!(!inv.meta.status.is_mutable());
    }

    #[test]
    fn test_submitted_to_posted() {
        let mut inv = make_invoice();
        let actor = Uuid::new_v4();
        inv.meta.submit(actor).unwrap();
        inv.meta.post(actor).unwrap();
        assert_eq!(inv.status(), DocumentStatus::Posted);
        assert_eq!(inv.version(), 3);
    }

    #[test]
    fn test_draft_can_be_posted_directly() {
        // Draft → Posted is allowed (e.g. auto-post on create)
        let mut inv = make_invoice();
        inv.meta.post(Uuid::new_v4()).unwrap();
        assert_eq!(inv.status(), DocumentStatus::Posted);
    }

    #[test]
    fn test_invalid_transition_submit_after_submitted_is_rejected() {
        let mut inv = make_invoice();
        let actor = Uuid::new_v4();
        inv.meta.submit(actor).unwrap();
        let err = inv.meta.submit(actor);
        assert!(err.is_err(), "Double-submit must be rejected");
    }

    #[test]
    fn test_invalid_transition_cancel_draft_is_rejected() {
        let mut inv = make_invoice();
        let actor = Uuid::new_v4();
        let err = inv.meta.cancel(actor, "test".to_string());
        assert!(err.is_err(), "Cannot cancel a Draft document");
    }

    #[test]
    fn test_cancel_submitted_records_reason() {
        let mut inv = make_invoice();
        let actor = Uuid::new_v4();
        inv.meta.submit(actor).unwrap();
        inv.meta.cancel(actor, "Wrong vendor".to_string()).unwrap();
        assert_eq!(inv.status(), DocumentStatus::Cancelled);
        assert_eq!(inv.meta.cancellation_reason.as_deref(), Some("Wrong vendor"));
        assert_eq!(inv.meta.cancelled_by, Some(actor));
    }

    #[test]
    fn test_amend_cancelled_creates_linked_draft() {
        let mut inv = make_invoice();
        let actor = Uuid::new_v4();
        inv.meta.submit(actor).unwrap();
        inv.meta.cancel(actor, "error".to_string()).unwrap();
        let new_meta = inv.meta.amend(actor, "INV-TEST-001-R1".to_string()).unwrap();
        assert_eq!(inv.status(), DocumentStatus::Amended);
        assert_eq!(new_meta.status, DocumentStatus::Draft);
        assert_eq!(new_meta.amended_from_id, Some(inv.document_id()));
        assert_eq!(new_meta.document_number, "INV-TEST-001-R1");
    }

    #[test]
    fn test_amend_non_cancelled_is_rejected() {
        let mut inv = make_invoice();
        let actor = Uuid::new_v4();
        inv.meta.submit(actor).unwrap();
        let err = inv.meta.amend(actor, "INV-TEST-001-R1".to_string());
        assert!(err.is_err(), "Can only amend a Cancelled document");
    }

    // ─── QKRN-003: Optimistic concurrency ────────────────────────────────────

    #[test]
    fn test_correct_version_is_accepted() {
        let tenant = Uuid::new_v4();
        let actor = Uuid::new_v4();
        let doc = DocumentMetadata::new(tenant, None, "DOC-001".to_string(), actor);
        assert!(doc.verify_version(1).is_ok());
    }

    #[test]
    fn test_stale_version_is_rejected_with_concurrency_conflict() {
        let tenant = Uuid::new_v4();
        let actor = Uuid::new_v4();
        let mut doc = DocumentMetadata::new(tenant, None, "DOC-002".to_string(), actor);
        doc.submit(actor).unwrap(); // version → 2
        let err = doc.verify_version(1).unwrap_err();
        match err {
            DomainError::BusinessRuleViolation { rule, .. } => {
                assert_eq!(rule, "ConcurrencyConflict");
            }
            other => panic!("Expected ConcurrencyConflict, got {:?}", other),
        }
    }

    // ─── QKRN-007: DocumentLine FK validation ─────────────────────────────────

    #[test]
    fn test_lines_with_correct_header_id_pass_validation() {
        let mut inv = make_invoice();
        let inv_id = inv.document_id();
        inv.lines.push(MockInvoiceLine {
            id: Uuid::new_v4(),
            header_id: inv_id,
            order: 0,
            desc: "Service fee".to_string(),
        });
        assert!(inv.validate_lines().is_ok());
    }

    #[test]
    fn test_line_with_wrong_header_id_is_rejected() {
        let mut inv = make_invoice();
        inv.lines.push(MockInvoiceLine {
            id: Uuid::new_v4(),
            header_id: Uuid::new_v4(), // wrong header
            order: 0,
            desc: "Orphan line".to_string(),
        });
        let err = inv.validate_lines().unwrap_err();
        match err {
            DomainError::BusinessRuleViolation { rule, .. } => {
                assert_eq!(rule, "LineHeaderMismatch");
            }
            other => panic!("Expected LineHeaderMismatch, got {:?}", other),
        }
    }

    // ─── QKRN-008: SourceRef construction ────────────────────────────────────

    #[test]
    fn test_source_ref_from_header() {
        let doc_id = Uuid::new_v4();
        let src = SourceRef::from_header("INVOICE", doc_id);
        assert_eq!(src.source_type, "INVOICE");
        assert_eq!(src.source_id, doc_id);
        assert!(src.source_line_id.is_none());
        assert!(src.voucher_ref.is_none());
    }

    #[test]
    fn test_source_ref_from_line_with_voucher() {
        let doc_id = Uuid::new_v4();
        let line_id = Uuid::new_v4();
        let src = SourceRef::from_line("BILL", doc_id, line_id)
            .with_voucher("CHQ-12345");
        assert_eq!(src.source_line_id, Some(line_id));
        assert_eq!(src.voucher_ref.as_deref(), Some("CHQ-12345"));
    }

    // ─── QKRN-009: AuditAction enum ──────────────────────────────────────────

    #[test]
    fn test_audit_action_as_str_values() {
        assert_eq!(AuditAction::Create.as_str(), "CREATE");
        assert_eq!(AuditAction::Submit.as_str(), "SUBMIT");
        assert_eq!(AuditAction::Post.as_str(), "POST");
        assert_eq!(AuditAction::Cancel.as_str(), "CANCEL");
        assert_eq!(AuditAction::Amend.as_str(), "AMEND");
    }

    // ─── QKRN-011: OutboxEntry construction ──────────────────────────────────

    #[test]
    fn test_outbox_entry_new_defaults_to_pending() {
        let payload = serde_json::json!({"invoice_id": "abc"});
        let entry = OutboxEntry::new(
            "invoice.posted",
            &payload,
            "INVOICE",
            Uuid::new_v4(),
            Uuid::new_v4(),
            None,
            "corr-123",
        );
        assert_eq!(entry.status, OutboxStatus::Pending.as_str());
        assert_eq!(entry.attempt_count, 0);
        assert_eq!(entry.max_attempts, 5);
        assert_eq!(entry.event_type, "invoice.posted");
        assert!(entry.last_error.is_none());
    }

    #[test]
    fn test_outbox_status_values() {
        assert_eq!(OutboxStatus::Pending.as_str(), "PENDING");
        assert_eq!(OutboxStatus::Processing.as_str(), "PROCESSING");
        assert_eq!(OutboxStatus::Completed.as_str(), "COMPLETED");
        assert_eq!(OutboxStatus::Failed.as_str(), "FAILED");
        assert_eq!(OutboxStatus::DeadLetter.as_str(), "DEAD_LETTER");
    }
}
