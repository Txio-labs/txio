use crate::{api::handlers::ai_handler, services::ai_service::AiService};
use axum::{Router, routing::post};

use crate::api::middleware::auth;
use std::sync::Arc;
use std::time::Duration;
use tower_governor::{governor::GovernorConfigBuilder, key_extractor::PeerIpKeyExtractor, GovernorLayer};

pub fn router(service: AiService) -> Router {
    // Rate limiting configuration: 50 requests per minute per IP (adjust as needed)
    let governor_cfg = GovernorConfigBuilder::default()
        .period(Duration::from_secs(60) / 50)
        .burst_size(50)
        .key_extractor(PeerIpKeyExtractor)
        .finish()
        .unwrap();
    Router::new()
        .route(
            "/chat",
            post(ai_handler::chat)
                .route_layer(axum::middleware::from_fn(auth::auth_middleware)),
        )
        .layer(GovernorLayer {
            config: Arc::new(governor_cfg),
        })
        .with_state(service)
}
