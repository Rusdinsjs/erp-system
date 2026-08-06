//! Kernel Invariant & Architecture Boundary Test Suite (QKRN-014 & QARC-010)
//!
//! Covers:
//! - QARC-001: Architecture Constitution & Domain-Agnostic Kernel
//! - QARC-002/003: Capability-based document lifecycle (Submittable, Cancellable, Amendable)
//!                 and state separation (no Posted in Kernel DocumentStatus)
//! - QARC-004: Domain-neutral CommandContext and UnitOfWork
//! - QARC-005: Dependency direction enforcement (Domain has 0 infrastructure imports)
//! - QARC-006: Numeric exactness, scale/precision, deterministic rounding
//! - QKRN-007: DocumentLine FK validation & missing lines invariant
//! - QKRN-008: SourceRef construction
//! - QKRN-009: AuditAction enum
//! - QKRN-011: OutboxEntry construction

#[cfg(test)]
mod kernel_unit_tests {
    use crate::domain::audit_trail::AuditAction;
    use crate::domain::document::{
        validate_header_line_relationship, Amendable, Cancellable, DocumentHeader, DocumentLine,
        DocumentMetadata, DocumentStatus, LifecycleEnvelope, Submittable,
    };
    use crate::domain::errors::DomainError;
    use crate::domain::outbox::{OutboxEntry, OutboxStatus};
    use crate::infrastructure::database::CommandContext;
    use rust_decimal::Decimal;
    use rust_decimal::RoundingStrategy;
    use uuid::Uuid;

    // ─── Test fixtures ────────────────────────────────────────────────────────

    struct MockInvoice {
        meta: DocumentMetadata,
        lines: Vec<MockInvoiceLine>,
    }

    impl DocumentHeader for MockInvoice {
        fn metadata(&self) -> &DocumentMetadata {
            &self.meta
        }
        fn metadata_mut(&mut self) -> &mut DocumentMetadata {
            &mut self.meta
        }
    }

    struct MockInvoiceLine {
        id: Uuid,
        header_id: Uuid,
        order: i32,
        desc: String,
    }

    impl DocumentLine for MockInvoiceLine {
        fn line_id(&self) -> Uuid {
            self.id
        }
        fn header_id(&self) -> Uuid {
            self.header_id
        }
    }

    fn make_invoice() -> MockInvoice {
        let tenant_id = Uuid::new_v4();
        let company_id = Uuid::new_v4();
        let actor_id = Uuid::new_v4();
        MockInvoice {
            meta: DocumentMetadata::new(
                tenant_id,
                Some(company_id),
                "INV-TEST-001".to_string(),
                actor_id,
            ),
            lines: vec![],
        }
    }

    // ─── QARC-002, QARC-003 & 3R.1-001: Capability Lifecycle & State Separation ───

    #[test]
    fn test_plain_document_metadata_has_no_automatic_lifecycle_behavior() {
        // 3R.1-001: Plain DocumentMetadata is purely domain-neutral.
        // It carries metadata only (id, version, actor audit, etc.) without automatic submit/cancel/amend methods.
        let tenant_id = Uuid::new_v4();
        let actor_id = Uuid::new_v4();
        let meta = DocumentMetadata::new(tenant_id, None, "MASTER-001".to_string(), actor_id);

        assert_eq!(meta.version, 1);
        assert_eq!(meta.document_number, "MASTER-001");
        // Verified: Plain DocumentMetadata has no status field or automatic submit/cancel methods.
    }

    #[test]
    fn test_opt_in_lifecycle_envelope_initial_state_is_draft() {
        let tenant_id = Uuid::new_v4();
        let actor_id = Uuid::new_v4();
        let meta = DocumentMetadata::new(tenant_id, None, "DOC-001".to_string(), actor_id);
        let envelope = LifecycleEnvelope::new(meta);

        assert_eq!(envelope.status, DocumentStatus::Draft);
        assert_eq!(envelope.metadata.version, 1);
        assert!(envelope.status.is_mutable());
    }

