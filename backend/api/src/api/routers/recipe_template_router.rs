use crate::api::handlers::recipe_template_handler;
use crate::services::recipe_template_service::RecipeTemplateService;
use axum::{
    Router,
    routing::{delete, get, post},
};

pub fn router(service: RecipeTemplateService) -> Router {
    Router::new()
        .route("/", post(recipe_template_handler::create_template))
        .route("/", get(recipe_template_handler::list_templates))
        .route("/:id", delete(recipe_template_handler::delete_template))
        .with_state(service)
}
