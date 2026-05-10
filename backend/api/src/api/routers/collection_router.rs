use axum::{routing::{get, post, put, delete}, Router};
use crate::services::collection_service::CollectionService;
use crate::api::handlers::collection_handler;

pub fn router(service: CollectionService) -> Router {
    Router::new()
        // Collection Routes
        .route("/", post(collection_handler::create_collection))
        .route("/", get(collection_handler::get_user_collections))
        .route("/:id", get(collection_handler::get_collection))
        .route("/:id", put(collection_handler::update_collection))
        .route("/:id", delete(collection_handler::delete_collection))
        
        // Request Routes
        .route("/:id/requests", post(collection_handler::add_request))
        .route("/:id/requests", get(collection_handler::get_collection_requests))
        .route("/:id/requests/:req_id", put(collection_handler::update_request))
        .route("/:id/requests/:req_id", delete(collection_handler::delete_request))
        .route("/:id/requests/:req_id/execute", post(collection_handler::execute_request))
        
        .with_state(service)
}
