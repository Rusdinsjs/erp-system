use ax_ws::Message;
use serde::Serialize;
use std::collections::HashMap;
use tokio::sync::{mpsc, Mutex};
use tracing::{debug, error};
use uuid::Uuid;

use axum::extract::ws as ax_ws;

/// A message sent to a specific user or broadcasted
#[derive(Debug, Clone, Serialize)]
pub struct NotificationMessage {
    pub event_type: String, // e.g., "WORK_ORDER_UPDATED"
    pub payload: serde_json::Value,
}

/// Authenticated WebSocket Session Metadata (QSEC-005)
#[derive(Clone)]
pub struct WsSessionInfo {
    pub session_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub organization_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
    pub tx: mpsc::UnboundedSender<Message>,
}

/// The global manager for authenticated WebSocket connections
pub struct WebSocketManager {
    pub sessions: Mutex<HashMap<Uuid, WsSessionInfo>>,
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

    /// Register authenticated session
    pub async fn register(&self, session: WsSessionInfo) {
        let mut sessions = self.sessions.lock().await;
        sessions.insert(session.session_id, session);
    }

    /// Unregister session on disconnect
    pub async fn unregister(&self, session_id: &Uuid) {
        let mut sessions = self.sessions.lock().await;
        sessions.remove(session_id);
    }

    /// Send notification targeted strictly to a specific user (User A cannot receive User B's notifications)
    pub async fn send_to_user(&self, target_user_id: Uuid, msg: &NotificationMessage) -> bool {
        let json = match serde_json::to_string(msg) {
            Ok(j) => j,
            Err(e) => {
                error!("Failed to serialize user notification: {}", e);
                return false;
            }
        };

        let sessions = self.sessions.lock().await;
        let mut sent_count = 0;
        for session in sessions.values() {
            if session.user_id == target_user_id
                && session.tx.send(Message::Text(json.clone())).is_ok()
            {
                sent_count += 1;
            }
        }
        debug!(
            "Sent notification '{}' to target user {} across {} active sockets",
            msg.event_type, target_user_id, sent_count
        );
        sent_count > 0
    }

    /// Broadcast non-sensitive events to authenticated clients only
    pub async fn broadcast(&self, msg: &NotificationMessage) {
        let json = match serde_json::to_string(msg) {
            Ok(j) => j,
            Err(e) => {
                error!("Failed to serialize broadcast message: {}", e);
                return;
            }
        };

        let sessions = self.sessions.lock().await;
        for session in sessions.values() {
            let _ = session.tx.send(Message::Text(json.clone()));
        }
        debug!(
            "Broadcasted event '{}' to {} authenticated clients",
            msg.event_type,
            sessions.len()
        );
    }
}
