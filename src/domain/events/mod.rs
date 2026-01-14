//! Domain Events
//!
//! Events that represent important domain occurrences.

pub mod asset_events;
pub mod loan_events;
pub mod maintenance_events;

pub use asset_events::*;
pub use loan_events::*;
pub use maintenance_events::*;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Base trait for domain events
pub trait DomainEvent: Serialize {
    fn event_type(&self) -> &'static str;
    fn occurred_at(&self) -> DateTime<Utc>;
    fn aggregate_id(&self) -> Uuid;
}

/// Event envelope for publishing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventEnvelope<T: Serialize> {
    pub id: Uuid,
    pub event_type: String,
    pub aggregate_id: Uuid,
    pub occurred_at: DateTime<Utc>,
    pub payload: T,
    pub metadata: EventMetadata,
}

/// Event metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventMetadata {
    pub user_id: Option<Uuid>,
    pub correlation_id: Option<String>,
    pub causation_id: Option<String>,
}

impl<T: Serialize> EventEnvelope<T> {
    pub fn new(event_type: &str, aggregate_id: Uuid, payload: T) -> Self {
        Self {
            id: Uuid::new_v4(),
            event_type: event_type.to_string(),
            aggregate_id,
            occurred_at: Utc::now(),
            payload,
            metadata: EventMetadata {
                user_id: None,
                correlation_id: None,
                causation_id: None,
            },
        }
    }

    pub fn with_user(mut self, user_id: Uuid) -> Self {
        self.metadata.user_id = Some(user_id);
        self
    }
}
