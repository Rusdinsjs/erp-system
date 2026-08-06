use axum::{
    extract::{
        ws::{Message, WebSocket},
        Query, State, WebSocketUpgrade, Request,
    },
    http::{header, StatusCode},
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio::sync::mpsc;
use tracing::info;
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::infrastructure::notifications::WsSessionInfo;
use management_system_core::shared::utils::jwt::decode_token;

#[derive(Deserialize)]
pub struct WsParams {
    pub token: Option<String>,
}

/// Handler for WebSocket upgrade request (QSEC-005 Authenticated Handshake)
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<WsParams>,
    State(state): State<AppState>,
    req: Request,
) -> Result<impl IntoResponse, StatusCode> {
    // 1. Extract token from query parameter ?token=... or Authorization header
    let token = params.token.or_else(|| {
        req.headers()
            .get(header::AUTHORIZATION)
            .and_then(|h| h.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer ").map(String::from))
    });

    let token_str = match token {
        Some(t) => t,
        None => {
            tracing::warn!("WebSocket Handshake REJECTED: Anonymous connection attempt without token");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // 2. Decode and validate JWT token claims
    let claims = match decode_token(&token_str, &state.jwt_config) {
        Ok(c) => c,
        Err(e) => {
            tracing::warn!("WebSocket Handshake REJECTED: Invalid/expired token: {:?}", e);
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // 3. Upgrade connection and bind to user context
    Ok(ws.on_upgrade(move |socket| handle_socket(socket, state, claims)))
}

/// Actual WebSocket connection handler bound to authenticated UserClaims
async fn handle_socket(
    socket: WebSocket,
    state: AppState,
    claims: management_system_core::domain::entities::UserClaims,
) {
    let (mut sender, mut receiver) = socket.split();

    let (tx, mut rx) = mpsc::unbounded_channel();
    let session_id = Uuid::new_v4();
    let user_id = claims.user_id();

    let org_id = claims.org.as_deref().and_then(|id| Uuid::parse_str(id).ok());

    // Register authenticated session with user & tenant context
    let session_info = WsSessionInfo {
        session_id,
        user_id,
        role: claims.role.clone(),
        organization_id: org_id,
        company_id: None,
        tx,
    };

    state.ws_manager.register(session_info).await;
    info!("Authenticated WebSocket connected: session={} user={}", session_id, user_id);

    // Spawn send task
    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Spawn receive task
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Close(_) = msg {
                break;
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => {},
        _ = (&mut recv_task) => {},
    }

    state.ws_manager.unregister(&session_id).await;
    info!("WebSocket disconnected: session={} user={}", session_id, user_id);
}
