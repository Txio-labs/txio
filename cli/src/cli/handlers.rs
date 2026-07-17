use crate::chains::factory::ChainFactory;
use crate::chains::traits::ChainAdapter;
use crate::cli::format::format_units_fixed;
use crate::cli::parser::{ChainCommand, Cli, Commands, ConfigAction, DbAction};
use crate::utils;
use anyhow::{Result, anyhow};
use colored::*;
use serde_json::Value;
use std::sync::Arc;
use txio_api::dtos::admin_dtos::{
    AdminLogEntry, AdminStatsResponse, AdminUsersResponse, RpcLogRequest,
};
use txio_api::dtos::request::LoginRequest;
use txio_api::dtos::response::AuthResponse;

use dialoguer::{Confirm, Input, Password};

fn api_base_url() -> String {
    std::env::var("API_URL").unwrap_or_else(|_| "http://localhost:8000".to_string())
}

fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

fn truncate_utf8_for_display(input: &str, prefix_len: usize, suffix_len: usize) -> String {
    let char_count = input.chars().count();
    if char_count <= prefix_len + suffix_len {
        return input.to_string();
    }

    let prefix: String = input.chars().take(prefix_len).collect();
    let suffix: String = input
        .chars()
        .rev()
        .take(suffix_len)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();

    format!("{prefix}...{suffix}")
}

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
        let token = match utils::get_token() {
            Some(token) => token,
            None => {
                println!(
                    "{} Not logged in. Run {} first.",
                    "✖".red(),
                    "txio login".cyan()
                );
                return Ok(());
            }
        };

        let client = http_client();
        let api = api_base_url();

        match action {
            DbAction::ListUsers => {
                let response = client
                    .get(format!("{}/api/v1/admin/users", api))
                    .bearer_auth(&token)
                    .send()
                    .await?;

                if let Some(body) = Self::handle_admin_error(response.status()) {
                    println!("{}", body);
                    return Ok(());
                }

                let body: AdminUsersResponse = response.json().await?;
                println!("{}", "Registered Users:".bold().cyan());
                if body.emails.is_empty() {
                    println!("  {}", "No users found.".yellow());
                } else {
                    for email in body.emails {
                        println!("  - {}", email.green());
                    }
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

                let response = client
                    .post(format!("{}/api/v1/admin/users/delete", api))
                    .bearer_auth(&token)
                    .json(&serde_json::json!({ "email": email }))
                    .send()
                    .await?;

                if let Some(body) = Self::handle_admin_error(response.status()) {
                    println!("{}", body);
                    return Ok(());
                }

                println!("{} User '{}' deleted.", "✔".green(), email.bold());
            }
            DbAction::Stats => {
                let response = client
                    .get(format!("{}/api/v1/admin/stats", api))
                    .bearer_auth(&token)
                    .send()
                    .await?;

                if let Some(body) = Self::handle_admin_error(response.status()) {
                    println!("{}", body);
                    return Ok(());
                }

                let stats: AdminStatsResponse = response.json().await?;
                println!("{}", "─── Database Stats ───".bold().cyan());
                println!(
                    "  {} Registered users: {}",
                    "»".dimmed(),
                    stats.user_count.to_string().green().bold()
                );
                println!(
                    "  {} Total RPC logs:   {}",
                    "»".dimmed(),
                    stats.rpc_log_count.to_string().yellow().bold()
                );
            }
            DbAction::ListLogs { limit } => {
                let response = client
                    .get(format!("{}/api/v1/admin/logs", api))
                    .query(&[("limit", limit.to_string())])
                    .bearer_auth(&token)
                    .send()
                    .await?;

                if let Some(body) = Self::handle_admin_error(response.status()) {
                    println!("{}", body);
                    return Ok(());
                }

                let logs: Vec<AdminLogEntry> = response.json().await?;
                println!("{}", "Recent RPC Logs:".bold().cyan());
                if logs.is_empty() {
                    println!("  {}", "No logs found.".yellow());
                } else {
                    for log in logs {
                        let status = if log.success {
                            "OK".green()
                        } else {
                            "ERR".red()
                        };
                        let err = log.error.unwrap_or_default();
                        println!(
                            "  [{}] {} {}",
                            status,
                            log.method.cyan(),
                            if !err.is_empty() {
                                format!("— {}", err.dimmed())
                            } else {
                                String::new()
                            }
                        );
                    }
                }
            }
        }
        Ok(())
    }

    /// Maps an admin-endpoint HTTP status into a user-facing message, or
    /// `None` when the response was successful and the caller should
    /// proceed to read the body.
    fn handle_admin_error(status: reqwest::StatusCode) -> Option<String> {
        match status {
            reqwest::StatusCode::UNAUTHORIZED => Some(format!(
                "{} Session expired or invalid. Run {} again.",
                "✖".red(),
                "txio login".cyan()
            )),
            reqwest::StatusCode::FORBIDDEN => {
                Some(format!("{} Admin access required.", "✖".red()))
            }
            status if status.is_success() => None,
            status => Some(format!("{} Request failed ({}).", "✖".red(), status)),
        }
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

                // Best-effort audit log: the backend verifies the token and
                // attributes the log to the authenticated user itself, so a
                // failure here (offline, logged out, server unreachable)
                // must never block returning the RPC result to the user.
                if let Some(token) = utils::get_token() {
                    let log_request = RpcLogRequest {
                        method: method.clone(),
                        params: params_val,
                        success: result.is_ok(),
                        error: result.as_ref().err().map(|e| e.to_string()),
                    };
                    let _ = http_client()
                        .post(format!("{}/api/v1/auth/rpc-log", api_base_url()))
                        .bearer_auth(&token)
                        .json(&log_request)
                        .send()
                        .await;
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
                                        truncate_utf8_for_display(coin_type, 10, 10)
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

#[cfg(test)]
mod tests {
    use super::truncate_utf8_for_display;

    #[test]
    fn truncates_multi_byte_utf8_input_without_panicking() {
        let input = "0x2::🍕::coin::very_long_type_name";
        let output = truncate_utf8_for_display(input, 10, 10);

        assert!(output.contains("..."));
        assert!(output.chars().count() < input.chars().count());
    }

    #[test]
    fn leaves_short_strings_unchanged() {
        let input = "0x2::sui::SUI";
        assert_eq!(truncate_utf8_for_display(input, 10, 10), input);
    }
}
