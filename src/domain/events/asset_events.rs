//! Asset Domain Events

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::DomainEvent;

/// Asset created event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetCreated {
    pub asset_id: Uuid,
    pub asset_code: String,
    pub name: String,
    pub category_id: Uuid,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for AssetCreated {
    fn event_type(&self) -> &'static str {
        "asset.created"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.asset_id
    }
}

/// Asset state changed event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetStateChanged {
    pub asset_id: Uuid,
    pub from_state: String,
    pub to_state: String,
    pub reason: Option<String>,
    pub performed_by: Option<Uuid>,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for AssetStateChanged {
    fn event_type(&self) -> &'static str {
        "asset.state_changed"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.asset_id
    }
}

/// Asset assigned event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetAssigned {
    pub asset_id: Uuid,
    pub assigned_to: Uuid,
    pub assigned_by: Option<Uuid>,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for AssetAssigned {
    fn event_type(&self) -> &'static str {
        "asset.assigned"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.asset_id
    }
}

/// Asset transferred event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetTransferred {
    pub asset_id: Uuid,
    pub from_location: Option<Uuid>,
    pub to_location: Uuid,
    pub transferred_by: Option<Uuid>,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for AssetTransferred {
    fn event_type(&self) -> &'static str {
        "asset.transferred"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.asset_id
    }
}

/// Asset disposed event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetDisposed {
    pub asset_id: Uuid,
    pub disposal_method: String,
    pub disposal_value: Option<rust_decimal::Decimal>,
    pub disposed_by: Option<Uuid>,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for AssetDisposed {
    fn event_type(&self) -> &'static str {
        "asset.disposed"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.asset_id
    }
}