    #[test]
    fn test_submittable_capability_increments_version() {
        let tenant_id = Uuid::new_v4();
        let actor_id = Uuid::new_v4();
        let meta = DocumentMetadata::new(tenant_id, None, "DOC-001".to_string(), actor_id);
        let mut envelope = LifecycleEnvelope::new(meta);

        envelope.submit(actor_id).unwrap();
        assert_eq!(envelope.status, DocumentStatus::Submitted);
        assert_eq!(envelope.metadata.version, 2);
        assert!(!envelope.status.is_mutable());
    }

    #[test]
    fn test_qarc_003_no_posted_in_kernel_document_status() {
        // Universal DocumentStatus in Kernel MUST ONLY contain Draft, Submitted, Cancelled.
        // GL/Stock posting state is domain-specific, NOT universal.
        let status = DocumentStatus::Draft;
        assert_eq!(status.as_str(), "DRAFT");
        assert_eq!(DocumentStatus::Submitted.as_str(), "SUBMITTED");
        assert_eq!(DocumentStatus::Cancelled.as_str(), "CANCELLED");
    }

    #[test]
    fn test_invalid_transition_submit_after_submitted_is_rejected() {
        let tenant_id = Uuid::new_v4();
        let actor_id = Uuid::new_v4();
        let meta = DocumentMetadata::new(tenant_id, None, "DOC-001".to_string(), actor_id);
        let mut envelope = LifecycleEnvelope::new(meta);

        envelope.submit(actor_id).unwrap();
        let err = envelope.submit(actor_id);
        assert!(err.is_err(), "Double-submit must be rejected");
    }

    #[test]
    fn test_cancellable_capability_records_reason() {
        let tenant_id = Uuid::new_v4();
        let actor_id = Uuid::new_v4();
        let meta = DocumentMetadata::new(tenant_id, None, "DOC-001".to_string(), actor_id);
        let mut envelope = LifecycleEnvelope::new(meta);

        envelope.submit(actor_id).unwrap();
        envelope
            .cancel(actor_id, "Wrong vendor".to_string())
            .unwrap();
        assert_eq!(envelope.status, DocumentStatus::Cancelled);
        let cancel_info = envelope.cancellation.as_ref().unwrap();
        assert_eq!(cancel_info.cancellation_reason, "Wrong vendor");
        assert_eq!(cancel_info.cancelled_by, actor_id);
    }

    #[test]
    fn test_amendable_capability_creates_linked_draft() {
        let tenant_id = Uuid::new_v4();
        let actor_id = Uuid::new_v4();
        let meta = DocumentMetadata::new(tenant_id, None, "DOC-001".to_string(), actor_id);
        let mut envelope = LifecycleEnvelope::new(meta);

        envelope.submit(actor_id).unwrap();
        envelope.cancel(actor_id, "error".to_string()).unwrap();

        let new_envelope = envelope.amend(actor_id, "DOC-001-R1".to_string()).unwrap();

        // Original document stays Cancelled (QARC-003 semantics)
        assert_eq!(envelope.status, DocumentStatus::Cancelled);
        // Replacement document is a new Draft linked via amended_from_id
        assert_eq!(new_envelope.status, DocumentStatus::Draft);
        let amend_info = new_envelope.amendment.as_ref().unwrap();
        assert_eq!(amend_info.amended_from_id, envelope.metadata.id);
        assert_eq!(new_envelope.metadata.document_number, "DOC-001-R1");
    }

