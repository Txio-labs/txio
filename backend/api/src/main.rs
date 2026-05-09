use axum::{routing::get, Router};
use std::net::SocketAddr;
use dotenvy::dotenv;

use crate::api;
use crate::dtos;
use crate::services;
use crate::model;
use crate::repositories;
use crate::infra;
use crate::utils;

use crate::utils::config::Config;
use crate::infra::db::establish_connection;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    
    // 1. Initialize Logging
    utils::logger::init();

    // 2. Load Config
    let config = Config::from_env()?;

    // 3. Connect to Database
    let db_client = establish_connection(&config.mongo_uri).await?;
    tracing::info!("Connected to MongoDB at {}", config.mongo_uri);

    // 4. Initialize Repositories
    let user_repo = repositories::user_repository::UserRepository::new(&db_client);
    let otp_repo = repositories::otp_repository::OTPRepository::new(&db_client);
    let rpc_repo = repositories::rpc_repository::RpcRepository::new(&db_client);
    let collection_repo = repositories::collection_repository::CollectionRepository::new(&db_client);
    let request_repo = repositories::request_repository::RequestRepository::new(&db_client);

    // 5. Initialize JWT Helper
    let jwt_helper = utils::auth_jwt::JwtHelper::new(config.jwt_secret);

    // 5.1 Initialize Support Services
    let email_service = services::email_service::EmailService::new(config.brevo_api_key);
    let otp_service = services::otp_service::OTPService::new(otp_repo.clone());
    
    // Default Mainnet URL for SuiService (can be overridden dynamically)
    let default_sui_url = model::user::SuiNetwork::Mainnet.url().to_string();
    let sui_service = services::sui_service::SuiService::new(rpc_repo.clone(), default_sui_url);

    // 6. Initialize Services (Dependency Injection)
    let auth_service = services::auth_service::AuthService::new(
        user_repo.clone(),
        rpc_repo,
        jwt_helper, 
        otp_service, 
        email_service
    );
    
    let collection_service = services::collection_service::CollectionService::new(
        collection_repo,
        request_repo,
        user_repo,
        sui_service,
    );

    // 7. Build Router
    let app = Router::new()
        .route("/health", get(|| async { "Flow Backend Operational" }))
        .nest("/api/v1/auth", api::routers::auth_router::router(auth_service))
        .nest("/api/v1/collections", api::routers::collection_router::router(collection_service));

    // 8. Run Server
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::info!("Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
