use ax_ws::Message;
use serde::Serialize;
use std::collections::HashMap;
use tokio::sync::{mpsc, Mutex};
use tracing::{debug, error};
use uuid::Uuid;

// Alias to avoid naming conflicts with top-level modules if any
use axum::extract::ws as ax_ws;

/// A message sent to a specific user or broadcasted
#[derive(Debug, Clone, Serialize)]
pub struct NotificationMessage {
    pub event_type: String, // e.g., "WORK_ORDER_UPDATED"
    pub payload: serde_json::Value,
}

/// The global manager for WebSocket connections
pub struct WebSocketManager {
    pub sessions: Mutex<HashMap<Uuid, mpsc::UnboundedSender<Message>>>,
}

impl Default for WebSocketManager {
    fn default() -> Self {
        Self::new()
    }
}

impl WebSocketManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    /// Broadcast a message to ALL connected clients
    pub async fn broadcast(&self, msg: &NotificationMessage) {
        let json = match serde_json::to_string(msg) {
            Ok(j) => j,
            Err(e) => {
                error!("Failed to serialize broadcast message: {}", e);
                return;
            }
        };

        let sessions = self.sessions.lock().await;
        for (_id, tx) in sessions.iter() {
            if let Err(_disconnected) = tx.send(Message::Text(json.clone())) {
                // The tx is disconnected
            }
        }
        debug!(
            "Broadcasted event '{}' to {} clients",
            msg.event_type,
            sessions.len()
        );
    }
}
