use crate::{api::handlers::ai_handler, services::ai_service::AiService};
use axum::{Router, routing::post};

use axum::middleware::from_fn;
use tower_governor::{GovernorConfigBuilder, GovernorLayer, key_extractor::PeerIp};
use crate::api::middleware::auth;

pub fn router(service: AiService) -> Router {
    // Rate limiting configuration: 50 requests per minute per IP (adjust as needed)
    let governor_cfg = GovernorConfigBuilder::default()
        .per_minute(50)
        .key_extractor(PeerIp::default())
        .finish()
        .unwrap();
    Router::new()
        .route(
            "/chat",
            post(ai_handler::chat)
                .route_layer(axum::middleware::from_fn(auth::auth_middleware)),
        )
        .layer(GovernorLayer::new(governor_cfg))
        .with_state(service)
}
