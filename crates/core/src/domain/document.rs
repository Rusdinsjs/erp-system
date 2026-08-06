//! Universal Document Identity & Lifecycle Metadata (QKRN-001 & QKRN-002)
//!
//! Shared trait, standard metadata, and universal lifecycle state machine
//! (Draft -> Submitted/Posted -> Cancelled -> Amended) for all ERP transaction documents.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::domain::errors::{DomainError, DomainResult};

/// Standard Document Status (QKRN-001 & QKRN-002)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DocumentStatus {
    #[default]
    Draft,
    Submitted,
    Posted,
    Cancelled,
    Amended,
}

impl DocumentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            DocumentStatus::Draft => "DRAFT",
            DocumentStatus::Submitted => "SUBMITTED",
            DocumentStatus::Posted => "POSTED",
            DocumentStatus::Cancelled => "CANCELLED",
            DocumentStatus::Amended => "AMENDED",
        }
    }

    pub fn is_mutable(&self) -> bool {
        matches!(self, DocumentStatus::Draft)
    }
}

/// Universal Document Identity & Audit Metadata (QKRN-001 & QKRN-002)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DocumentMetadata {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub company_id: Option<Uuid>,
    pub document_number: String,
    pub status: DocumentStatus,
    pub version: i32,

    // Actor Audit metadata
    pub owner_id: Uuid,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_by: Uuid,
    pub updated_at: DateTime<Utc>,

    // Amendment & Cancellation metadata
    pub amended_from_id: Option<Uuid>,
    pub cancelled_by: Option<Uuid>,
    pub cancelled_at: Option<DateTime<Utc>>,
    pub cancellation_reason: Option<String>,
}

impl DocumentMetadata {
    pub fn new(
        tenant_id: Uuid,
        company_id: Option<Uuid>,
        document_number: String,
        actor_id: Uuid,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            tenant_id,
            company_id,
            document_number,
            status: DocumentStatus::Draft,
            version: 1,
            owner_id: actor_id,
            created_by: actor_id,
            created_at: now,
            updated_by: actor_id,
            updated_at: now,
            amended_from_id: None,
            cancelled_by: None,
            cancelled_at: None,
            cancellation_reason: None,
        }
    }

    /// Verify optimistic concurrency control version (QKRN-003)
    pub fn verify_version(&self, expected_version: i32) -> DomainResult<()> {
        if self.version != expected_version {
            let msg = format!(
                "Stale document update rejected: expected version {}, but current document version is {}",
                expected_version, self.version
            );
            return Err(DomainError::business_rule(
                "ConcurrencyConflict",
                &msg,
            ));
        }
        Ok(())
    }

    /// Submit document (Draft -> Submitted)
    pub fn submit(&mut self, actor_id: Uuid) -> DomainResult<()> {
        if self.status != DocumentStatus::Draft {
            return Err(DomainError::invalid_transition(
                self.status.as_str(),
                "SUBMITTED",
            ));
        }
        self.status = DocumentStatus::Submitted;
        self.updated_by = actor_id;
        self.updated_at = Utc::now();
        self.version += 1;
        Ok(())
    }

    /// Post document (Draft or Submitted -> Posted)
    pub fn post(&mut self, actor_id: Uuid) -> DomainResult<()> {
        if self.status != DocumentStatus::Draft && self.status != DocumentStatus::Submitted {
            return Err(DomainError::invalid_transition(
                self.status.as_str(),
                "POSTED",
            ));
        }
        self.status = DocumentStatus::Posted;
        self.updated_by = actor_id;
        self.updated_at = Utc::now();
        self.version += 1;
        Ok(())
    }

    /// Cancel document (Submitted or Posted -> Cancelled)
    pub fn cancel(&mut self, actor_id: Uuid, reason: String) -> DomainResult<()> {
        if self.status != DocumentStatus::Submitted && self.status != DocumentStatus::Posted {
            return Err(DomainError::invalid_transition(
                self.status.as_str(),
                "CANCELLED",
            ));
        }
        let now = Utc::now();
        self.status = DocumentStatus::Cancelled;
        self.cancelled_by = Some(actor_id);
        self.cancelled_at = Some(now);
        self.cancellation_reason = Some(reason);
        self.updated_by = actor_id;
        self.updated_at = now;
        self.version += 1;
        Ok(())
    }

    /// Amend document (Cancelled -> Amended, returns new draft metadata linked via amended_from_id)
    pub fn amend(&mut self, actor_id: Uuid, new_document_number: String) -> DomainResult<DocumentMetadata> {
        if self.status != DocumentStatus::Cancelled {
            return Err(DomainError::invalid_transition(
                self.status.as_str(),
                "AMENDED",
            ));
        }

        self.status = DocumentStatus::Amended;
        self.updated_by = actor_id;
        self.updated_at = Utc::now();
        self.version += 1;

        let mut new_doc = DocumentMetadata::new(
            self.tenant_id,
            self.company_id,
            new_document_number,
            actor_id,
        );
        new_doc.amended_from_id = Some(self.id);
        Ok(new_doc)
    }
}

