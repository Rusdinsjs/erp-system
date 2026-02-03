//! Attendance Service
//!
//! Business logic for employee attendance check-in/check-out.

use chrono::{DateTime, Local, NaiveTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use management_system_core::domain::entities::{AttendanceRecord, CheckInRequest, CheckOutRequest, TodayAttendanceStatus};
use management_system_core::shared::errors::{AppError, AppResult};

use super::geofence_service::GeofenceService;

pub struct AttendanceService;

impl AttendanceService {
    /// Get today's attendance status for an employee
    pub async fn get_today_status(
        pool: &PgPool,
        employee_id: Uuid,
    ) -> AppResult<TodayAttendanceStatus> {
        let today = Local::now().date_naive();
        
        let record = sqlx::query_as::<_, AttendanceRecord>(
            r#"
            SELECT ar.*,
                   e.name as employee_name,
                   e.nik as employee_nik
            FROM attendance_records ar
            JOIN employees e ON e.id = ar.employee_id
            WHERE ar.employee_id = $1
              AND DATE(ar.check_in_time AT TIME ZONE 'Asia/Jakarta') = $2
            ORDER BY ar.check_in_time DESC
            LIMIT 1
            "#
        )
        .bind(employee_id)
        .bind(today)
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(TodayAttendanceStatus {
            has_checked_in: record.as_ref().map(|r| r.check_in_time.is_some()).unwrap_or(false),
            has_checked_out: record.as_ref().map(|r| r.check_out_time.is_some()).unwrap_or(false),
            check_in_time: record.as_ref().and_then(|r| r.check_in_time),
            check_out_time: record.as_ref().and_then(|r| r.check_out_time),
            check_in_status: record.as_ref().and_then(|r| r.check_in_status.clone()),
            check_out_status: record.as_ref().and_then(|r| r.check_out_status.clone()),
            record,
        })
    }

    /// Check in an employee
    pub async fn check_in(
        pool: &PgPool,
        employee_id: Uuid,
        request: CheckInRequest,
    ) -> AppResult<AttendanceRecord> {
        // 1. Check if already checked in today
        let today_status = Self::get_today_status(pool, employee_id).await?;
        if today_status.has_checked_in && !today_status.has_checked_out {
            return Err(AppError::BadRequest("Already checked in today. Please check out first.".into()));
        }
        if today_status.has_checked_in && today_status.has_checked_out {
            return Err(AppError::BadRequest("Already completed attendance for today.".into()));
        }

        // 2. Get employee's office location
        let office = sqlx::query_as::<_, (Option<Uuid>, Option<f64>, Option<f64>, Option<i32>)>(
            r#"
            SELECT e.office_location_id, l.latitude, l.longitude, COALESCE(e.allowed_radius, l.radius, 50) as radius
            FROM employees e
            LEFT JOIN locations l ON l.id = e.office_location_id
            WHERE e.id = $1
            "#
        )
        .bind(employee_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Employee not found".into()))?;

        // 3. Validate geofence if office location is set
        if let (Some(office_lat), Some(office_long), Some(radius)) = (office.1, office.2, office.3) {
            let validation = GeofenceService::validate_checkin_location(
                request.latitude,
                request.longitude,
                office_lat,
                office_long,
                radius,
            );

            if let Err(distance) = validation {
                return Err(AppError::BadRequest(format!(
                    "You are {:.0}m away from office. Maximum allowed: {}m",
                    distance, radius
                )));
            }
        }

        // 4. Determine check-in status (on_time or late)
        let now = Utc::now();
        let check_in_status = Self::determine_check_in_status(pool, office.0, now).await?;

        // 5. Create attendance record
        let record = sqlx::query_as::<_, AttendanceRecord>(
            r#"
            INSERT INTO attendance_records (
                employee_id, check_in_time, check_in_location_id,
                check_in_lat, check_in_long, check_in_status,
                device_info, check_in_photo_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#
        )
        .bind(employee_id)
        .bind(now)
        .bind(office.0)
        .bind(request.latitude)
        .bind(request.longitude)
        .bind(&check_in_status)
        .bind(&request.device_info)
        .bind(&request.photo_url)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(record)
    }

    /// Check out an employee
    pub async fn check_out(
        pool: &PgPool,
        employee_id: Uuid,
        request: CheckOutRequest,
    ) -> AppResult<AttendanceRecord> {
        // 1. Get today's attendance record
        let today_status = Self::get_today_status(pool, employee_id).await?;
        
        if !today_status.has_checked_in {
            return Err(AppError::BadRequest("You haven't checked in today.".into()));
        }
        if today_status.has_checked_out {
            return Err(AppError::BadRequest("Already checked out today.".into()));
        }

        let record_id = today_status.record
            .ok_or_else(|| AppError::NotFound("Attendance record not found".into()))?
            .id;

        // 2. Determine check-out status
        let now = Utc::now();
        let check_out_status = "on_time".to_string(); // Simplified for now

        // 3. Update attendance record
        let record = sqlx::query_as::<_, AttendanceRecord>(
            r#"
            UPDATE attendance_records
            SET check_out_time = $2,
                check_out_lat = $3,
                check_out_long = $4,
                check_out_status = $5,
                notes = COALESCE($6, notes),
                check_out_photo_url = $7
            WHERE id = $1
            RETURNING *
            "#
        )
        .bind(record_id)
        .bind(now)
        .bind(request.latitude)
        .bind(request.longitude)
        .bind(&check_out_status)
        .bind(&request.notes)
        .bind(&request.photo_url)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(record)
    }

    /// Get attendance history for an employee
    pub async fn get_history(
        pool: &PgPool,
        employee_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> AppResult<Vec<AttendanceRecord>> {
        let records = sqlx::query_as::<_, AttendanceRecord>(
            r#"
            SELECT ar.*,
                   e.name as employee_name,
                   e.nik as employee_nik
            FROM attendance_records ar
            JOIN employees e ON e.id = ar.employee_id
            WHERE ar.employee_id = $1
            ORDER BY ar.check_in_time DESC
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(employee_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(records)
    }

    /// Get all attendance for today (admin)
    pub async fn get_all_today(pool: &PgPool) -> AppResult<Vec<AttendanceRecord>> {
        let today = Local::now().date_naive();
        
        let records = sqlx::query_as::<_, AttendanceRecord>(
            r#"
            SELECT ar.*,
                   e.name as employee_name,
                   e.nik as employee_nik
            FROM attendance_records ar
            JOIN employees e ON e.id = ar.employee_id
            WHERE DATE(ar.check_in_time AT TIME ZONE 'Asia/Jakarta') = $1
            ORDER BY ar.check_in_time DESC
            "#
        )
        .bind(today)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(records)
    }

    /// Determine check-in status based on office schedule
    async fn determine_check_in_status(
        pool: &PgPool,
        office_location_id: Option<Uuid>,
        check_in_time: DateTime<Utc>,
    ) -> AppResult<String> {
        if let Some(location_id) = office_location_id {
            let office = sqlx::query_as::<_, (Option<NaiveTime>, Option<i32>)>(
                "SELECT check_in_time, check_in_tolerance FROM locations WHERE id = $1"
            )
            .bind(location_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

            if let Some((Some(scheduled_time), tolerance)) = office {
                let local_time = check_in_time.with_timezone(&chrono_tz::Asia::Jakarta);
                let check_in_naive = local_time.time();
                
                let tolerance_minutes = tolerance.unwrap_or(30);
                let late_threshold = scheduled_time + chrono::Duration::minutes(tolerance_minutes as i64);

                if check_in_naive > late_threshold {
                    return Ok("late".to_string());
                }
            }
        }

        Ok("on_time".to_string())
    }
}
