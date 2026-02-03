//! Contract Document Entity
//!
//! Manages contract-related documents with versioning support
//!

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Contract Document Entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ContractDocument {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub document_type: String,
    pub file_name: String,
    pub file_path: String,
    pub file_size: i64,
    pub mime_type: String,
    pub version: i32,
    pub is_active: bool,
    pub notes: Option<String>,
    pub uploaded_by: Uuid,
    pub uploaded_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateContractDocumentRequest {
    pub contract_id: Uuid,
    pub document_type: String,
    pub file_name: String,
    pub file_path: String,
    pub file_size: i64,
    pub mime_type: String,
    pub version: i32,
    pub uploaded_by: Uuid,
    pub notes: Option<String>,
}

impl ContractDocument {
    /// Create a new contract document
    pub fn new(req: CreateContractDocumentRequest) -> Self {
        Self {
            id: Uuid::new_v4(),
            contract_id: req.contract_id,
            document_type: req.document_type,
            file_name: req.file_name,
            file_path: req.file_path,
            file_size: req.file_size,
            mime_type: req.mime_type,
            version: req.version,
            is_active: true,
            notes: req.notes,
            uploaded_by: req.uploaded_by,
            uploaded_at: Utc::now(),
        }
    }

    /// Get file extension from filename
    pub fn file_extension(&self) -> Option<&str> {
        self.file_name.rsplit('.').next()
    }

    /// Check if document is a PDF
    pub fn is_pdf(&self) -> bool {
        self.mime_type == "application/pdf"
    }

    /// Check if document is an image
    pub fn is_image(&self) -> bool {
        self.mime_type.starts_with("image/")
    }

    /// Format file size to human readable
    pub fn formatted_size(&self) -> String {
        let size = self.file_size as f64;
        if size < 1024.0 {
            format!("{} B", size)
        } else if size < 1024.0 * 1024.0 {
            format!("{:.2} KB", size / 1024.0)
        } else if size < 1024.0 * 1024.0 * 1024.0 {
            format!("{:.2} MB", size / (1024.0 * 1024.0))
        } else {
            format!("{:.2} GB", size / (1024.0 * 1024.0 * 1024.0))
        }
    }
}
