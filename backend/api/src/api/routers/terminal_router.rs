use crate::api::handlers::terminal_handler;
use crate::services::terminal_service::TerminalService;
use axum::{
    Router,
    routing::{get, post},
};

pub fn router(service: TerminalService) -> Router {
    Router::new()
        .route("/execute", post(terminal_handler::execute))
        .route(
            "/executions/:execution_id",
            get(terminal_handler::get_execution),
        )
        .route(
            "/executions/:execution_id/cancel",
            post(terminal_handler::cancel_execution),
        )
        .with_state(service)
}
