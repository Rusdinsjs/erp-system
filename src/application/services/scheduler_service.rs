//! Scheduler Service
//!
//! Manages background jobs and scheduled tasks.

use tokio_cron_scheduler::{Job, JobScheduler};
use tracing::{error, info};

use crate::application::services::{LoanService, MaintenanceService, WorkOrderService};

/// Scheduler service
#[derive(Clone)]
pub struct SchedulerService {
    loan_service: LoanService,
    maintenance_service: MaintenanceService,
    work_order_service: WorkOrderService,
    notification_service: crate::application::services::NotificationService,
}

impl SchedulerService {
    pub fn new(
        loan_service: LoanService,
        maintenance_service: MaintenanceService,
        work_order_service: WorkOrderService,
        notification_service: crate::application::services::NotificationService,
    ) -> Self {
        Self {
            loan_service,
            maintenance_service,
            work_order_service,
            notification_service,
        }
    }

    /// Start the scheduler
    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let sched = JobScheduler::new().await?;

        // Job 1: Check overdue loans daily at 00:00
        let loan_service = self.loan_service.clone();
        sched
            .add(Job::new_async("0 0 0 * * *", move |_uuid, _l| {
                let service = loan_service.clone();
                Box::pin(async move {
                    info!("Running scheduled job: Check Overdue Loans");
                    // Implement strict checking logic here if needed,
                    // currently we rely on list_overdue_loans or similar
                    // But usually we want to explicitely ACTION on them (e.g. update status)
                    // For now, we'll just log. In a real app we'd call a specific batch process method.
                    match service.check_overdue_loans().await {
                        Ok(_) => info!("Overdue loans check completed"),
                        Err(e) => error!("Error checking overdue loans: {}", e),
                    }
                })
            })?)
            .await?;

        // Job 2: Check maintenance due daily at 01:00
        let maintenance_service = self.maintenance_service.clone();
        let work_order_service = self.work_order_service.clone();
        let notification_service = self.notification_service.clone();

        sched
            .add(Job::new_async("0 0 1 * * *", move |_uuid, _l| {
                let m_service = maintenance_service.clone();
                let wo_service = work_order_service.clone();
                let n_service = notification_service.clone();
                Box::pin(async move {
                    info!("Running scheduled job: Check Maintenance Due");
                    match m_service.check_upcoming_maintenance().await {
                        Ok(records) => {
                            for record in &records {
                                info!("Auto-creating Work Order for Asset: {}", record.asset_id);
                                let req = crate::application::services::CreateWorkOrderRequest {
                                    asset_id: record.asset_id,
                                    wo_type: "preventive".to_string(),
                                    priority: Some("medium".to_string()),
                                    scheduled_date: record.next_service_date,
                                    due_date: record
                                        .next_service_date
                                        .map(|d| d + chrono::Duration::days(3)),
                                    problem_description: Some(format!(
                                        "Automated preventive maintenance based on record {}.",
                                        record.id
                                    )),
                                    estimated_hours: None,
                                    estimated_cost: None,
                                    safety_requirements: None,
                                    lockout_tagout_required: None,
                                    location_id: None,
                                    target_category_id: None,
                                    target_specifications: None,
                                    conversion_notes: None,
                                    conversion_type: None,
                                };

                                match wo_service.create(req, None).await {
                                    Ok(wo) => {
                                        info!("Successfully auto-created WO: {}", wo.wo_number);
                                        // Send notification to admins
                                        let _ = n_service.notify_admins(
                                            "maintenance_due",
                                            serde_json::json!({
                                                "asset_name": format!("Asset ID: {}", record.asset_id),
                                                "due_date": record.next_service_date.unwrap_or_default().to_string()
                                            }),
                                            Some("asset"),
                                            Some(record.asset_id)
                                        ).await;
                                    },
                                    Err(e) => {
                                        error!(
                                            "Failed to auto-create WO for asset {}: {}",
                                            record.asset_id, e
                                        );
                                    }
                                }
                            }
                            info!(
                                "Maintenance check completed, processed {} records",
                                records.len()
                            );
                        }
                        Err(e) => error!("Error checking maintenance: {}", e),
                    }
                })
            })?)
            .await?;

        sched.start().await?;
        info!("Scheduler started");

        Ok(())
    }
}
