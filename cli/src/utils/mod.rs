use std::fs;
use std::path::PathBuf;
use anyhow::Result;

pub fn get_config_dir() -> PathBuf {
    let mut path = dirs_next::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push(".flow");
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
