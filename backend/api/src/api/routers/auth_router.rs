use crate::api::handlers::auth_handler;
use crate::services::auth_service::AuthService;
use axum::{Json, Router, routing::{get, post}};
use serde_json::json;

pub fn router(service: AuthService) -> Router {
    Router::new()
        .route("/health", get(|| async { Json(json!({ "status": "ok" })) }))
        .route("/register", post(auth_handler::register))
        .route("/login", post(auth_handler::login))
        .route("/request-otp", post(auth_handler::request_otp))
        .route("/verify-otp", post(auth_handler::verify_otp))
        .route("/profile", axum::routing::get(auth_handler::profile))
        .route("/get-user-profile", post(auth_handler::get_user_profile))
        .route("/update-email", post(auth_handler::update_user_email))
        .route("/update-password", post(auth_handler::update_user_password))
        .route("/delete-user", post(auth_handler::delete_user))
        .route("/forgot-password", post(auth_handler::forgot_password))
        .route(
            "/reset-password",
            post(auth_handler::reset_password_with_otp),
        )
        .route("/switch-network", post(auth_handler::switch_network))
        .route("/logout", post(auth_handler::logout))
        .route(
            "/google/login",
            axum::routing::get(auth_handler::google_login),
        )
        .route(
            "/google/callback",
            axum::routing::get(auth_handler::google_callback),
        )
        .with_state(service)
}
