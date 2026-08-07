//! Scheduler Service (Moved to api-server to avoid cross-crate orchestration issues)
//!
//! Manages background jobs and scheduled tasks.

use tokio_cron_scheduler::{Job, JobScheduler};
use tracing::{error, info};

use management_system_assets::AssetService;
use management_system_core::application::services::NotificationService;
use management_system_core::application::services::{LoanService, MaintenanceService};
use management_system_finance::DepreciationService;
use management_system_ops::TaxRenewalService;
use management_system_ops::WorkOrderService;

/// Scheduler service
#[derive(Clone)]
pub struct SchedulerService {
    loan_service: LoanService,
    maintenance_service: MaintenanceService,
    work_order_service: WorkOrderService,
    notification_service: NotificationService,
    asset_service: AssetService,
    tax_renewal_service: TaxRenewalService,
    depreciation_service: DepreciationService,
}

impl SchedulerService {
    pub fn new(
        loan_service: LoanService,
        maintenance_service: MaintenanceService,
        work_order_service: WorkOrderService,
        notification_service: NotificationService,
        asset_service: AssetService,
        tax_renewal_service: TaxRenewalService,
        depreciation_service: DepreciationService,
    ) -> Self {
        Self {
            loan_service,
            maintenance_service,
            work_order_service,
            notification_service,
            asset_service,
            tax_renewal_service,
            depreciation_service,
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
                            let records: Vec<management_system_core::domain::entities::MaintenanceRecord> = records;
                            for record in &records {
                                info!("Auto-creating Work Order for Asset: {}", record.asset_id);
                                let req = management_system_ops::CreateWorkOrderRequest {
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
                                    assigned_technician: None,
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

        // Job 3: Check vehicle expires daily at 02:00
        let asset_service = self.asset_service.clone();
        sched
            .add(Job::new_async("0 0 2 * * *", move |_uuid, _l| {
                let service = asset_service.clone();
                Box::pin(async move {
                    info!("Running scheduled job: Check Vehicle Expiries");
                    match service.check_upcoming_expiries().await {
                        Ok(count) => info!(
                            "Vehicle expiries check completed, sent {} notifications",
                            count
                        ),
                        Err(e) => error!("Error checking vehicle expiries: {}", e),
                    }
                })
            })?)
            .await?;

        // Job 4: Create Tax Renewals daily at 02:30
        let tr_service = self.tax_renewal_service.clone();
        sched
            .add(Job::new_async("0 30 2 * * *", move |_uuid, _l| {
                let service = tr_service.clone();
                Box::pin(async move {
                    info!("Running scheduled job: Detect Expiring Assets for Renewal Workflow");
                    match service.detect_expiring_assets().await {
                        Ok(count) => info!(
                            "Tax renewal detection completed, created {} pending records",
                            count
                        ),
                        Err(e) => error!("Error detecting tax renewals: {}", e),
                    }
                })
            })?)
            .await?;

        // Job 5: Monthly Depreciation (1st of month at 01:00 AM)
        let dep_service = self.depreciation_service.clone();
        sched
            .add(Job::new_async("0 0 1 1 * *", move |_uuid, _l| {
                let service = dep_service.clone();
                Box::pin(async move {
                    info!("Running scheduled job: Monthly Depreciation Process");
                    match service.process_monthly_depreciation().await {
                        Ok(count) => {
                            info!("Depreciation process completed, processed {} assets", count)
                        }
                        Err(e) => error!("Error processing depreciation: {}", e),
                    }
                })
            })?)
            .await?;

        // For testing: Run detection on startup
        info!("Running initial tax renewal detection on startup...");
        if let Err(e) = self.tax_renewal_service.detect_expiring_assets().await {
            error!("Error running initial detection: {}", e);
        }

        sched.start().await?;
        info!("Scheduler started");

        Ok(())
    }
}
