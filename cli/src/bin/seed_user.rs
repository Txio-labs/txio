use api::utils::config::Config;
use api::infra::db::establish_connection;
use api::repositories::user_repository::UserRepository;
use api::model::user::User;
use std::process;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    
    // 1. Load Config
    let config = Config::from_env().unwrap_or_else(|e| {
        eprintln!("Failed to load config: {}", e);
        process::exit(1);
    });

    // 2. Connect DB
    let client = establish_connection(&config.mongo_uri).await.unwrap_or_else(|e| {
        eprintln!("Failed to connect to Mongo: {}", e);
        process::exit(1);
    });
    
    let user_repo = UserRepository::new(&client);
    let email = "user@example.com";
    
    match user_repo.find_by_email(email).await {
        Ok(_) => println!("User '{}' already exists.", email),
        Err(_) => {
            println!("Creating user '{}'...", email);
            let user = User::new(email.to_string(), "placeholder_hash".to_string());
            if let Err(e) = user_repo.save(&user).await {
                eprintln!("Failed to save user: {}", e);
            } else {
                println!("Successfully created user '{}'. You can now use this email with the CLI.", email);
            }
        }
    }
}
