use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Append-Only Asset Custody & Location History Entity (QAST-005)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetCustodyHistory {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub custodian_user_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub assigned_at: DateTime<Utc>,
    pub assigned_by: Option<Uuid>,
    pub notes: Option<String>,
}

/// Request to assign new custody/location to an asset (QAST-005)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignCustodyRequest {
    pub asset_id: Uuid,
    pub custodian_user_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub notes: Option<String>,
}

/// Request for atomic Asset Sale / Disposal (QAST-004)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetDisposalRequest {
    pub asset_id: Uuid,
    pub company_id: Uuid,
    pub disposal_date: NaiveDate,
    pub sale_amount: Decimal,
    pub destination_account_id: Uuid, // Cash/Bank Account for sale proceeds
    pub reason: Option<String>,
}
