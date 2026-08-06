//! Intercompany Transfer & Cross-Company Document Rules (QTEN-008)
//!
//! Enforces explicit transfer document requirement for cross-company stock/asset/GL operations.
//! Silent cross-company writes are strictly prohibited.

use crate::domain::errors::{DomainError, DomainResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Explicit Intercompany Transfer Document (QTEN-008)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct IntercompanyTransferDocument {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub source_company_id: Uuid,
    pub target_company_id: Uuid,
    pub document_number: String,
    pub transfer_type: String, // "ASSET_TRANSFER", "STOCK_TRANSFER", "INTERCOMPANY_SALE"
    pub resource_type: String,
    pub resource_id: Uuid,
    pub status: String, // "DRAFT", "SUBMITTED", "APPROVED", "COMPLETED", "REJECTED"
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl IntercompanyTransferDocument {
    pub fn new(
        tenant_id: Uuid,
        source_company_id: Uuid,
        target_company_id: Uuid,
        document_number: String,
        transfer_type: String,
        resource_type: String,
        resource_id: Uuid,
    ) -> DomainResult<Self> {
        if source_company_id == target_company_id {
            return Err(DomainError::business_rule(
                "SameCompanyTransferInvalid",
                "Source and target company must be different for intercompany transfer",
            ));
        }

        let now = Utc::now();
        Ok(Self {
            id: Uuid::new_v4(),
            tenant_id,
            source_company_id,
            target_company_id,
            document_number,
            transfer_type,
            resource_type,
            resource_id,
            status: "DRAFT".to_string(),
            notes: None,
            created_at: now,
            updated_at: now,
        })
    }
}

/// Enforce that cross-company GL, asset, or stock writes require an explicit IntercompanyTransferDocument (QTEN-008)
pub fn validate_company_mutation_boundary(
    source_company_id: Uuid,
    target_company_id: Uuid,
    transfer_document_id: Option<Uuid>,
) -> DomainResult<()> {
    if source_company_id != target_company_id && transfer_document_id.is_none() {
        return Err(DomainError::business_rule(
            "SilentCrossCompanyMutationBlocked",
            "Cross-company GL or stock write requires an explicit IntercompanyTransferDocument",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_silent_cross_company_mutation_blocked() {
        let cmp_a = Uuid::new_v4();
        let cmp_b = Uuid::new_v4();

        // 1. Same company mutation without document -> OK
        assert!(validate_company_mutation_boundary(cmp_a, cmp_a, None).is_ok());

        // 2. Cross-company mutation without transfer document -> BLOCKED
        let blocked = validate_company_mutation_boundary(cmp_a, cmp_b, None);
        assert!(blocked.is_err());
        if let Err(DomainError::BusinessRuleViolation { rule, .. }) = blocked {
            assert_eq!(rule, "SilentCrossCompanyMutationBlocked");
        } else {
            panic!("Expected SilentCrossCompanyMutationBlocked error");
        }

        // 3. Cross-company mutation WITH explicit transfer document -> ALLOWED
        let doc_id = Uuid::new_v4();
        assert!(validate_company_mutation_boundary(cmp_a, cmp_b, Some(doc_id)).is_ok());
    }
}
