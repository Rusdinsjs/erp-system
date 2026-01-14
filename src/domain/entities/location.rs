//! Location Entity
//!
//! Multi-level location hierarchy: Country → City → Building → Floor → Room → Rack

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Location type enum
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LocationType {
    Country,
    City,
    Building,
    Floor,
    Room,
    Rack,
    Zone,
    Other,
}

impl LocationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Country => "country",
            Self::City => "city",
            Self::Building => "building",
            Self::Floor => "floor",
            Self::Room => "room",
            Self::Rack => "rack",
            Self::Zone => "zone",
            Self::Other => "other",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "country" => Some(Self::Country),
            "city" => Some(Self::City),
            "building" => Some(Self::Building),
            "floor" => Some(Self::Floor),
            "room" => Some(Self::Room),
            "rack" => Some(Self::Rack),
            "zone" => Some(Self::Zone),
            "other" => Some(Self::Other),
            _ => None,
        }
    }
}

/// Location entity - hierarchical
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Location {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    #[sqlx(rename = "type")]
    pub location_type: Option<String>,
    pub address: Option<String>,

    // Geo coordinates (stored as strings, can be parsed to f64)
    #[sqlx(default)]
    pub latitude: Option<String>,
    #[sqlx(default)]
    pub longitude: Option<String>,

    // Capacity planning
    #[sqlx(default)]
    pub capacity: Option<i32>,
    #[sqlx(default)]
    pub current_count: Option<i32>,

    // QR code for physical location
    #[sqlx(default)]
    pub qr_code: Option<String>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Location {
    pub fn new(code: String, name: String, location_type: LocationType) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            parent_id: None,
            code,
            name,
            location_type: Some(location_type.as_str().to_string()),
            address: None,
            latitude: None,
            longitude: None,
            capacity: None,
            current_count: Some(0),
            qr_code: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Create a child location
    pub fn child(parent_id: Uuid, code: String, name: String, location_type: LocationType) -> Self {
        let mut location = Self::new(code, name, location_type);
        location.parent_id = Some(parent_id);
        location
    }

    /// Check if location has available capacity
    pub fn has_capacity(&self) -> bool {
        match (self.capacity, self.current_count) {
            (Some(cap), Some(count)) => count < cap,
            (None, _) => true, // No capacity limit
            _ => true,
        }
    }

    /// Get available capacity
    pub fn available_capacity(&self) -> Option<i32> {
        match (self.capacity, self.current_count) {
            (Some(cap), Some(count)) => Some(cap - count),
            _ => None,
        }
    }
}

/// Location with full hierarchy path
#[derive(Debug, Clone, Serialize)]
pub struct LocationWithPath {
    #[serde(flatten)]
    pub location: Location,
    pub full_path: String,
    pub level: u32,
}
