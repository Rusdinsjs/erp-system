//! Timesheet Service
//!
//! Business logic for rental timesheet operations with 3-level approval workflow.
//! Workflow: Checker → Verifier → Client PIC

use chrono::NaiveDate;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::application::dto::{
    ClientApproveTimesheetRequest, CreateClientContactRequest, CreateTimesheetRequest,
    SubmitTimesheetRequest, TimesheetDetailResponse, TimesheetSummary, UpdateTimesheetRequest,
    VerifyTimesheetRequest,
};
use crate::domain::entities::{ClientContact, RentalTimesheet};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{RentalRepository, TimesheetRepository};

#[derive(Clone)]
pub struct TimesheetService {
    timesheet_repo: TimesheetRepository,
    rental_repo: RentalRepository,
}

impl TimesheetService {
    pub fn new(timesheet_repo: TimesheetRepository, rental_repo: RentalRepository) -> Self {
        Self {
            timesheet_repo,
            rental_repo,
        }
    }

    // ==================== TIMESHEET OPERATIONS ====================

    /// Create timesheet entry (by Checker)
    pub async fn create_timesheet(
        &self,
        request: CreateTimesheetRequest,
        checker_id: Uuid,
    ) -> DomainResult<RentalTimesheet> {
        // Validate rental exists and is active
        let rental = self
            .rental_repo
            .find_by_id(request.rental_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Rental", request.rental_id))?;

        // Validate rental status allows timesheet entry
        if rental.status != "rented_out" && rental.status != "overdue" {
            return Err(DomainError::business_rule(
                "rental_status",
                &format!(
                    "Cannot create timesheet for rental with status '{}'. Must be 'rented_out' or 'overdue'",
                    rental.status
                ),
            ));
        }

        // Create timesheet
        let mut timesheet = RentalTimesheet::new(request.rental_id, request.work_date, checker_id);

        // Set hours
        timesheet.start_time = request.start_time;
        timesheet.end_time = request.end_time;
        timesheet.operating_hours = Some(request.operating_hours);
        timesheet.standby_hours = request.standby_hours;
        timesheet.breakdown_hours = request.breakdown_hours;

        // Set HM/KM
        timesheet.hm_km_start = request.hm_km_start;
        timesheet.hm_km_end = request.hm_km_end;
        if let (Some(start), Some(end)) = (request.hm_km_start, request.hm_km_end) {
            timesheet.hm_km_usage = Some(end - start);
        }

        // Set operation details
        timesheet.operation_status = request.operation_status;
        timesheet.breakdown_reason = request.breakdown_reason;
        timesheet.work_description = request.work_description;
        timesheet.work_location = request.work_location;

        // Set photos
        if let Some(photos) = request.photos {
            timesheet.photos = Some(serde_json::json!(photos));
        }

        timesheet.checker_notes = request.notes;

        // Calculate overtime (hours > 8)
        let standard_hours = Decimal::from(8);
        timesheet.calculate_overtime(standard_hours);

        // Save
        let created = self
            .timesheet_repo
            .create_timesheet(&timesheet)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(created)
    }

    /// Update timesheet (by Checker, only if status = draft)
    pub async fn update_timesheet(
        &self,
        id: Uuid,
        request: UpdateTimesheetRequest,
        checker_id: Uuid,
    ) -> DomainResult<RentalTimesheet> {
        let mut timesheet = self.get_by_id(id).await?;

        // Only draft timesheets can be edited
        if timesheet.status.as_deref() != Some("draft") {
            return Err(DomainError::business_rule(
                "timesheet_status",
                "Only draft timesheets can be edited",
            ));
        }

        // Only the checker who created it can edit
        if timesheet.checker_id != Some(checker_id) {
            return Err(DomainError::Unauthorized {
                action: "edit this timesheet".to_string(),
            });
        }

        // Apply updates
        if let Some(start) = request.start_time {
            timesheet.start_time = Some(start);
        }
        if let Some(end) = request.end_time {
            timesheet.end_time = Some(end);
        }
        if let Some(hours) = request.operating_hours {
            timesheet.operating_hours = Some(hours);
        }
        if let Some(standby) = request.standby_hours {
            timesheet.standby_hours = Some(standby);
        }
        if let Some(breakdown) = request.breakdown_hours {
            timesheet.breakdown_hours = Some(breakdown);
        }
        if let Some(start) = request.hm_km_start {
            timesheet.hm_km_start = Some(start);
        }
        if let Some(end) = request.hm_km_end {
            timesheet.hm_km_end = Some(end);
        }
        if let Some(status) = request.operation_status {
            timesheet.operation_status = status;
        }
        if request.breakdown_reason.is_some() {
            timesheet.breakdown_reason = request.breakdown_reason;
        }
        if request.work_description.is_some() {
            timesheet.work_description = request.work_description;
        }
        if request.work_location.is_some() {
            timesheet.work_location = request.work_location;
        }
        if let Some(photos) = request.photos {
            timesheet.photos = Some(serde_json::json!(photos));
        }
        if request.notes.is_some() {
            timesheet.checker_notes = request.notes;
        }

        // Recalculate
        timesheet.calculate_usage();
        timesheet.calculate_overtime(Decimal::from(8));

        // Persist
        self.timesheet_repo
            .update_timesheet(&timesheet)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Submit timesheet for verification (Checker → Verifier)
    pub async fn submit_timesheet(
        &self,
        id: Uuid,
        request: SubmitTimesheetRequest,
        _checker_id: Uuid,
    ) -> DomainResult<()> {
        let timesheet = self.get_by_id(id).await?;

        // Only draft timesheets can be submitted
        if timesheet.status.as_deref() != Some("draft") {
            return Err(DomainError::business_rule(
                "timesheet_status",
                "Only draft timesheets can be submitted",
            ));
        }

        self.timesheet_repo
            .submit_timesheet(id, request.checker_notes)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(())
    }

    /// Verify timesheet (by Verifier)
    pub async fn verify_timesheet(
        &self,
        id: Uuid,
        request: VerifyTimesheetRequest,
        verifier_id: Uuid,
    ) -> DomainResult<()> {
        let timesheet = self.get_by_id(id).await?;

        // Only submitted timesheets can be verified
        if timesheet.status.as_deref() != Some("submitted") {
            return Err(DomainError::business_rule(
                "timesheet_status",
                "Only submitted timesheets can be verified",
            ));
        }

        // Validate status
        let valid_statuses = ["approved", "rejected", "revision"];
        if !valid_statuses.contains(&request.status.as_str()) {
            return Err(DomainError::ValidationError {
                field: "status".to_string(),
                message: "Status must be 'approved', 'rejected', or 'revision'".to_string(),
            });
        }

        self.timesheet_repo
            .verify_timesheet(id, verifier_id, &request.status, request.notes)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(())
    }

    /// Client PIC approval (final approval)
    pub async fn client_approve_timesheet(
        &self,
        id: Uuid,
        request: ClientApproveTimesheetRequest,
    ) -> DomainResult<()> {
        let timesheet = self.get_by_id(id).await?;

        // Only verified timesheets can be client-approved
        if timesheet.status.as_deref() != Some("verified") {
            return Err(DomainError::business_rule(
                "timesheet_status",
                "Only verified timesheets can be approved by client",
            ));
        }

        // Validate client PIC exists and can approve
        let contact = self
            .timesheet_repo
            .find_contact_by_id(request.client_pic_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("ClientContact", request.client_pic_id))?;

        if !contact.can_approve_timesheet.unwrap_or(false) {
            return Err(DomainError::Unauthorized {
                action: "approve timesheet (no authority)".to_string(),
            });
        }

        self.timesheet_repo
            .client_approve_timesheet(id, request.client_pic_id, request.signature, request.notes)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(())
    }

    /// Get timesheet by ID
    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<RentalTimesheet> {
        self.timesheet_repo
            .find_timesheet_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Timesheet", id))
    }

    /// List timesheets for a rental
    pub async fn list_by_rental(
        &self,
        rental_id: Uuid,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
    ) -> DomainResult<Vec<RentalTimesheet>> {
        self.timesheet_repo
            .list_timesheets_by_rental(rental_id, start_date, end_date)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// List timesheets pending verification
    pub async fn list_pending_verification(&self) -> DomainResult<Vec<TimesheetDetailResponse>> {
        self.timesheet_repo
            .list_pending_verification()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get timesheet summary for a period
    pub async fn get_summary(
        &self,
        rental_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> DomainResult<TimesheetSummary> {
        // Get approved timesheets count
        let timesheets = self
            .timesheet_repo
            .list_timesheets_by_rental(rental_id, Some(start_date), Some(end_date))
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let total_entries = timesheets.len() as i64;
        let approved_entries = timesheets
            .iter()
            .filter(|t| t.status.as_deref() == Some("approved"))
            .count() as i64;
        let pending_entries = total_entries - approved_entries;

        // Get sums from approved timesheets
        let summary_row = self
            .timesheet_repo
            .sum_timesheets_for_period(rental_id, start_date, end_date)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(TimesheetSummary {
            rental_id,
            period_start: start_date,
            period_end: end_date,
            total_entries,
            total_operating_hours: summary_row.total_operating_hours,
            total_standby_hours: summary_row.total_standby_hours,
            total_overtime_hours: summary_row.total_overtime_hours,
            total_breakdown_hours: summary_row.total_breakdown_hours,
            total_hm_km_usage: summary_row.total_hm_km_usage,
            approved_entries,
            pending_entries,
        })
    }

    // ==================== CLIENT CONTACT OPERATIONS ====================

    /// Create client contact (PIC)
    pub async fn create_client_contact(
        &self,
        request: CreateClientContactRequest,
    ) -> DomainResult<ClientContact> {
        let mut contact = ClientContact::new(request.client_id, request.name);
        contact.position = request.position;
        contact.email = request.email;
        contact.phone = request.phone;
        contact.can_approve_timesheet = request.can_approve_timesheet;
        contact.can_approve_billing = request.can_approve_billing;
        contact.approval_limit = request.approval_limit;
        contact.is_primary = request.is_primary;

        self.timesheet_repo
            .create_client_contact(&contact)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// List contacts for a client
    pub async fn list_client_contacts(&self, client_id: Uuid) -> DomainResult<Vec<ClientContact>> {
        self.timesheet_repo
            .list_contacts_by_client(client_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
