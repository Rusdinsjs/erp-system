//! Event Publisher
//! Simple in-memory event bus. Can be replaced with Redis/RabbitMQ/Kafka.

use serde::Serialize;
use tokio::sync::broadcast;

/// Event publisher for domain events
pub struct EventPublisher {
    sender: broadcast::Sender<String>,
}

impl EventPublisher {
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    pub fn default() -> Self {
        Self::new(1000)
    }

    /// Publish an event
    pub fn publish<T: Serialize>(&self, event_type: &str, payload: &T) -> Result<(), String> {
        let json = serde_json::to_string(payload).map_err(|e| e.to_string())?;
        let message = format!("{}:{}", event_type, json);
        self.sender.send(message).map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Subscribe to events
    pub fn subscribe(&self) -> broadcast::Receiver<String> {
        self.sender.subscribe()
    }
}

impl Clone for EventPublisher {
    fn clone(&self) -> Self {
        Self {
            sender: self.sender.clone(),
        }
    }
}
