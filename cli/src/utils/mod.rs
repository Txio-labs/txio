use std::fs;
use std::path::PathBuf;
use anyhow::{Result, Context};
use serde_json;

const CONFIG_DIR: &str = ".txio";
const CHAIN_FILE: &str = "current_chain";
const TOKEN_FILE: &str = "token";

/// Gets the configuration directory path, creating it if necessary
pub fn get_config_dir() -> PathBuf {
    let mut path = dirs_next::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push(CONFIG_DIR);
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path
}

/// Gets the full path to a config file
fn get_config_file(filename: &str) -> PathBuf {
    let mut path = get_config_dir();
    path.push(filename);
    path
}

/// Persists the currently selected blockchain chain to local storage
/// 
/// # Arguments
/// * `chain` - The blockchain chain identifier (e.g., "ethereum", "solana")
pub fn save_current_chain(chain: &str) -> Result<()> {
    let path = get_config_file(CHAIN_FILE);
    fs::write(&path, chain)
        .with_context(|| format!("Failed to save current chain to {:?}", path))?;
    Ok(())
}

/// Retrieves the last selected blockchain chain from local storage
/// 
/// # Returns
/// * `Some(chain)` if a chain was previously saved
/// * `None` if no chain has been saved yet
pub fn get_current_chain() -> Option<String> {
    let path = get_config_file(CHAIN_FILE);
    fs::read_to_string(path).ok().map(|s| s.trim().to_string())
}

/// Persists the authentication token to local storage (encrypted recommended in production)
/// 
/// # Arguments
/// * `token` - The JWT authentication token
/// 
/// # Security Warning
/// Tokens are stored in plaintext. Consider encrypting sensitive credentials.
pub fn save_token(token: &str) -> Result<()> {
    let path = get_config_file(TOKEN_FILE);
    fs::write(&path, token)
        .with_context(|| format!("Failed to save token to {:?}", path))?;
    Ok(())
}

/// Retrieves the stored authentication token from local storage
/// 
/// # Returns
/// * `Some(token)` if a token is stored
/// * `None` if no token has been saved yet
pub fn get_token() -> Option<String> {
    let path = get_config_file(TOKEN_FILE);
    fs::read_to_string(path).ok().map(|s| s.trim().to_string())
}

/// Clears stored authentication token from local storage
pub fn clear_token() -> Result<()> {
    let path = get_config_file(TOKEN_FILE);
    if path.exists() {
        fs::remove_file(&path)
            .with_context(|| format!("Failed to remove token from {:?}", path))?;
    }
    Ok(())
}

pub fn remove_token() -> Result<()> {
    let mut path = get_config_dir();
    path.push("token");
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

pub fn save_config(key: &str, value: &str) -> Result<()> {
    let mut path = get_config_dir();
    path.push("config.json");
    let mut map: serde_json::Map<String, serde_json::Value> = if path.exists() {
        let content = fs::read_to_string(&path)?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        serde_json::Map::new()
    };
    map.insert(key.to_string(), serde_json::Value::String(value.to_string()));
    fs::write(path, serde_json::to_string_pretty(&map)?)?;
    Ok(())
}

pub fn get_config(key: &str) -> Result<Option<String>> {
    let mut path = get_config_dir();
    path.push("config.json");
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path)?;
    let map: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(&content).unwrap_or_default();
    Ok(map.get(key).and_then(|v| v.as_str()).map(|s| s.to_string()))
}

pub fn list_config() -> Result<Vec<(String, String)>> {
    let mut path = get_config_dir();
    path.push("config.json");
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path)?;
    let map: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(&content).unwrap_or_default();
    Ok(map
        .into_iter()
        .filter_map(|(k, v)| v.as_str().map(|s| (k, s.to_string())))
        .collect())
}

pub fn remove_config(key: &str) -> Result<()> {
    let mut path = get_config_dir();
    path.push("config.json");
    if !path.exists() {
        return Ok(());
    }
    let content = fs::read_to_string(&path)?;
    let mut map: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(&content).unwrap_or_default();
    map.remove(key);
    fs::write(path, serde_json::to_string_pretty(&map)?)?;
    Ok(())
}
