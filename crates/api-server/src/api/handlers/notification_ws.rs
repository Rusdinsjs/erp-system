use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;
use tracing::info;
use uuid::Uuid;

use crate::api::server::AppState;

/// The handler for the WebSocket upgrade request
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    // ConnectInfo(addr): ConnectInfo<SocketAddr>, // Optional: get IP
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

/// Actual WebSocket connection handler
async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();

    // Create a channel for this session
    let (tx, mut rx) = mpsc::unbounded_channel();

    // Generate a temporary session ID or reuse User ID if authenticated
    // TODO: proper auth extraction from query param or header?
    // For now, generate a random ID to treat as an anonymous session until we add Auth.
    // In a real app, client connects to `ws://.../ws?token=JwtToken`
    let session_id = Uuid::new_v4();

    // Register session
    {
        let mut sessions = state.ws_manager.sessions.lock().await;
        sessions.insert(session_id, tx);
    }
    info!("New WebSocket connection: {}", session_id);

    // Spawn a task to push messages from the channel to the websocket
    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Main loop: receive messages from client (e.g. pings)
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Close(_) = msg {
                break;
            }
            // Handle other messages (Pong, Text commands from client)
        }
    });

    // Wait for either task to finish (connection closed or error)
    tokio::select! {
        _ = (&mut send_task) => {},
        _ = (&mut recv_task) => {},
    }

    // Cleanup session
    {
        let mut sessions = state.ws_manager.sessions.lock().await;
        sessions.remove(&session_id);
    }
    info!("WebSocket disconnected: {}", session_id);
}
