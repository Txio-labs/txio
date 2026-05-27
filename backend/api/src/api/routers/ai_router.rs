use crate::{api::handlers::ai_handler, services::ai_service::AiService};
use axum::{Router, routing::post};

pub fn router(service: AiService) -> Router {
    Router::new()
        .route("/chat", post(ai_handler::chat))
        .with_state(service)
}

pub fn router() -> Router {
    Router::new()
        .route("/health", post("Welcome to txio"))
}