/// Shared trait implemented by typed ERP transaction models (QKRN-001)
pub trait DocumentHeader {
    fn metadata(&self) -> &DocumentMetadata;
    fn metadata_mut(&mut self) -> &mut DocumentMetadata;

    fn document_id(&self) -> Uuid {
        self.metadata().id
    }

    fn document_number(&self) -> &str {
        &self.metadata().document_number
    }

    fn status(&self) -> DocumentStatus {
        self.metadata().status
    }

    fn version(&self) -> i32 {
        self.metadata().version
    }
}

// ─── QKRN-007: Document Line Items ───────────────────────────────────────────

/// Shared trait for any typed document line/detail row (QKRN-007).
///
/// Implementing this trait on a line entity enables generic tooling
/// (validation, total reconstruction, FK enforcement) to work across all
/// document types (invoices, bills, orders, shipments, etc.).
pub trait DocumentLine {
    /// Stable identity of this line row.
    fn line_id(&self) -> Uuid;

    /// The header document this line belongs to.
    fn header_id(&self) -> Uuid;

    /// Zero-based display/sort order within the header (deterministic).
    fn line_order(&self) -> i32;

    /// Human-readable description of this line.
    fn description(&self) -> &str;
}

/// Shared trait for a document header that owns typed line items (QKRN-007).
///
/// `L` is the concrete line type (e.g. `InvoiceLine`, `BillItem`).
pub trait HasLines<L: DocumentLine> {
    /// Ordered slice of all line items belonging to this header.
    fn lines(&self) -> &[L];

    /// Assert that all line header_ids equal this document's id.
    fn validate_lines(&self) -> DomainResult<()>
    where
        Self: DocumentHeader,
    {
        let doc_id = self.document_id();
        for line in self.lines() {
            if line.header_id() != doc_id {
                return Err(DomainError::business_rule(
                    "LineHeaderMismatch",
                    &format!(
                        "Line {} belongs to document {} but expected {}",
                        line.line_id(),
                        line.header_id(),
                        doc_id,
                    ),
                ));
            }
        }
        Ok(())
    }
}

// ─── QKRN-008: Source Traceability ───────────────────────────────────────────

/// Standardized source reference for any derived transaction (QKRN-008).
///
/// Attach this to GL entries, stock movements, outbox events, and any
/// record that was produced from another document, to preserve the full
/// audit graph across submit → cancel → return → amend chains.
///
/// # DB Column Conventions
/// ```text
/// source_type     TEXT        NOT NULL   -- e.g. 'INVOICE', 'BILL', 'EXPENSE'
/// source_id       UUID        NOT NULL   -- header document UUID
/// source_line_id  UUID        NULL       -- line UUID if line-level traceability
/// voucher_ref     TEXT        NULL       -- external voucher / cheque number
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceRef {
    /// Type of the originating document (e.g. `"INVOICE"`, `"PURCHASE_ORDER"`).
    pub source_type: String,
    /// UUID of the originating document header.
    pub source_id: Uuid,
    /// UUID of the originating line item, if the derived record maps to a line.
    pub source_line_id: Option<Uuid>,
    /// Optional external voucher / reference number (e.g. bank transfer ref).
    pub voucher_ref: Option<String>,
}

