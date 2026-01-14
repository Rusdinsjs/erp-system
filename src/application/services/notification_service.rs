//! Notification Service

use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{Notification, NotificationRepository};

#[derive(Clone)]
pub struct NotificationService {
    repository: NotificationRepository,
}

impl NotificationService {
    pub fn new(repository: NotificationRepository) -> Self {
        Self { repository }
    }

    /// Create a new notification
    pub async fn create(
        &self,
        user_id: Uuid,
        title: &str,
        message: &str,
        entity_type: Option<&str>,
        entity_id: Option<Uuid>,
    ) -> DomainResult<Notification> {
        let notification = Notification {
            id: Uuid::new_v4(),
            user_id,
            template_id: None,
            title: title.to_string(),
            message: message.to_string(),
            data: None,
            channel: "in_app".to_string(),
            entity_type: entity_type.map(|s| s.to_string()),
            entity_id,
            is_read: false,
            read_at: None,
            is_sent: false,
            sent_at: None,
            created_at: chrono::Utc::now(),
        };

        self.repository
            .create(&notification)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get notifications for a user
    pub async fn list_by_user(
        &self,
        user_id: Uuid,
        page: i64,
        per_page: i64,
    ) -> DomainResult<Vec<Notification>> {
        let offset = (page - 1) * per_page;
        self.repository
            .list_by_user(user_id, per_page, offset)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get unread notifications
    pub async fn list_unread(&self, user_id: Uuid) -> DomainResult<Vec<Notification>> {
        self.repository
            .list_unread(user_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Count unread notifications
    pub async fn count_unread(&self, user_id: Uuid) -> DomainResult<i64> {
        self.repository
            .count_unread(user_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Mark notification as read
    pub async fn mark_as_read(&self, id: Uuid) -> DomainResult<bool> {
        self.repository
            .mark_as_read(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Mark all notifications as read
    pub async fn mark_all_as_read(&self, user_id: Uuid) -> DomainResult<i64> {
        self.repository
            .mark_all_as_read(user_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Delete notification
    pub async fn delete(&self, id: Uuid) -> DomainResult<bool> {
        self.repository
            .delete(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    // Helper methods for specific notification types
    pub async fn notify_loan_approved(
        &self,
        user_id: Uuid,
        asset_name: &str,
        loan_id: Uuid,
    ) -> DomainResult<Notification> {
        self.create(
            user_id,
            &format!("Loan Approved: {}", asset_name),
            &format!(
                "Your loan request for {} has been approved. Please pick up the asset.",
                asset_name
            ),
            Some("loan"),
            Some(loan_id),
        )
        .await
    }

    pub async fn notify_loan_overdue(
        &self,
        user_id: Uuid,
        asset_name: &str,
        days_overdue: i64,
        loan_id: Uuid,
    ) -> DomainResult<Notification> {
        self.create(
            user_id,
            &format!("OVERDUE: {}", asset_name),
            &format!(
                "Your loan for {} is {} days overdue. Please return immediately.",
                asset_name, days_overdue
            ),
            Some("loan"),
            Some(loan_id),
        )
        .await
    }

    pub async fn notify_work_order_assigned(
        &self,
        technician_id: Uuid,
        wo_number: &str,
        asset_name: &str,
        wo_id: Uuid,
    ) -> DomainResult<Notification> {
        self.create(
            technician_id,
            &format!("Work Order Assigned: {}", wo_number),
            &format!(
                "You have been assigned work order {} for {}.",
                wo_number, asset_name
            ),
            Some("work_order"),
            Some(wo_id),
        )
        .await
    }

    pub async fn notify_maintenance_due(
        &self,
        user_id: Uuid,
        asset_name: &str,
        due_date: &str,
        asset_id: Uuid,
    ) -> DomainResult<Notification> {
        self.create(
            user_id,
            &format!("Maintenance Due: {}", asset_name),
            &format!(
                "Scheduled maintenance for {} is due on {}.",
                asset_name, due_date
            ),
            Some("asset"),
            Some(asset_id),
        )
        .await
    }
}
