//! Notification Service
//!
//! Handles in-app notifications and real-time WebSocket broadcasts.
//! Supports template rendering for smart triggers.

use rust_decimal::Decimal;
use serde_json::json;
use std::sync::Arc;

use uuid::Uuid;

use crate::api::handlers::notification_ws::{NotificationMessage, WebSocketManager};
use crate::domain::entities::notification::Notification;
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::NotificationRepository;

#[derive(Clone)]
pub struct NotificationService {
    repository: NotificationRepository,
    ws_manager: Arc<WebSocketManager>,
    whatsapp_service: crate::application::services::WhatsAppService,
}

impl NotificationService {
    pub fn new(
        repository: NotificationRepository,
        ws_manager: Arc<WebSocketManager>,
        whatsapp_service: crate::application::services::WhatsAppService,
    ) -> Self {
        Self {
            repository,
            ws_manager,
            whatsapp_service,
        }
    }

    /// Create and broadcast a notification
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

        let created = self
            .repository
            .create(&notification)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        // Broadcast via WebSocket
        self.ws_manager
            .broadcast(&NotificationMessage {
                event_type: "NOTIFICATION_RECEIVED".to_string(),
                payload: json!(created),
            })
            .await;

        // NEW: Send WhatsApp if user has phone
        if let Ok(Some(phone)) = self.repository.find_user_phone(user_id).await {
            let wa_message = format!("🔔 *{}*\n\n{}", title, message);
            let _ = self.whatsapp_service.send_message(phone, wa_message).await;
        }

