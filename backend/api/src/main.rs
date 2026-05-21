use axum::{routing::get, Router};
use std::net::SocketAddr;
use dotenvy::dotenv;

use ::txio_api::{
    api, services, model, repositories, utils,
    utils::config::Config,
    infra::db::establish_connection,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    // 1. Initialize Logging
    utils::logger::init();

    // 2. Load Config
    tracing::info!("Loading configuration from environment...");
    let config = Config::from_env().map_err(|e| {
        tracing::error!(error = %e, "Failed to load configuration");
        Box::new(e) as Box<dyn std::error::Error>
    })?;

    tracing::info!(
        "Config loaded. MONGO_URI set={}, JWT_SECRET length={}, BREVO_API_KEY set={}",
        !config.mongo_uri.trim().is_empty(),
        config.jwt_secret.len(),
        !config.brevo_api_key.trim().is_empty()
    );

    // 3. Connect to Database
    tracing::info!("Connecting to MongoDB at {}...", config.mongo_uri);
    let db_client = establish_connection(&config.mongo_uri).await.map_err(|e| {
        tracing::error!(error = %e, "Failed to connect to MongoDB");
        Box::new(e) as Box<dyn std::error::Error>
    })?;

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

    let terminal_service = services::terminal_service::TerminalService::new();

    // 7. Build Router
    let app = Router::new()
        .route("/health", get(|| async { "txio Backend Operational" }))
        .nest("/api/v1/auth", api::routers::auth_router::router(auth_service))
        .nest("/api/v1/collections", api::routers::collection_router::router(collection_service))
        .nest("/api/v1/terminal", api::routers::terminal_router::router(terminal_service));

    // 8. Run Server
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .unwrap_or(3000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
