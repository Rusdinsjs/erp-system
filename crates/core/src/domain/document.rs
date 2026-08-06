//! Standard Document Envelope & Capability Model (QARC-002 & QARC-003)
//!
//! Kernel provides a domain-agnostic standard document envelope for metadata
//! (identity, tenant/company scope, audit ownership, version) and trait-based
//! capabilities (Submittable, Cancellable, Amendable, WorkflowEnabled).
//!
//! Posting state (GL/Stock) is NOT part of the Kernel universal DocumentStatus.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::domain::errors::{DomainError, DomainResult};

/// Universal Document Status for lifecycle envelope (QARC-003)
///
/// Pure document lifecycle status only (Draft, Submitted, Cancelled).
/// Domain-specific status (GL Posted, Depreciation Posted, Stock Posted)
/// belongs to typed domain entities, NOT universal DocumentStatus.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DocumentStatus {
    #[default]
    Draft,
    Submitted,
    Cancelled,
}

impl DocumentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            DocumentStatus::Draft => "DRAFT",
            DocumentStatus::Submitted => "SUBMITTED",
            DocumentStatus::Cancelled => "CANCELLED",
        }
    }

    pub fn is_mutable(&self) -> bool {
        matches!(self, DocumentStatus::Draft)
    }
}

/// Standard Document Envelope Identity & Audit Metadata (QARC-002)
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
}

// ─── Capability Traits (QARC-002) ────────────────────────────────────────────

/// Capability trait for documents that support submission (Draft -> Submitted)
pub trait Submittable {
    fn submit(&mut self, actor_id: Uuid) -> DomainResult<()>;
}

/// Capability trait for documents that support cancellation (Submitted -> Cancelled)
pub trait Cancellable {
    fn cancel(&mut self, actor_id: Uuid, reason: String) -> DomainResult<()>;
}

/// Capability trait for documents that support amendment
/// (Cancelled original remains Cancelled; creates new Draft linked via amended_from_id)
pub trait Amendable {
    fn amend(&mut self, actor_id: Uuid, new_document_number: String) -> DomainResult<DocumentMetadata>;
}

/// Capability trait for documents with approval workflow tracking
pub trait WorkflowEnabled {
    fn current_approval_step(&self) -> i32;
    fn total_approval_steps(&self) -> i32;
}

// Implement capability traits on DocumentMetadata

impl Submittable for DocumentMetadata {
    fn submit(&mut self, actor_id: Uuid) -> DomainResult<()> {
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
}

impl Cancellable for DocumentMetadata {
    fn cancel(&mut self, actor_id: Uuid, reason: String) -> DomainResult<()> {
        if self.status != DocumentStatus::Submitted {
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
}

impl Amendable for DocumentMetadata {
    fn amend(&mut self, actor_id: Uuid, new_document_number: String) -> DomainResult<DocumentMetadata> {
        if self.status != DocumentStatus::Cancelled {
            return Err(DomainError::invalid_transition(
                self.status.as_str(),
                "AMENDED",
            ));
        }

        // Original document stays Cancelled (QARC-003 semantics)
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
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceRef {
    pub source_type: String,
    pub source_id: Uuid,
    pub source_line_id: Option<Uuid>,
    pub voucher_ref: Option<String>,
}

impl SourceRef {
    pub fn from_header(source_type: impl Into<String>, source_id: Uuid) -> Self {
        Self {
            source_type: source_type.into(),
            source_id,
            source_line_id: None,
            voucher_ref: None,
        }
    }

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

    pub fn with_voucher(mut self, voucher_ref: impl Into<String>) -> Self {
        self.voucher_ref = Some(voucher_ref.into());
        self
    }
}
