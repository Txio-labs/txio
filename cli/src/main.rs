mod cli;
mod chains;
mod config;
mod auth;
mod cache;
mod rpc;
mod utils;

use cli::{Cli, handlers::CommandHandler};
use clap::Parser;
use dotenvy::dotenv;
use colored::*;

#[tokio::main]
async fn main() {
    // Load environment variables from .env file
    dotenv().ok();

    let cli = Cli::parse();

    if let Err(e) = CommandHandler::handle(cli).await {
        eprintln!("{} {}", "Error:".bold().red(), e);
        
        // Suggest corrections for common mistakes if possible
        let err_str = e.to_string();
        if err_str.contains("Unknown chain") {
            // strsim could be used here for fuzzy matching if we had more context
        }
        
        std::process::exit(1);
    }
}