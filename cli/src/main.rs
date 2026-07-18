mod auth;
mod cache;
mod chains;
mod cli;
mod config;
mod rpc;
mod utils;

use clap::Parser;
use cli::{Cli, handlers::CommandHandler};
use colored::*;
use dotenvy::dotenv;

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
