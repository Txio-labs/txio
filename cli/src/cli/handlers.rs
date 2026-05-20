use crate::cli::parser::{Cli, Commands, ChainCommand, DbAction};
use crate::chains::factory::ChainFactory;
use crate::chains::traits::ChainAdapter;
use crate::utils;
use anyhow::{Result, anyhow};
use serde_json::Value;
use colored::*;
use std::sync::Arc;
use txio_api::utils::config::Config;
use txio_api::infra::db::establish_connection;
use txio_api::repositories::user_repository::UserRepository;
use txio_api::repositories::rpc_repository::RpcRepository;
use txio_api::model::rpc::RpcLog;
use txio_api::dtos::request::LoginRequest;
use txio_api::dtos::response::AuthResponse;
use txio_api::utils::auth_jwt::{JwtHelper};
use mongodb::bson::Document;
use mongodb::bson::oid::ObjectId;
use futures::stream::StreamExt;

use dialoguer::{Input, Password};
use std::str::FromStr;

pub struct CommandHandler;

impl CommandHandler {
    pub async fn handle(cli: Cli) -> Result<()> {
        match cli.command {
            Commands::Chains => {
                println!("{}", "Supported Blockchains:".bold().cyan());
                for chain in ChainFactory::list_chains() {
                    println!("  - {}", chain.green());
                }
            }
            Commands::Switch { chain } => {
                if ChainFactory::list_chains().contains(&chain.to_lowercase().as_str()) {
                    utils::save_current_chain(&chain.to_lowercase())?;
                    println!("{} Switched default chain to {}", "✔".green(), chain.bold().cyan());
                } else {
                    let msg = format!("Unknown chain '{}'", chain);
                    let suggestion = ChainFactory::suggest_chain(&chain);
                    if let Some(s) = suggestion {
                        println!("{} {} \n\nDid you mean:\n  {}", "✖".red(), msg, s.green());
                    } else {
                        println!("{} {}", "✖".red(), msg);
                    }
                }
            }
            Commands::Login => {
                Self::handle_login().await?;
            }
            Commands::Sui { command } => {
                let adapter = ChainFactory::get_adapter("sui", cli.rpc_url.clone(), cli.network.clone())?;
                Self::handle_chain_command(adapter, command, cli.pretty, cli.email).await?;
            }
            Commands::Ethereum { command } => {
                let adapter = ChainFactory::get_adapter("ethereum", cli.rpc_url.clone(), cli.network.clone())?;
                Self::handle_chain_command(adapter, command, cli.pretty, cli.email).await?;
            }
            Commands::Solana { command } => {
                let adapter = ChainFactory::get_adapter("solana", cli.rpc_url.clone(), cli.network.clone())?;
                Self::handle_chain_command(adapter, command, cli.pretty, cli.email).await?;
            }
            Commands::Aptos { command } => {
                let adapter = ChainFactory::get_adapter("aptos", cli.rpc_url.clone(), cli.network.clone())?;
                Self::handle_chain_command(adapter, command, cli.pretty, cli.email).await?;
            }
            Commands::Soroban { command } => {
                let adapter = ChainFactory::get_adapter("soroban", cli.rpc_url.clone(), cli.network.clone())?;
                Self::handle_chain_command(adapter, command, cli.pretty, cli.email).await?;
            }
            Commands::Db { action } => {
                Self::handle_db_command(action).await?;
            }
            Commands::Completion { shell } => {
                use clap::CommandFactory;
                let mut cmd = Cli::command();
                clap_complete::generate(shell, &mut cmd, "txio", &mut std::io::stdout());
            }
            _ => {
                println!("{}", "Feature coming soon!".yellow());
            }
        }
        Ok(())
    }

    async fn handle_db_command(action: DbAction) -> Result<()> {
        let config = Config::from_env().map_err(|e| anyhow!("Failed to load config: {}", e))?;
        let client = establish_connection(&config.mongo_uri).await.map_err(|e| anyhow!("Failed to connect to MongoDB: {}", e))?;
        
        match action {
            DbAction::ListUsers => {
                let db = client.database("txio_db");
                let collection = db.collection::<Document>("users");

                println!("{}", "Registered Users:".bold().cyan());
                
                let mut cursor = collection.find(None, None).await.map_err(|e| anyhow!("Failed to query users: {}", e))?;
                let mut count = 0;
                
while let Some(result) = cursor.next().await {
                    let doc: Document = result.map_err(|e| anyhow!("Cursor error: {}", e))?;
                    count += 1;
if let Ok(email) = doc.get_str("email") {
                        let email: &str = email;
                        
                        println!("  - {}", email.green());
                    } else {
                        println!("  - {}", "[User without email]".dimmed());
                    }
                }
                
                if count == 0 {
                    println!("  {}", "No users found.".yellow());
                }
            }
        }
        Ok(())
    }

