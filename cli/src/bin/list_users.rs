use api::utils::config::Config;
use api::infra::db::establish_connection;
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

    println!("Connected to MongoDB at {}", config.mongo_uri);
    
    let db = client.database("flow_db");
    let collection = db.collection::<mongodb::bson::Document>("users");

    println!("Listing users in 'users' collection:");
    
    let mut cursor = collection.find(None, None).await.unwrap();
    
    let mut count = 0;
    
    while cursor.advance().await.unwrap() {
        let doc = cursor.current();
        count += 1;
        if let Ok(email) = doc.get_str("email") {
            println!("- {}", email);
        } else {
            println!("- [User without email field] {:?}", doc);
        }
    }
    
    if count == 0 {
        println!("No users found in the database. You may need to register a user via the API first.");
    }
}
