mod cli;
mod chains;



mod rpc;
mod utils;

use cli::{Cli, handlers::CommandHandler};
use clap::Parser;
use colored::*;

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    // Load environment overrides from trusted locations only (never an untrusted
    // CWD `.env`). Must happen before any handler reads env (Config::from_env /
    // handle_login), so it stays at the very top of main() after arg parsing.
    if let Err(e) = utils::load_environment(cli.env_file.as_deref()) {
        eprintln!("{} {}", "Error:".bold().red(), e);
        std::process::exit(1);
    }

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