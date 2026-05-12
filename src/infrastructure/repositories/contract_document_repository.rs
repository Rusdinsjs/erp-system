use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::ContractDocument;
use crate::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct ContractDocumentRepository {
    pool: PgPool,
}

impl ContractDocumentRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new contract document
    pub async fn create(&self, document: &ContractDocument) -> DomainResult<ContractDocument> {
        let rec = sqlx::query_as!(
            ContractDocument,
            r#"
            INSERT INTO contract_documents (
                id, contract_id, document_type, file_name, file_path,
                file_size, mime_type, version, is_active, notes, uploaded_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#,
            document.id,
            document.contract_id,
            document.document_type,
            document.file_name,
            document.file_path,
            document.file_size,
            document.mime_type,
            document.version,
            document.is_active,
            document.notes,
            document.uploaded_by
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    /// Find document by ID
    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<ContractDocument>> {
        let rec = sqlx::query_as!(
            ContractDocument,
            r#"
            SELECT * FROM contract_documents WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    /// Find all documents for a contract
    pub async fn find_by_contract_id(
        &self,
        contract_id: Uuid,
    ) -> DomainResult<Vec<ContractDocument>> {
        let recs = sqlx::query_as!(
            ContractDocument,
            r#"
            SELECT * FROM contract_documents 
            WHERE contract_id = $1 
            ORDER BY document_type, version DESC
            "#,
            contract_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    /// Find only active documents for a contract
    pub async fn find_active_by_contract_id(
        &self,
        contract_id: Uuid,
    ) -> DomainResult<Vec<ContractDocument>> {
        let recs = sqlx::query_as!(
            ContractDocument,
            r#"
            SELECT * FROM contract_documents 
            WHERE contract_id = $1 AND is_active = true
            ORDER BY document_type, uploaded_at DESC
            "#,
            contract_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    /// Get next version number for a document type
    pub async fn get_next_version(
        &self,
        contract_id: Uuid,
        document_type: &str,
    ) -> DomainResult<i32> {
        let result = sqlx::query!(
            r#"
            SELECT COALESCE(MAX(version), 0) + 1 as next_version
            FROM contract_documents
            WHERE contract_id = $1 AND document_type = $2
            "#,
            contract_id,
            document_type
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(result.next_version.unwrap_or(1))
    }

    /// Deactivate all previous versions of a document type
    pub async fn deactivate_previous_versions(
        &self,
        contract_id: Uuid,
        document_type: &str,
    ) -> DomainResult<()> {
        sqlx::query!(
            r#"
            UPDATE contract_documents
            SET is_active = false
            WHERE contract_id = $1 AND document_type = $2 AND is_active = true
            "#,
            contract_id,
            document_type
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }

    /// Delete a document
    pub async fn delete(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query!(
            r#"
            DELETE FROM contract_documents WHERE id = $1
            "#,
            id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }

    /// Count documents for a contract
    pub async fn count_by_contract(&self, contract_id: Uuid) -> DomainResult<i64> {
        let result = sqlx::query!(
            r#"
            SELECT COUNT(*) as count FROM contract_documents
            WHERE contract_id = $1 AND is_active = true
            "#,
            contract_id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(result.count.unwrap_or(0))
    }
}
