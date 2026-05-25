use crate::api::handlers::workspace_handler;
use crate::services::workspace_service::WorkspaceService;
use axum::{
    Router,
    routing::{get, post},
};

pub fn router(service: WorkspaceService) -> Router {
    Router::new()
        .route("/", get(workspace_handler::get_user_workspaces))
        .route("/", post(workspace_handler::create_workspace))
        .with_state(service)
}
