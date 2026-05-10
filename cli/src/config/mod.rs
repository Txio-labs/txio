use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Config {
    pub default_chain: String,
    pub rpc_endpoints: HashMap<String, String>,
    pub profiles: Vec<Profile>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Profile {
    pub name: String,
    pub active: bool,
}

impl Config {
    pub fn load() -> Self {
        // In a real app, this would load from ~/.flow/config.toml
        Self::default()
    }
}
