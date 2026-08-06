//! Standard Document Envelope & Capability Model (QARC-002, QARC-003 & 3R.1-001)
//!
//! Kernel provides a domain-agnostic standard document envelope for metadata
//! (identity, tenant/company scope, audit ownership, version).
//!
//! Lifecycle status and capabilities (Submittable, Cancellable, Amendable) are OPT-IN
//! via explicit capability wrappers (LifecycleEnvelope / SubmittableDocument) or typed domain models,
//! NOT automatically attached to plain DocumentMetadata (3R.1-001).

use crate::domain::errors::{DomainError, DomainResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Universal Document Status for documents that opt in to lifecycle management (QARC-003)
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

/// Standard Domain-Neutral Document Metadata (3R.1-001)
///
/// Contains ONLY universal identity, scoping, actor audit, and reference metadata.
/// Does NOT contain lifecycle status or automatic capability implementations.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DocumentMetadata {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub company_id: Option<Uuid>,
    pub document_number: String,
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
            return Err(DomainError::business_rule("ConcurrencyConflict", &msg));
        }
        Ok(())
    }
}

// ─── Capability Traits (QARC-002 & 3R.1-001) ──────────────────────────────────

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
pub trait Amendable<T> {
    fn amend(&mut self, actor_id: Uuid, new_document_number: String) -> DomainResult<T>;
}

/// Capability trait for documents with approval workflow tracking
pub trait WorkflowEnabled {
    fn current_approval_step(&self) -> i32;
    fn total_approval_steps(&self) -> i32;
}

/// Opt-In Lifecycle Envelope (3R.1-001)
///
/// Wraps domain-neutral `DocumentMetadata` with explicit lifecycle management
/// (`status: DocumentStatus`). Plain `DocumentMetadata` does NOT have these capabilities.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LifecycleEnvelope {
    #[serde(flatten)]
    pub metadata: DocumentMetadata,
    pub status: DocumentStatus,
}

impl LifecycleEnvelope {
    pub fn new(metadata: DocumentMetadata) -> Self {
        Self {
            metadata,
            status: DocumentStatus::Draft,
        }
    }
}

impl Submittable for LifecycleEnvelope {
    fn submit(&mut self, actor_id: Uuid) -> DomainResult<()> {
        if self.status != DocumentStatus::Draft {
            return Err(DomainError::invalid_transition(
                self.status.as_str(),
                "SUBMITTED",
            ));
        }
        self.status = DocumentStatus::Submitted;
        self.metadata.updated_by = actor_id;
        self.metadata.updated_at = Utc::now();
        self.metadata.version += 1;
        Ok(())
    }
}

impl Cancellable for LifecycleEnvelope {
    fn cancel(&mut self, actor_id: Uuid, reason: String) -> DomainResult<()> {
        if self.status != DocumentStatus::Submitted {
            return Err(DomainError::invalid_transition(
                self.status.as_str(),
                "CANCELLED",
            ));
        }
        let now = Utc::now();
        self.status = DocumentStatus::Cancelled;
        self.metadata.cancelled_by = Some(actor_id);
        self.metadata.cancelled_at = Some(now);
        self.metadata.cancellation_reason = Some(reason);
        self.metadata.updated_by = actor_id;
        self.metadata.updated_at = now;
        self.metadata.version += 1;
        Ok(())
    }
}

impl Amendable<LifecycleEnvelope> for LifecycleEnvelope {
    fn amend(
        &mut self,
        actor_id: Uuid,
        new_document_number: String,
    ) -> DomainResult<LifecycleEnvelope> {
        if self.status != DocumentStatus::Cancelled {
            return Err(DomainError::invalid_transition(
                self.status.as_str(),
                "AMENDED",
            ));
        }

        self.metadata.updated_by = actor_id;
        self.metadata.updated_at = Utc::now();
        self.metadata.version += 1;

        let new_meta = DocumentMetadata::new(
            self.metadata.tenant_id,
            self.metadata.company_id,
            new_document_number,
            actor_id,
        );
        let mut new_envelope = LifecycleEnvelope::new(new_meta);
        new_envelope.metadata.amended_from_id = Some(self.metadata.id);
        Ok(new_envelope)
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
}

/// Shared trait implemented by typed document lines (QKRN-001)
pub trait DocumentLine {
    fn line_id(&self) -> Uuid;
    fn header_id(&self) -> Uuid;
}

/// Validate that all lines belong to the expected document header (QKRN-001)
pub fn validate_header_line_relationship<H: DocumentHeader, L: DocumentLine>(
    header: &H,
    lines: &[L],
) -> DomainResult<()> {
    let header_id = header.document_id();
    for (idx, line) in lines.iter().enumerate() {
        if line.header_id() != header_id {
            let msg = format!(
                "Line item at index {} references header_id {}, expected {}",
                idx,
                line.header_id(),
                header_id
            );
            return Err(DomainError::business_rule("MismatchedHeaderLineID", &msg));
        }
    }
    Ok(())
}
