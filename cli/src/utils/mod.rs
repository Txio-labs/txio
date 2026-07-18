use anyhow::Result;
use serde_json;
use std::fs;
use std::path::PathBuf;

pub fn get_config_dir() -> PathBuf {
    let mut path = dirs_next::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push(".txio");
    if !path.exists() {
        fs::create_dir_all(&path).ok();
    }
    path
}

pub fn save_current_chain(chain: &str) -> Result<()> {
    let mut path = get_config_dir();
    path.push("current_chain");
    fs::write(path, chain)?;
    Ok(())
}

pub fn get_current_chain() -> Option<String> {
    let mut path = get_config_dir();
    path.push("current_chain");
    fs::read_to_string(path).ok().map(|s| s.trim().to_string())
}

pub fn save_token(token: &str) -> Result<()> {
    let mut path = get_config_dir();
    path.push("token");
    fs::write(path, token)?;
    Ok(())
}

pub fn get_token() -> Option<String> {
    let mut path = get_config_dir();
    path.push("token");
    fs::read_to_string(path).ok().map(|s| s.trim().to_string())
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
    map.insert(
        key.to_string(),
        serde_json::Value::String(value.to_string()),
    );
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
