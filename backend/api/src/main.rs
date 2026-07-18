use axum::{
    BoxError, Router, error_handling::HandleErrorLayer, http::HeaderValue, http::StatusCode,
    routing::get,
};
use dotenvy::{dotenv, from_path_override};
use std::{net::SocketAddr, path::PathBuf, sync::Arc, time::Duration};
use tower::ServiceBuilder;
use tower_governor::{GovernorLayer, governor::GovernorConfigBuilder};
use tower_http::cors::{Any, CorsLayer};
use tower_http::limit::RequestBodyLimitLayer;

use ::txio_api::{
    api,
    infra::db::{describe_connection_error, establish_connection, extract_mongo_host},
    model, repositories, services, utils,
    utils::config::Config,
};

/// Caps a single request body across every route. None of the current
/// endpoints accept file uploads; this is a blanket safety net against a
/// single oversized POST pressuring memory.
const MAX_REQUEST_BODY_BYTES: usize = 1024 * 1024; // 1 MiB

/// Bounds how long any single request may run. Set above the longest
/// legitimate outbound call the API makes on a request's behalf (AI/email/
/// Sui/OAuth calls all use a 30s reqwest timeout) so it never races a
/// well-behaved upstream timeout.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(35);

async fn handle_middleware_error(err: BoxError) -> (StatusCode, String) {
    if err.is::<tower::timeout::error::Elapsed>() {
        (StatusCode::REQUEST_TIMEOUT, "Request timed out".to_string())
    } else {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Unhandled internal error: {err}"),
        )
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    load_project_env();

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
    let mongo_host = extract_mongo_host(&config.mongo_uri).unwrap_or("unknown host");
    tracing::info!("Connecting to MongoDB at {}...", mongo_host);
    let db_client = establish_connection(&config.mongo_uri).await.map_err(|e| {
        let message = describe_connection_error(&config.mongo_uri, &e);
        tracing::error!(error = %message, "Failed to connect to MongoDB");
        Box::new(std::io::Error::other(message)) as Box<dyn std::error::Error>
    })?;

    tracing::info!("Connected to MongoDB at {}", mongo_host);

    // 4. Initialize Repositories

    let user_repo = repositories::user_repository::UserRepository::new(&db_client);
    let otp_repo = repositories::otp_repository::OTPRepository::new(&db_client);
    let rpc_repo = repositories::rpc_repository::RpcRepository::new(&db_client);
    let collection_repo =
        repositories::collection_repository::CollectionRepository::new(&db_client);
    let request_repo = repositories::request_repository::RequestRepository::new(&db_client);
    let workspace_repo = repositories::workspace_repository::WorkspaceRepository::new(&db_client);

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
        rpc_repo.clone(),
        jwt_helper,
        otp_service,
        email_service,
    );

    let collection_service = services::collection_service::CollectionService::new(
        collection_repo.clone(),
        request_repo,
        user_repo.clone(),
        workspace_repo.clone(),
        sui_service,
    );

    let workspace_service =
        services::workspace_service::WorkspaceService::new(workspace_repo, collection_repo);

    let admin_service = services::admin_service::AdminService::new(
        user_repo.clone(),
        rpc_repo.clone(),
        config.admin_emails.clone(),
    );

    let terminal_service = services::terminal_service::TerminalService::new();
    let ai_service = services::ai_service::AiService::from_env();

    tracing::info!(
        groq_key_count = ai_service.configured_key_count(),
        groq_model = %ai_service.model(),
        "Configured AI service"
    );

    let frontend_url =
        std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let frontend_origin = reqwest::Url::parse(&frontend_url)
        .map(|url| url.origin().ascii_serialization())
        .unwrap_or_else(|_| frontend_url.trim_end_matches('/').to_string());
    let cors_origin = HeaderValue::from_str(&frontend_origin).map_err(|e| {
        tracing::error!(
            error = %e,
            frontend_origin = %frontend_origin,
            "Invalid frontend origin for CORS"
        );
        Box::new(e) as Box<dyn std::error::Error>
    })?;
    let allowed_origins = vec![
        cors_origin,
        HeaderValue::from_static("http://localhost:3000"),
        HeaderValue::from_static("http://127.0.0.1:3000"),
    ];
    let cors = CorsLayer::new()
        .allow_origin(allowed_origins)
        .allow_methods(Any)
        .allow_headers(Any);

    tracing::info!(
        frontend_origin = %frontend_origin,
        "Configured CORS for frontend access"
    );

    // Global, per-peer-IP rate limit: a coarse, app-wide mitigation shared by
    // every route. Endpoint-specific throttling (OTP send, AI proxy) is
    // handled separately. Uses the default PeerIpKeyExtractor, which keys on
    // the direct TCP peer address -- correct for this app's current
    // deployment (the API is reached directly, not behind a reverse proxy
    // per docker-compose.yml). If that changes, swap in tower_governor's
    // SmartIpKeyExtractor and only trust forwarding headers from a known
    // proxy.
    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .per_millisecond(200) // ~5 req/s sustained per peer IP
            .burst_size(30) // headroom for a page load firing several requests at once
            .finish()
            .expect("valid governor rate-limit configuration"),
    );

    // tower_governor retains rate-limit state per key forever unless pruned;
    // without this the map of seen IPs would grow without bound.
    let governor_limiter = governor_conf.limiter().clone();
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_secs(60));
            governor_limiter.retain_recent();
        }
    });

    // 7. Build Router
    let app = Router::new()
        .route("/health", get(|| async { "txio Backend Operational" }))
        .nest(
            "/api/v1/auth",
            api::routers::auth_router::router(auth_service),
        )
        .nest("/api/v1/ai", api::routers::ai_router::router(ai_service))
        .nest(
            "/api/v1/collections",
            api::routers::collection_router::router(collection_service),
        )
        .nest(
            "/api/v1/workspaces",
            api::routers::workspace_router::router(workspace_service),
        )
        .nest(
            "/api/v1/terminal",
            api::routers::terminal_router::router(terminal_service),
        )
        .nest(
            "/api/v1/admin",
            api::routers::admin_router::router(admin_service),
        )
        .layer(
            ServiceBuilder::new()
                .layer(HandleErrorLayer::new(handle_middleware_error))
                .timeout(REQUEST_TIMEOUT),
        )
        .layer(RequestBodyLimitLayer::new(MAX_REQUEST_BODY_BYTES))
        .layer(GovernorLayer {
            config: governor_conf,
        })
        .layer(cors);

    // 8. Run Server
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "8000".to_string())
        .parse::<u16>()
        .unwrap_or(8000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    let listener = tokio::net::TcpListener::bind(addr).await.map_err(|e| {
        tracing::error!(error = %e, %addr, "Failed to bind API server");
        Box::new(std::io::Error::new(
            e.kind(),
            format!(
                "Failed to bind API server to {}. Set PORT to override the default bind port. {}",
                addr, e
            ),
        )) as Box<dyn std::error::Error>
    })?;
    tracing::info!("Server listening on {}", addr);
    // GovernorLayer's default key extractor reads the peer address from
    // ConnectInfo, which only axum::serve populates via this constructor.
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}

fn load_project_env() {
    let manifest_env = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".env");
    let workspace_env = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../.env");

    from_path_override(&manifest_env).ok();
    from_path_override(&workspace_env).ok();
}