        Ok(created)
    }

    /// Create notification using a template
    pub async fn create_from_template(
        &self,
        user_id: Uuid,
        template_code: &str,
        template_data: serde_json::Value,
        entity_type: Option<&str>,
        entity_id: Option<Uuid>,
    ) -> DomainResult<Notification> {
        // Fetch template
        let template = self
            .repository
            .find_template_by_code(template_code)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?
            .ok_or_else(|| DomainError::not_found("NotificationTemplate", template_code))?;

        if !template.is_active {
            return Err(DomainError::bad_request("Template is inactive"));
        }

        // Render title and message (simple replacement)
        let mut title = template.subject_template.clone().unwrap_or_default();
        let mut message = template.body_template.clone().unwrap_or_default();

        if let Some(obj) = template_data.as_object() {
            for (key, val) in obj {
                let placeholder = format!("{{{{{}}}}}", key);
                let val_str = match val {
                    serde_json::Value::String(s) => s.clone(),
                    _ => val.to_string(),
                };
                title = title.replace(&placeholder, &val_str);
                message = message.replace(&placeholder, &val_str);
            }
        }

        let notification = Notification {
            id: Uuid::new_v4(),
            user_id,
            template_id: Some(template.id),
            title,
            message,
            data: Some(template_data),
            channel: "in_app".to_string(),
            entity_type: entity_type.map(|s| s.to_string()),
            entity_id,
            is_read: false,
            read_at: None,
            is_sent: false,
            sent_at: None,
            created_at: chrono::Utc::now(),
        };

        let created = self
            .repository
            .create(&notification)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        // Broadcast
        self.ws_manager
            .broadcast(&NotificationMessage {
                event_type: template.event_type.to_uppercase(),
                payload: json!(created),
            })
            .await;

        // NEW: Send WhatsApp if user has phone and template allows it
        // (For now we send if phone exists)
        if let Ok(Some(phone)) = self.repository.find_user_phone(user_id).await {
            let wa_message = format!("🔔 *{}*\n\n{}", title, message);
            let _ = self.whatsapp_service.send_message(phone, wa_message).await;
        }

        Ok(created)
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
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    /// Get unread notifications
    pub async fn list_unread(&self, user_id: Uuid) -> DomainResult<Vec<Notification>> {
        self.repository
            .list_unread(user_id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    /// Count unread notifications
    pub async fn count_unread(&self, user_id: Uuid) -> DomainResult<i64> {
        self.repository
            .count_unread(user_id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn mark_as_read(&self, id: Uuid) -> DomainResult<bool> {
        self.repository
            .mark_as_read(id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn mark_all_as_read(&self, user_id: Uuid) -> DomainResult<i64> {
        self.repository
            .mark_all_as_read(user_id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    // Smart Trigger Methods

    pub async fn notify_loan_approved(
        &self,
        user_id: Uuid,
        asset_name: &str,
        loan_id: Uuid,
    ) -> DomainResult<Notification> {
        self.create_from_template(
            user_id,
            "loan_approved",
            json!({ "asset_name": asset_name }),
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
        self.create_from_template(
            user_id,
            "loan_overdue",
            json!({
                "asset_name": asset_name,
                "days_overdue": days_overdue
            }),
            Some("loan"),
            Some(loan_id),
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
        self.create_from_template(
            user_id,
            "maintenance_due",
            json!({
                "asset_name": asset_name,
                "due_date": due_date
            }),
            Some("asset"),
            Some(asset_id),
        )
        .await
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn notify_sensor_alert(
        &self,
        user_id: Uuid,
        asset_name: &str,
        sensor_type: &str,
        value: f64,
        threshold: f64,
        severity: &str,
        asset_id: Uuid,
    ) -> DomainResult<Notification> {
        self.create_from_template(
            user_id,
            "sensor_alert",
            json!({
                "asset_name": asset_name,
                "sensor_type": sensor_type,
                "value": value,
                "threshold": threshold,
                "severity": severity
            }),
            Some("asset"),
            Some(asset_id),
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
        self.create_from_template(
            technician_id,
            "work_order_assigned",
            json!({
                "wo_number": wo_number,
                "asset_name": asset_name
            }),
            Some("work_order"),
            Some(wo_id),
        )
        .await
    }

    /// Broadcast a notification to all admins
    pub async fn notify_admins(
        &self,
        template_code: &str,
        template_data: serde_json::Value,
        entity_type: Option<&str>,
        entity_id: Option<Uuid>,
    ) -> DomainResult<()> {
        let admin_ids = self
            .repository
            .find_admins()
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        for admin_id in admin_ids {
            let _ = self
                .create_from_template(
                    admin_id,
                    template_code,
                    template_data.clone(),
                    entity_type,
                    entity_id,
                )
                .await;
        }

        // NEW: Also send to WhatsApp Admin numbers configured in settings
        let wa_message = format!("📢 *ADMIN ALERT: {}*\nData: {}", template_code.to_uppercase(), template_data);
        let _ = self.whatsapp_service.notify_admins(wa_message).await;

        Ok(())
    }

    pub async fn notify_low_stock(
        &self,
        item_name: &str,
        current_quantity: Decimal,
        min_stock: Decimal,
    ) -> DomainResult<()> {
        self.notify_admins(
            "low_stock_alert",
            json!({
                "item_name": item_name,
                "current_quantity": current_quantity,
                "min_stock": min_stock
            }),
            Some("inventory_item"),
            None,
        )
        .await
    }

    /// Generic WebSocket broadcast
    pub async fn broadcast(&self, event_type: &str, payload: serde_json::Value) {
        self.ws_manager
            .broadcast(&NotificationMessage {
                event_type: event_type.to_string(),
                payload,
            })
            .await;
    }

    /// Background listener for the internal event bus
    pub fn start_event_listener(
        &self,
        mut receiver: tokio::sync::broadcast::Receiver<crate::domain::events::SystemEvent>,
    ) {
        let service = self.clone();
        tokio::spawn(async move {
            tracing::info!("Notification Service event listener started");
            while let Ok(event) = receiver.recv().await {
                match event {
                    crate::domain::events::SystemEvent::ExpenseCreated(expense) => {
                        // Example: Notify admins for all new expenses
                        let _ = service
                            .notify_admins(
                                "expense_created",
                                json!({
                                    "expense_number": expense.expense_number,
                                    "amount": expense.total_amount,
                                    "type": expense.expense_type
                                }),
                                Some("expense"),
                                Some(expense.id),
                            )
                            .await;
                    }
                    crate::domain::events::SystemEvent::LoanRequested {
                        loan_id,
                        asset_name,
                        ..
                    } => {
                        let _ = service
                            .broadcast(
                                "LOAN_CREATED",
                                json!({ "id": loan_id, "asset_name": asset_name }),
                            )
                            .await;
                    }
                    crate::domain::events::SystemEvent::LoanApproved {
                        loan_id,
                        borrower_id,
                        asset_name,
                        ..
                    } => {
                        if let Some(uid) = borrower_id {
                            let _ = service
                                .notify_loan_approved(uid, &asset_name, loan_id)
                                .await;
                        }
                    }
                    crate::domain::events::SystemEvent::LoanRejected {
                        loan_id,
                        asset_name,
                        borrower_id,
                        reason,
                        ..
                    } => {
                        if let Some(uid) = borrower_id {
                            let _ = service
                                .create(
                                    uid,
                                    &format!("Loan Rejected: {}", asset_name),
                                    &format!(
                                        "Your loan request for {} has been rejected. Reason: {}",
                                        asset_name,
                                        reason.unwrap_or_else(|| "No reason provided".to_string())
                                    ),
                                    Some("loan"),
                                    Some(loan_id),
                                )
                                .await;
                        }
                    }
                    crate::domain::events::SystemEvent::LoanCheckedOut { loan_id, .. } => {
                        let _ = service
                            .broadcast("LOAN_CHECKOUT", json!({ "id": loan_id }))
                            .await;
                    }
                    crate::domain::events::SystemEvent::LoanReturned { loan_id, .. } => {
                        let _ = service
                            .broadcast("LOAN_RETURNED", json!({ "id": loan_id }))
                            .await;
                    }
                    crate::domain::events::SystemEvent::LoanOverdue {
                        loan_id,
                        borrower_id,
                        asset_name,
                        days_overdue,
                    } => {
                        if let Some(uid) = borrower_id {
                            let _ = service
                                .notify_loan_overdue(uid, &asset_name, days_overdue, loan_id)
                                .await;
                        }
                    }
                    crate::domain::events::SystemEvent::LowStockAlert {
                        item_name,
                        current_qty,
                        min_qty,
                    } => {
                        let _ = service
                            .notify_low_stock(&item_name, current_qty, min_qty)
                            .await;
                    }
                    _ => {}
                }
            }
        });
    }
}
