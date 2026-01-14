use chrono::Utc;
use uuid::Uuid;

use crate::domain::entities::{AuditRecord, AuditSession};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::AuditRepository;

#[derive(Clone)]
pub struct AuditService {
    repository: AuditRepository,
}

impl AuditService {
    pub fn new(repository: AuditRepository) -> Self {
        Self { repository }
    }

    pub async fn start_session(
        &self,
        user_id: Uuid,
        notes: Option<String>,
    ) -> DomainResult<AuditSession> {
        let active = self.repository.find_active_session().await?;
        if active.is_some() {
            return Err(DomainError::business_rule(
                "Audit",
                "An open audit session already exists.",
            ));
        }

        let session = AuditSession {
            id: Uuid::new_v4(),
            user_id,
            status: "open".to_string(),
            notes,
            created_at: Utc::now(),
            closed_at: None,
        };

        self.repository.create_session(&session).await
    }

    pub async fn get_active_session(&self) -> DomainResult<Option<AuditSession>> {
        self.repository.find_active_session().await
    }

    pub async fn close_session(&self, session_id: Uuid) -> DomainResult<AuditSession> {
        self.repository.close_session(session_id).await
    }

    pub async fn submit_record(
        &self,
        session_id: Uuid,
        asset_id: Uuid,
        status: &str,
        notes: Option<String>,
    ) -> DomainResult<AuditRecord> {
        // Here we could validate that session is open, or if asset exists in repository.
        // For simplicity, we trust the frontend/ID correctness or let DB constraint fail.

        let record = AuditRecord {
            id: Uuid::new_v4(),
            session_id,
            asset_id,
            status: status.to_string(),
            notes,
            scanned_at: Utc::now(),
            asset_code: None, // Will be filled by DB if query joins, or ignored on insert
            asset_name: None,
        };

        self.repository.add_record(&record).await
    }

    pub async fn get_progress(&self, session_id: Uuid) -> DomainResult<(i64, i64)> {
        self.repository.get_session_progress(session_id).await
    }
}
