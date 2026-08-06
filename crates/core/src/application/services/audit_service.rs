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

    pub async fn get_system_logs(
        &self,
        query: crate::application::dto::AuditLogQuery,
    ) -> DomainResult<
        crate::application::dto::PaginatedResponse<crate::domain::entities::AuditLogEntry>,
    > {
        let page = query.page.unwrap_or(1).max(1);
        let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
        let offset = (page - 1) * per_page;

        let items = self
            .repository
            .find_logs(
                query.entity_type.as_deref(),
                query.action.as_deref(),
                query.user_id,
                query.entity_id,
                offset,
                per_page,
            )
            .await?;

        let total = self
            .repository
            .count_logs(
                query.entity_type.as_deref(),
                query.action.as_deref(),
                query.user_id,
                query.entity_id,
            )
            .await?;

        Ok(crate::application::dto::PaginatedResponse::new(
            items, total, page, per_page,
        ))
    }

    /// Background listener for the internal event bus to automatically log activities
    pub fn start_event_listener(
        &self,
        mut receiver: tokio::sync::broadcast::Receiver<crate::domain::events::SystemEvent>,
    ) {
        let service = self.clone();
        tokio::spawn(async move {
            tracing::info!("Audit Service event listener started");
            while let Ok(event) = receiver.recv().await {
                match event {
                    crate::domain::events::SystemEvent::LoanRequested {
                        loan_id,
                        asset_id,
                        borrower_id,
                        ..
                    } => {
                        let _ = service
                            .repository
                            .create_log(
                                "loans",
                                loan_id,
                                "CREATE_REQUEST",
                                serde_json::json!({ "asset_id": asset_id, "borrower_id": borrower_id }),
                                borrower_id, // Assuming borrower is the actor/subject
                            )
                            .await;
                    }
                    crate::domain::events::SystemEvent::LoanApproved {
                        loan_id,
                        asset_id,
                        borrower_id,
                        ..
                    } => {
                        let _ = service
                            .repository
                            .create_log(
                                "loans",
                                loan_id,
                                "APPROVE",
                                serde_json::json!({ "asset_id": asset_id, "borrower_id": borrower_id }),
                                None, // Ideally approver_id should be in event
                            )
                            .await;
                    }
                    // Add more mappings as needed
                    _ => {}
                }
            }
        });
    }
}
