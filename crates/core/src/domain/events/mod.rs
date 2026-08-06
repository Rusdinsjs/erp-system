//! System Events for Event-Driven Architecture (QARC-005 & 3R.1.1-002)
use serde::{Deserialize, Serialize};

/// Generic System Event Envelope
/// Platform Kernel should not contain business-specific events (e.g. Loan, Fuel, Maintenance).
/// Instead, bounded contexts publish BusinessEvents with generic JSON payloads.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event_type", content = "payload")]
pub enum SystemEvent {
    /// A generic business event emitted by a bounded context
    BusinessEvent {
        event_name: String,
        payload: serde_json::Value,
    },
    
    /// Platform-level system alert (e.g., low disk space, provisioning failed)
    SystemAlert {
        alert_name: String,
        message: String,
    },
    
    /// Generic notification request that can be processed by NotificationService
    NotificationRequested {
        user_id: uuid::Uuid,
        title: String,
        message: String,
        reference_type: Option<String>,
        reference_id: Option<uuid::Uuid>,
    },
    
    /// Generic broadcast request for WebSocket clients
    WebSocketBroadcast {
        topic: String,
        payload: serde_json::Value,
    }
}
