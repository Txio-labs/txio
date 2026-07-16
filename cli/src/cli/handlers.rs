use crate::chains::factory::ChainFactory;
use crate::chains::traits::ChainAdapter;
use crate::cli::format::format_units_fixed;
use crate::cli::parser::{ChainCommand, Cli, Commands, ConfigAction, DbAction};
use crate::utils;
use anyhow::{Result, anyhow};
use colored::*;
use futures::stream::StreamExt;
use mongodb::bson::Document;
use mongodb::bson::doc;
use mongodb::bson::oid::ObjectId;
use mongodb::options::FindOptions;
use serde_json::Value;
use std::sync::Arc;
use txio_api::dtos::request::LoginRequest;
use txio_api::dtos::response::AuthResponse;
use txio_api::infra::db::{describe_connection_error, establish_connection};
use txio_api::model::rpc::RpcLog;
use txio_api::repositories::rpc_repository::RpcRepository;
use txio_api::repositories::user_repository::UserRepository;
use txio_api::utils::auth_jwt::JwtHelper;
use txio_api::utils::config::Config;

use dialoguer::{Confirm, Input, Password};
use std::str::FromStr;

pub struct CommandHandler;

fn resolve_audit_user_id(session_user_id: Option<ObjectId>) -> Option<ObjectId> {
    session_user_id
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uses_authenticated_session_identity_for_audit_logs() {
        let session_user_id = Some(ObjectId::new());
        assert_eq!(resolve_audit_user_id(session_user_id), session_user_id);
    }

    #[test]
    fn returns_none_without_an_authenticated_session() {
        assert!(resolve_audit_user_id(None).is_none());
    }
}

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
                    println!(
                        "{} Switched default chain to {}",
                        "✔".green(),
                        chain.bold().cyan()
                    );
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
            Commands::Logout => {
                utils::remove_token()?;
                println!("{} Logged out successfully.", "✔".green());
            }
            Commands::Status => {
                let chain = utils::get_current_chain().unwrap_or_else(|| "sui".to_string());
                let logged_in = utils::get_token().is_some();
                println!("{}", "─── txio Status ───".bold().cyan());
                println!(
                    "  {} Default chain:  {}",
                    "»".dimmed(),
                    chain.green().bold()
                );
                println!(
                    "  {} Network:        {}",
                    "»".dimmed(),
                    format!("{:?}", cli.network).yellow()
                );
                println!(
                    "  {} Authenticated:  {}",
                    "»".dimmed(),
                    if logged_in {
                        "Yes".green().bold()
                    } else {
                        "No".red().bold()
                    }
                );
                if let Ok(adapter) =
                    ChainFactory::get_adapter(&chain, cli.rpc_url.clone(), cli.network.clone())
                {
                    let rpc = cli.rpc_url.as_deref().unwrap_or(adapter.default_rpc());
                    let healthy = adapter.get_gas_price().await.is_ok();
                    println!("  {} RPC endpoint:   {}", "»".dimmed(), rpc.dimmed());
                    println!(
                        "  {} RPC health:     {}",
                        "»".dimmed(),
                        if healthy {
                            "✔ OK".green().bold()
                        } else {
                            "✖ Unreachable".red().bold()
                        }
                    );
                }
            }
            Commands::Config { action } => match action {
                ConfigAction::List => {
                    let entries = utils::list_config()?;
                    if entries.is_empty() {
                        println!("{}", "No configuration entries set.".dimmed());
                    } else {
                        println!("{}", "CLI Configuration:".bold().cyan());
                        for (k, v) in entries {
                            println!("  {} = {}", k.yellow(), v.green());
                        }
                    }
                }
                ConfigAction::Get { key } => match utils::get_config(&key)? {
                    Some(v) => println!("{} = {}", key.yellow(), v.green()),
                    None => println!("{} Key '{}' not found.", "✖".red(), key),
                },
                ConfigAction::Set { key, value } => {
                    utils::save_config(&key, &value)?;
                    println!("{} Set {} = {}", "✔".green(), key.yellow(), value.green());
                }
                ConfigAction::Unset { key } => {
                    utils::remove_config(&key)?;
                    println!("{} Removed key '{}'.", "✔".green(), key.yellow());
                }
            },
            Commands::Sui { command } => {
                let adapter =
                    ChainFactory::get_adapter("sui", cli.rpc_url.clone(), cli.network.clone())?;
                Self::handle_chain_command(adapter, command, cli.pretty).await?;
            }
            Commands::Ethereum { command } => {
                let adapter = ChainFactory::get_adapter(
                    "ethereum",
                    cli.rpc_url.clone(),
                    cli.network.clone(),
                )?;
                Self::handle_chain_command(adapter, command, cli.pretty).await?;
            }
            Commands::Solana { command } => {
                let adapter =
                    ChainFactory::get_adapter("solana", cli.rpc_url.clone(), cli.network.clone())?;
                Self::handle_chain_command(adapter, command, cli.pretty).await?;
            }
            Commands::Aptos { command } => {
                let adapter =
                    ChainFactory::get_adapter("aptos", cli.rpc_url.clone(), cli.network.clone())?;
                Self::handle_chain_command(adapter, command, cli.pretty).await?;
            }
            Commands::Soroban { command } => {
                let adapter =
                    ChainFactory::get_adapter("soroban", cli.rpc_url.clone(), cli.network.clone())?;
                Self::handle_chain_command(adapter, command, cli.pretty).await?;
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
        let client = establish_connection(&config.mongo_uri)
            .await
            .map_err(|e| anyhow!("{}", describe_connection_error(&config.mongo_uri, &e)))?;
        let db = client.database("txio_db");

        match action {
            DbAction::ListUsers => {
                let collection = db.collection::<Document>("users");
                println!("{}", "Registered Users:".bold().cyan());

                let mut cursor = collection
                    .find(None, None)
                    .await
                    .map_err(|e| anyhow!("Failed to query users: {}", e))?;
                let mut count = 0;

                while let Some(result) = cursor.next().await {
                    let doc: Document = result.map_err(|e| anyhow!("Cursor error: {}", e))?;
                    count += 1;
                    if let Ok(email) = doc.get_str("email") {
                        println!("  - {}", email.green());
                    } else {
                        println!("  - {}", "[User without email]".dimmed());
                    }
                }

                if count == 0 {
                    println!("  {}", "No users found.".yellow());
                }
            }
            DbAction::DeleteUser { email } => {
                let confirmed = Confirm::new()
                    .with_prompt(format!(
                        "Delete user '{}'? This cannot be undone",
                        email.red()
                    ))
                    .default(false)
                    .interact()?;

                if !confirmed {
                    println!("{} Aborted.", "✖".red());
                    return Ok(());
                }

                let user_repo = UserRepository::new(&client);
                match user_repo.find_by_email(&email).await {
                    Ok(user) => {
                        if let Some(id) = user.id {
                            match user_repo.delete_by_id(&id.to_hex()).await {
                                Ok(_) => {
                                    println!("{} User '{}' deleted.", "✔".green(), email.bold())
                                }
                                Err(e) => println!("{} Delete failed: {}", "✖".red(), e),
                            }
                        } else {
                            println!("{} User record has no ID.", "✖".red());
                        }
                    }
                    Err(_) => println!("{} User '{}' not found.", "✖".red(), email),
                }
            }
            DbAction::Stats => {
                let user_count = db
                    .collection::<Document>("users")
                    .count_documents(None, None)
                    .await
                    .unwrap_or(0);
                let log_count = db
                    .collection::<Document>("rpc_logs")
                    .count_documents(None, None)
                    .await
                    .unwrap_or(0);

                println!("{}", "─── Database Stats ───".bold().cyan());
                println!(
                    "  {} Registered users: {}",
                    "»".dimmed(),
                    user_count.to_string().green().bold()
                );
                println!(
                    "  {} Total RPC logs:   {}",
                    "»".dimmed(),
                    log_count.to_string().yellow().bold()
                );
            }
            DbAction::ListLogs { limit } => {
                let opts = FindOptions::builder()
                    .sort(doc! { "_id": -1 })
                    .limit(Some(limit as i64))
                    .build();

                let mut cursor = db
                    .collection::<Document>("rpc_logs")
                    .find(None, Some(opts))
                    .await
                    .map_err(|e| anyhow!("Failed to query logs: {}", e))?;

                println!("{}", "Recent RPC Logs:".bold().cyan());
                let mut count = 0u64;

                while let Some(result) = cursor.next().await {
                    let doc = result.map_err(|e| anyhow!("Cursor error: {}", e))?;
                    count += 1;
                    let method = doc.get_str("method").unwrap_or("unknown");
                    let success = doc.get_bool("success").unwrap_or(false);
                    let status = if success { "OK".green() } else { "ERR".red() };
                    let err = doc.get_str("error_message").unwrap_or("").dimmed();
                    println!(
                        "  [{}] {} {}",
                        status,
                        method.cyan(),
                        if !err.is_empty() {
                            format!("— {}", err)
                        } else {
                            String::new()
                        }
                    );
                }

                if count == 0 {
                    println!("  {}", "No logs found.".yellow());
                }
            }
        }
        Ok(())
    }

    async fn handle_login() -> Result<()> {
        println!("{}", "--- txio Account Login ---".bold().cyan());

        let email: String = Input::new().with_prompt("Email").interact_text()?;
        let password = Password::new().with_prompt("Password").interact()?;

        println!("\n{} Logging in...", "⏳".yellow());

        let login_request = LoginRequest {
            email: email.clone(),
            password,
        };

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        let api_url =
            std::env::var("API_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());

        let response = client
            .post(format!("{}/api/v1/auth/login", api_url))
            .json(&login_request)
            .send()
            .await?;

        if response.status().is_success() {
            let auth_response: AuthResponse = response.json().await?;
            utils::save_token(&auth_response.token)?;
            println!(
                "{} Login successful! Welcome, {}.",
                "✔".green(),
                auth_response.user.email.bold().cyan()
            );
        } else {
            let status = response.status();
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            println!(
                "{} Login failed ({}): {}",
                "✖".red(),
                status,
                error_body.red()
            );
        }

        Ok(())
    }

    async fn handle_chain_command(
        adapter: Arc<dyn ChainAdapter>,
        command: ChainCommand,
        pretty: bool,
    ) -> Result<()> {
        match command {
            ChainCommand::Call { method, params } => {
                let params_val: Value = if let Some(p) = params {
                    serde_json::from_str(&p).map_err(|e| anyhow!("Invalid JSON params: {}", e))?
                } else {
                    Value::Array(vec![])
                };

                println!(
                    "{} Calling {} on {}...",
                    "🚀".bold(),
                    method.cyan(),
                    adapter.name().green()
                );

                let result = adapter.call_rpc(&method, params_val.clone()).await;

                let mut user_id_to_log: Option<ObjectId> = None;

                if let Ok(config) = Config::from_env() {
                    if let Ok(client) = establish_connection(&config.mongo_uri).await {
                        if let Some(token) = utils::get_token() {
                            let jwt_helper = JwtHelper::new(config.jwt_secret);
                            if let Ok(claims) = jwt_helper.verify_token(&token) {
                                if let Ok(oid) = ObjectId::from_str(&claims.sub) {
                                    user_id_to_log = Some(oid);
                                }
                            }
                        }

                        let user_id_to_log = resolve_audit_user_id(user_id_to_log);
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
                Self::print_value(&response, pretty)?;
            }
            ChainCommand::Balance { address } => {
                println!(
                    "{} Fetching balance for {} on {}...\n",
                    "💰".bold(),
                    address.dimmed(),
                    adapter.name().green()
                );

                let resolved_address = if let Some(addr) = adapter.resolve_name(&address).await? {
                    println!(
                        "{} Resolved {} to {}\n",
                        "🔍".blue(),
                        address.yellow(),
                        addr.cyan()
                    );
                    addr
                } else {
                    if address.ends_with(".sui") || address.ends_with(".eth") {
                        println!(
                            "{} {} could not be resolved! Proceeding with raw input...\n",
                            "⚠️".yellow(),
                            address.yellow()
                        );
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
                            println!(
                                "{0: <15} | {1: <10} | {2}",
                                "Balance".bold(),
                                "Objects".bold(),
                                "Coin Type".bold()
                            );
                            println!("{0:-<15}-+-{0:-<10}-+-{0:-<40}", "");

                            for item in arr {
                                let balance = item
                                    .get("totalBalance")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("0");
                                let count = item
                                    .get("coinObjectCount")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(0);
                                let coin_type = item
                                    .get("coinType")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("Unknown");

                                let display_balance = if coin_type == "0x2::sui::SUI" {
                                    if let Ok(b) = balance.parse::<u128>() {
                                        format!("{} SUI", format_units_fixed(b, 9, 4))
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
                                        format!(
                                            "{}...{}",
                                            &coin_type[..10],
                                            &coin_type[coin_type.len() - 10..]
                                        )
                                        .cyan()
                                        .to_string()
                                    }
                                } else {
                                    coin_type.cyan().to_string()
                                };

                                println!(
                                    "{0: <15} | {1: <10} | {2}",
                                    display_balance.green().bold(),
                                    count.to_string().yellow(),
                                    short_coin
                                );
                            }
                            println!();
                        }
                    } else {
                        Self::print_value(&result, pretty)?;
                    }
                } else if chain_name == "Ethereum" {
                    if let Some(hex_str) = result.as_str() {
                        let clean_hex = hex_str.trim_start_matches("0x");
                        if let Ok(wei) = u128::from_str_radix(clean_hex, 16) {
                            let eth = format_units_fixed(wei, 18, 4);
                            println!("{} {} ETH", "Balance:".bold().cyan(), eth.green().bold());
                        } else {
                            println!("{} {}", "Balance (Wei Hex):".bold().cyan(), hex_str.green());
                        }
                    } else {
                        Self::print_value(&result, pretty)?;
                    }
                } else if chain_name == "Solana" {
                    if let Some(val) = result.get("value").and_then(|v| v.as_u64()) {
                        let sol = format_units_fixed(val as u128, 9, 4);
                        println!("{} {} SOL", "Balance:".bold().cyan(), sol.green().bold());
                    } else {
                        Self::print_value(&result, pretty)?;
                    }
                } else if chain_name == "Aptos" {
                    let mut found = false;
                    if let Some(arr) = result.as_array() {
                        for resource in arr {
                            if let Some(res_type) = resource.get("type").and_then(|t| t.as_str()) {
                                if res_type == "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>" {
                                    if let Some(coin) =
                                        resource.get("data").and_then(|d| d.get("coin"))
                                    {
                                        if let Some(val_str) =
                                            coin.get("value").and_then(|v| v.as_str())
                                        {
                                            if let Ok(val) = val_str.parse::<u128>() {
                                                let apt = format_units_fixed(val, 8, 4);
                                                println!(
                                                    "{} {} APT",
                                                    "Balance:".bold().cyan(),
                                                    apt.green().bold()
                                                );
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
                        Self::print_value(&result, pretty)?;
                    }
                } else {
                    Self::print_value(&result, pretty)?;
                }
            }
            ChainCommand::Tx { hash } => {
                println!(
                    "{} Fetching transaction {} on {}...\n",
                    "🔎".bold(),
                    hash.dimmed(),
                    adapter.name().green()
                );
                let result = adapter.get_transaction(&hash).await?;
                Self::print_value(&result, pretty)?;
            }
            ChainCommand::Object { id } => {
                println!(
                    "{} Inspecting {} on {}...\n",
                    "🔎".bold(),
                    id.dimmed(),
                    adapter.name().green()
                );
                let result = adapter.get_account(&id).await?;
                Self::print_value(&result, pretty)?;
            }
            ChainCommand::History { address, limit } => {
                println!(
                    "{} Fetching {} recent transactions for {} on {}...\n",
                    "📜".bold(),
                    limit,
                    address.dimmed(),
                    adapter.name().green()
                );
                let result = adapter.get_history(&address, limit).await?;
                Self::print_value(&result, pretty)?;
            }
            ChainCommand::Gas => {
                println!(
                    "{} Fetching gas price on {}...\n",
                    "⛽".bold(),
                    adapter.name().green()
                );
                let result = adapter.get_gas_price().await?;
                let chain = adapter.name();

                if chain == "Sui" {
                    let mist = result
                        .as_str()
                        .and_then(|s| s.parse::<u64>().ok())
                        .or_else(|| result.as_u64())
                        .unwrap_or(0);
                    let sui_gas = format_units_fixed(mist as u128, 9, 9);
                    println!(
                        "{} {} MIST  ({} SUI per gas unit)",
                        "Reference Gas Price:".bold().cyan(),
                        mist.to_string().green().bold(),
                        sui_gas
                    );
                } else if chain == "Ethereum" {
                    if let Some(hex) = result.as_str() {
                        let clean = hex.trim_start_matches("0x");
                        if let Ok(wei) = u128::from_str_radix(clean, 16) {
                            let gwei = format_units_fixed(wei, 9, 4);
                            println!(
                                "{} {} Gwei  ({} wei)",
                                "Gas Price:".bold().cyan(),
                                gwei.green().bold(),
                                wei.to_string().yellow()
                            );
                        } else {
                            Self::print_value(&result, pretty)?;
                        }
                    } else {
                        Self::print_value(&result, pretty)?;
                    }
                } else {
                    Self::print_value(&result, pretty)?;
                }
            }
            ChainCommand::Block { number } => {
                match number {
                    Some(n) => println!(
                        "{} Fetching block #{} on {}...\n",
                        "📦".bold(),
                        n,
                        adapter.name().green()
                    ),
                    None => println!(
                        "{} Fetching latest block on {}...\n",
                        "📦".bold(),
                        adapter.name().green()
                    ),
                }
                let result = adapter.get_block(number).await?;
                Self::print_value(&result, pretty)?;
            }
        }
        Ok(())
    }

    fn print_value(value: &Value, pretty: bool) -> Result<()> {
        if pretty {
            println!("{}", serde_json::to_string_pretty(value)?);
        } else {
            println!("{}", serde_json::to_string(value)?);
        }
        Ok(())
    }
}