impl SourceRef {
    /// Create a header-level source reference.
    pub fn from_header(source_type: impl Into<String>, source_id: Uuid) -> Self {
        Self {
            source_type: source_type.into(),
            source_id,
            source_line_id: None,
            voucher_ref: None,
        }
    }

    /// Create a line-level source reference.
    pub fn from_line(
        source_type: impl Into<String>,
        source_id: Uuid,
        source_line_id: Uuid,
    ) -> Self {
        Self {
            source_type: source_type.into(),
            source_id,
            source_line_id: Some(source_line_id),
            voucher_ref: None,
        }
    }

    /// Attach an external voucher / reference number.
    pub fn with_voucher(mut self, voucher_ref: impl Into<String>) -> Self {
        self.voucher_ref = Some(voucher_ref.into());
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TestInvoice {
        meta: DocumentMetadata,
    }

    impl DocumentHeader for TestInvoice {
        fn metadata(&self) -> &DocumentMetadata {
            &self.meta
        }
        fn metadata_mut(&mut self) -> &mut DocumentMetadata {
            &mut self.meta
        }
    }

    #[test]
    fn test_universal_document_lifecycle_state_machine() {
        let tenant_id = Uuid::new_v4();
        let company_id = Uuid::new_v4();
        let actor_id = Uuid::new_v4();

        let mut doc = TestInvoice {
            meta: DocumentMetadata::new(tenant_id, Some(company_id), "INV-2026-001".to_string(), actor_id),
        };

        // 1. Initial State: Draft
        assert_eq!(doc.status(), DocumentStatus::Draft);
        assert_eq!(doc.version(), 1);

        // 2. Draft -> Submitted
        assert!(doc.meta.submit(actor_id).is_ok());
        assert_eq!(doc.status(), DocumentStatus::Submitted);
        assert_eq!(doc.version(), 2);

        // 3. Invalid transition: Submitted -> Submit (Blocked)
        assert!(doc.meta.submit(actor_id).is_err());

        // 4. Submitted -> Posted
        assert!(doc.meta.post(actor_id).is_ok());
        assert_eq!(doc.status(), DocumentStatus::Posted);
        assert_eq!(doc.version(), 3);

        // 5. Posted -> Cancelled
        assert!(doc.meta.cancel(actor_id, "Typo error".to_string()).is_ok());
        assert_eq!(doc.status(), DocumentStatus::Cancelled);
        assert_eq!(doc.version(), 4);
        assert_eq!(doc.meta.cancellation_reason.as_deref(), Some("Typo error"));

        // 6. Cancelled -> Amended (Generates new linked draft)
        let amended_meta_res = doc.meta.amend(actor_id, "INV-2026-001-REV1".to_string());
        assert!(amended_meta_res.is_ok());
        assert_eq!(doc.status(), DocumentStatus::Amended);
        
        let new_draft_meta = amended_meta_res.unwrap();
        assert_eq!(new_draft_meta.status, DocumentStatus::Draft);
        assert_eq!(new_draft_meta.amended_from_id, Some(doc.document_id()));
        assert_eq!(new_draft_meta.document_number, "INV-2026-001-REV1");
    }

    #[test]
    fn test_optimistic_concurrency_conflict_protection() {
        let tenant_id = Uuid::new_v4();
        let company_id = Uuid::new_v4();
        let actor_id = Uuid::new_v4();

        let mut doc = DocumentMetadata::new(tenant_id, Some(company_id), "INV-2026-002".to_string(), actor_id);

        // 1. Initial version is 1
        assert_eq!(doc.version, 1);
        assert!(doc.verify_version(1).is_ok());

        // 2. Writer A updates document -> version increments to 2
        assert!(doc.submit(actor_id).is_ok());
        assert_eq!(doc.version, 2);

        // 3. Stale Writer B attempts update using expected_version = 1 -> BLOCKED
        let stale_verify = doc.verify_version(1);
        assert!(stale_verify.is_err());
        if let Err(DomainError::BusinessRuleViolation { rule, .. }) = stale_verify {
            assert_eq!(rule, "ConcurrencyConflict");
        } else {
            panic!("Expected ConcurrencyConflict error");
        }

        // 4. Up-to-date Writer C using expected_version = 2 -> ALLOWED
        assert!(doc.verify_version(2).is_ok());
    }
}
