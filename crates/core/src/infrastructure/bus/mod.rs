use crate::domain::events::SystemEvent;
use tokio::sync::broadcast;

/// Internal Event Bus for asynchronous intra-module communication
#[derive(Clone)]
pub struct EventBus {
    sender: broadcast::Sender<SystemEvent>,
}

impl EventBus {
    /// Create a new EventBus with a specified buffer capacity
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    /// Publish an event to all active subscribers
    pub fn publish(&self, event: SystemEvent) {
        // Send can fail if there are no receivers, which is acceptable for a broadcast bus
        if let Err(e) = self.sender.send(event) {
            tracing::debug!("Event published but no active subscribers: {:?}", e);
        }
    }

    /// Subscribe to events on the bus
    pub fn subscribe(&self) -> broadcast::Receiver<SystemEvent> {
        self.sender.subscribe()
    }
}
