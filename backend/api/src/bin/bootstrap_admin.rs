//! Out-of-band admin provisioning.
//!
//! Admin privilege is a durable `User.is_admin` flag — never derived from JWT
//! email matching `ADMIN_EMAILS` at request time. Addresses reserved in
//! `ADMIN_EMAILS` cannot be claimed via `/auth/register` or OAuth signup.
//!
//! Usage:
//! ```text
//! cargo run -p txio-api --bin bootstrap_admin -- \
//!   --email admin@txio.io --password 'a-strong-password'
//! ```

use clap::Parser;
use dotenvy::{dotenv, from_path_override};
use std::path::PathBuf;
use txio_api::infra::db::establish_connection;
use txio_api::model::user::User;
use txio_api::repositories::user_repository::UserRepository;
use txio_api::utils::config::{Config, is_reserved_admin_email};
use txio_api::utils::error::AppError;

#[derive(Parser, Debug)]
#[command(
    name = "bootstrap_admin",
    about = "Create or promote an admin account out-of-band (sets User.is_admin)"
)]
struct Args {
    /// Email that must appear in ADMIN_EMAILS
    #[arg(long)]
    email: String,

    /// Password for a newly created account (required when the user does not exist yet)
    #[arg(long)]
    password: Option<String>,
}

fn load_project_env() {
    let mut dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    for _ in 0..4 {
        let candidate = dir.join(".env");
        if candidate.exists() {
            let _ = from_path_override(&candidate);
        }
        if !dir.pop() {
            break;
        }
    }
}

fn fail(msg: impl AsRef<str>) -> ! {
    eprintln!("{}", msg.as_ref());
    std::process::exit(1);
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    load_project_env();

    let args = Args::parse();
    let config = match Config::from_env() {
        Ok(c) => c,
        Err(e) => fail(format!("Config error: {e}")),
    };

    if config.admin_emails.is_empty() {
        fail(
            "ADMIN_EMAILS is empty. Set ADMIN_EMAILS to the reserved admin roster before bootstrapping.",
        );
    }

    if !is_reserved_admin_email(&args.email, &config.admin_emails) {
        fail(format!(
            "Refusing to bootstrap {}: email is not listed in ADMIN_EMAILS ({})",
            args.email,
            config.admin_emails.join(", ")
        ));
    }

    let db_client = match establish_connection(&config.mongo_uri).await {
        Ok(c) => c,
        Err(e) => fail(format!("MongoDB connection failed: {e}")),
    };
    let db = db_client
        .default_database()
        .unwrap_or_else(|| db_client.database("txio_db"));
    let user_repo = UserRepository::new(&db);
    if let Err(e) = user_repo.ensure_indices().await {
        fail(format!("Failed ensuring user indices: {e}"));
    }

    let email = args.email.trim().to_ascii_lowercase();

    match user_repo.find_by_email(&email).await {
        Ok(mut user) => {
            if user.is_admin {
                println!("User {email} is already an admin — nothing to do.");
                return;
            }
            user.is_admin = true;
            if let Err(e) = user_repo.update(&user).await {
                fail(format!("Failed promoting {email}: {e}"));
            }
            println!("Promoted existing user {email} to admin (is_admin=true).");
        }
        Err(AppError::NotFound(_)) => {
            let Some(password) = args.password else {
                fail("--password is required when creating a new admin account");
            };
            if password.len() < 12 {
                fail("Password must be at least 12 characters.");
            }
            let password_hash = match bcrypt::hash(password.as_bytes(), bcrypt::DEFAULT_COST) {
                Ok(h) => h,
                Err(e) => fail(format!("Failed to hash password: {e}")),
            };
            let mut user = User::new(email.clone(), password_hash);
            user.is_admin = true;
            match user_repo.save(&user).await {
                Ok(saved) => {
                    println!(
                        "Created admin user {} (id={}).",
                        saved.email,
                        saved.id.map(|id| id.to_hex()).unwrap_or_default()
                    );
                }
                Err(e) => fail(format!("Failed creating admin user: {e}")),
            }
        }
        Err(e) => fail(format!("Lookup failed: {e}")),
    }
}