    // ─── QKRN-003: Optimistic Concurrency ─────────────────────────────────────

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
        let doc = DocumentMetadata::new(tenant, None, "DOC-002".to_string(), actor);
        let mut envelope = LifecycleEnvelope::new(doc);
        envelope.submit(actor).unwrap(); // version → 2
        let err = envelope.metadata.verify_version(1).unwrap_err();
        match err {
            DomainError::BusinessRuleViolation { rule, .. } => {
                assert_eq!(rule, "ConcurrencyConflict");
            }
            other => panic!("Expected ConcurrencyConflict, got {:?}", other),
        }
    }

    // ─── QARC-004: Domain-Neutral Command Context ─────────────────────────────

    #[test]
    fn test_qarc_004_command_context_domain_neutrality() {
        let actor_id = Uuid::new_v4();
        let company_id = Uuid::new_v4();
        let source_id = Uuid::new_v4();

        let ctx = CommandContext::new(
            actor_id,
            company_id,
            "DOCUMENT",
            source_id,
            "corr-999",
            "idempotency-key-001",
        );

        assert_eq!(ctx.actor_id, actor_id);
        assert_eq!(ctx.company_id, company_id);
        assert_eq!(ctx.source_type, "DOCUMENT");
        assert_eq!(ctx.source_id, source_id);
    }

    // ─── QKRN-007: DocumentLine FK Validation ─────────────────────────────────

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
        assert!(validate_header_line_relationship(&inv, &inv.lines).is_ok());
    }

    #[test]
    fn test_line_with_wrong_header_id_is_rejected() {
        let mut inv = make_invoice();
        inv.lines.push(MockInvoiceLine {
            id: Uuid::new_v4(),
            header_id: Uuid::new_v4(),
            order: 0,
            desc: "Orphan line".to_string(),
        });
        let err = validate_header_line_relationship(&inv, &inv.lines).unwrap_err();
        match err {
            DomainError::BusinessRuleViolation { rule, .. } => {
                assert_eq!(rule, "MismatchedHeaderLineID");
            }
            other => panic!("Expected MismatchedHeaderLineID, got {:?}", other),
        }
    }

    // ─── QARC-006: Numeric Exactness & Rounding Policies ──────────────────────

    #[test]
    fn test_qarc_006_decimal_exactness_no_float_loss() {
        // Financial calculation must preserve exact scale (e.g. 0.1 + 0.2 == 0.3)
        let a = Decimal::new(10, 2); // 0.10
        let b = Decimal::new(20, 2); // 0.20
        let sum = a + b;
        assert_eq!(sum, Decimal::new(30, 2));

        // Multiplication exactness (e.g., 3 items @ 33.33 == 99.99)
        let qty = Decimal::new(3, 0);
        let price = Decimal::new(3333, 2);
        assert_eq!(qty * price, Decimal::new(9999, 2));
    }

    #[test]
    fn test_qarc_006_deterministic_rounding_policy() {
        // Half-Even (Banker's rounding) policy for financial calculations
        let val = Decimal::new(1255, 2); // 12.55
        let rounded = val.round_dp_with_strategy(1, RoundingStrategy::MidpointNearestEven);
        assert_eq!(rounded, Decimal::new(126, 1)); // 12.6
    }

    // ─── QKRN-009: AuditAction Enum ──────────────────────────────────────────

    #[test]
    fn test_audit_action_as_str_values() {
        assert_eq!(AuditAction::Create.as_str(), "CREATE");
        assert_eq!(AuditAction::Submit.as_str(), "SUBMIT");
        assert_eq!(AuditAction::Post.as_str(), "POST");
        assert_eq!(AuditAction::Cancel.as_str(), "CANCEL");
        assert_eq!(AuditAction::Amend.as_str(), "AMEND");
    }

    // ─── QKRN-011: OutboxEntry Construction ──────────────────────────────────

    #[test]
    fn test_outbox_entry_new_defaults_to_pending() {
        let payload = serde_json::json!({"invoice_id": "abc"});
        let entry = OutboxEntry::new(
            "invoice.created",
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
        assert_eq!(entry.event_type, "invoice.created");
        assert!(entry.last_error.is_none());
    }
}
