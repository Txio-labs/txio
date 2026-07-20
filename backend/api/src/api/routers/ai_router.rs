use crate::{api::handlers::ai_handler, api::middleware::auth, services::ai_service::AiService};
use axum::{Router, routing::post};
use std::{sync::Arc, time::Duration};
use tower_governor::{GovernorLayer, governor::GovernorConfigBuilder, key_extractor::PeerIpKeyExtractor};

pub fn router(service: AiService) -> Router {
    // Rate limiting configuration: 50 requests per minute per IP (adjust as needed)
    let governor_cfg = Arc::new(
        GovernorConfigBuilder::default()
            .period(Duration::from_secs(60))
            .burst_size(50)
            .key_extractor(PeerIpKeyExtractor)
            .finish()
            .unwrap(),
    );
    Router::new()
        .route(
            "/chat",
            post(ai_handler::chat).route_layer(axum::middleware::from_fn(auth::auth_middleware)),
        )
        .layer(GovernorLayer { config: governor_cfg })
        .with_state(service)
}
