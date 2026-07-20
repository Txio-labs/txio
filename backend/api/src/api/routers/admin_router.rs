use crate::api::handlers::admin_handler;
use crate::services::admin_service::AdminService;
use axum::{
    Router,
    routing::{get, post},
};

pub fn router(service: AdminService) -> Router {
    Router::new()
        .route("/users", get(admin_handler::list_users))
        .route("/users/delete", post(admin_handler::delete_user))
        .route("/stats", get(admin_handler::stats))
        .route("/logs", get(admin_handler::list_logs))
        .with_state(service)
}