    async fn handle_login() -> Result<()> {
        println!("{}", "--- txio Account Login ---".bold().cyan());
        
        let email: String = Input::new()
            .with_prompt("Email")
            .interact_text()?;
            
        let password = Password::new()
            .with_prompt("Password")
            .interact()?;

        println!("\n{} Logging in...", "⏳".yellow());

        let login_request = LoginRequest {
            email: email.clone(),
            password,
        };

        let client = reqwest::Client::new();
        let api_url = std::env::var("API_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
        
        let response = client.post(format!("{}/api/auth/login", api_url))
            .json(&login_request)
            .send()
            .await?;

        if response.status().is_success() {
            let auth_response: AuthResponse = response.json().await?;
            utils::save_token(&auth_response.token)?;
            println!("{} Login successful! Welcome, {}.", "✔".green(), auth_response.user.email.bold().cyan());
        } else {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            println!("{} Login failed ({}): {}", "✖".red(), status, error_body.red());
        }

        Ok(())
    }

    async fn handle_chain_command(
        adapter: Arc<dyn ChainAdapter>, 
        command: ChainCommand, 
        pretty: bool, 
        email: Option<String>
    ) -> Result<()> {
        match command {
            ChainCommand::Call { method, params } => {
                let params_val: Value = if let Some(p) = params {
                    serde_json::from_str(&p).map_err(|e| anyhow!("Invalid JSON params: {}", e))?
                } else {
                    Value::Array(vec![])
                };

                println!("{} Calling {} on {}...", "🚀".bold(), method.cyan(), adapter.name().green());
                
                let result = adapter.call_rpc(&method, params_val.clone()).await;
                
                // Determine user ID for logging
                let mut user_id_to_log: Option<ObjectId> = None;

                if let Ok(config) = Config::from_env() {
                    if let Ok(client) = establish_connection(&config.mongo_uri).await {
                        // Priority 1: --email flag (admin override)
                        if let Some(user_email) = email {
                            let user_repo = UserRepository::new(&client);
                            if let Ok(user) = user_repo.find_by_email(&user_email).await {
                                user_id_to_log = user.id;
                            }
                        } 
                        // Priority 2: Logged in user (token)
                        else if let Some(token) = utils::get_token() {
                            let jwt_helper = JwtHelper::new(config.jwt_secret);
                            if let Ok(claims) = jwt_helper.verify_token(&token) {
                                if let Ok(oid) = ObjectId::from_str(&claims.sub) {
                                    user_id_to_log = Some(oid);
                                }
                            }
                        }

                        // Perform logging if we have a user ID
                        if let Some(user_id) = user_id_to_log {
                            let rpc_repo = RpcRepository::new(&client);
                            let log = RpcLog::new(
                                user_id,
                                method.clone(),
                                params_val,
                                result.is_ok(),
                                result.as_ref().err().map(|e| e.to_string()),
                            );
                            let _ = rpc_repo.save(&log).await;
                        }
                    }
                }

                let response = result?;
                
                if pretty {
                    println!("{}", serde_json::to_string_pretty(&response)?);
                } else {
                    println!("{}", serde_json::to_string(&response)?);
                }
            }
            ChainCommand::Balance { address } => {
                println!("{} Fetching balance for {} on {}...\n", "💰".bold(), address.dimmed(), adapter.name().green());
                
                let resolved_address = if let Some(addr) = adapter.resolve_name(&address).await? {
                    println!("{} Resolved {} to {}\n", "🔍".blue(), address.yellow(), addr.cyan());
                    addr
                } else {
                    if address.ends_with(".sui") || address.ends_with(".eth") {
                        println!("{} {} could not be resolved! Proceeding with raw input...\n", "⚠️".yellow(), address.yellow());
                    }
                    address
                };

                let result = adapter.get_balance(&resolved_address).await?;
                let chain_name = adapter.name();

                if chain_name == "Sui" {
                    if let Some(arr) = result.as_array() {
                        if arr.is_empty() {
                            println!("  {} No coins found.", "0".dimmed());
                        } else {
                            println!("{0: <15} | {1: <10} | {2}", "Balance".bold(), "Objects".bold(), "Coin Type".bold());
                            println!("{0:-<15}-+-{0:-<10}-+-{0:-<40}", "");
                            
                            for item in arr {
                                let balance = item.get("totalBalance").and_then(|v| v.as_str()).unwrap_or("0");
                                let count = item.get("coinObjectCount").and_then(|v| v.as_u64()).unwrap_or(0);
                                let coin_type = item.get("coinType").and_then(|v| v.as_str()).unwrap_or("Unknown");
                                
                                let display_balance = if coin_type == "0x2::sui::SUI" {
                                    if let Ok(b) = balance.parse::<f64>() {
                                        format!("{:.4} SUI", b / 1_000_000_000.0)
                                    } else {
                                        balance.to_string()
                                    }
                                } else {
                                    balance.to_string()
                                };

                                let short_coin = if coin_type.len() > 30 {
                                    let parts: Vec<&str> = coin_type.split("::").collect();
                                    if parts.len() >= 3 {
                                        format!("{}::{}", parts[1].blue(), parts[2].cyan())
                                    } else {
                                        format!("{}...{}", &coin_type[..10], &coin_type[coin_type.len()-10..]).cyan().to_string()
                                    }
                                } else {
                                    coin_type.cyan().to_string()
                                };

                                println!("{0: <15} | {1: <10} | {2}", 
                                    display_balance.green().bold(), 
                                    count.to_string().yellow(), 
                                    short_coin
                                );
                            }
                            println!();
                        }
                    } else {
                        println!("{}", serde_json::to_string_pretty(&result)?);
                    }
                } else if chain_name == "Ethereum" {
                    if let Some(hex_str) = result.as_str() {
                        let clean_hex = hex_str.trim_start_matches("0x");
                        if let Ok(wei) = u128::from_str_radix(clean_hex, 16) {
                            let eth = wei as f64 / 1_000_000_000_000_000_000.0;
                            println!("{} {:.4} ETH", "Balance:".bold().cyan(), eth.to_string().green().bold());
                        } else {
                            println!("{} {}", "Balance (Wei Hex):".bold().cyan(), hex_str.green());
                        }
                    } else {
                        println!("{}", serde_json::to_string_pretty(&result)?);
                    }
                } else if chain_name == "Solana" {
                    if let Some(val) = result.get("value").and_then(|v| v.as_u64()) {
                        let sol = val as f64 / 1_000_000_000.0;
                        println!("{} {:.4} SOL", "Balance:".bold().cyan(), sol.to_string().green().bold());
                    } else {
                        println!("{}", serde_json::to_string_pretty(&result)?);
                    }
                } else if chain_name == "Aptos" {
                    let mut found = false;
                    if let Some(arr) = result.as_array() {
                        for resource in arr {
                            if let Some(res_type) = resource.get("type").and_then(|t| t.as_str()) {
                                if res_type == "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>" {
                                    if let Some(coin) = resource.get("data").and_then(|d| d.get("coin")) {
                                        if let Some(val_str) = coin.get("value").and_then(|v| v.as_str()) {
                                            if let Ok(val) = val_str.parse::<f64>() {
                                                let apt = val / 100_000_000.0; 
                                                println!("{} {:.4} APT", "Balance:".bold().cyan(), apt.to_string().green().bold());
                                                found = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if !found {
                        if pretty {
                            println!("{}", serde_json::to_string_pretty(&result)?);
                        } else {
                            println!("{}", serde_json::to_string(&result)?);
                        }
                    }
                } else if chain_name == "Soroban" {
                    if let Some(sequence) = result.get("sequence").and_then(|v| v.as_u64()) {
                        println!("{} {}", "Latest Ledger Sequence:".bold().cyan(), sequence.to_string().green().bold());
                        println!("{} {}", "Status:".bold().cyan(), "Connected to Soroban RPC".green().bold());
                    } else {
                        if pretty {
                            println!("{}", serde_json::to_string_pretty(&result)?);
                        } else {
                            println!("{}", serde_json::to_string(&result)?);
                        }
                    }
                } else {
                    if pretty {
                        println!("{}", serde_json::to_string_pretty(&result)?);
                    } else {
                        println!("{}", serde_json::to_string(&result)?);
                    }
                }
            }
            ChainCommand::Query { id } => {
                println!("{} Querying ID {} on {}...", "🔎".bold(), id.cyan(), adapter.name().green());
                println!("{}", "Query feature integration in progress...".yellow());
            }
        }
        Ok(())
    }
}
