use crate::chains::traits::ChainAdapter;
use crate::cli::parser::Network;
use async_trait::async_trait;
use serde_json::{json, Value};
use anyhow::{Result, anyhow};
use reqwest::Client;

pub struct AptosAdapter {
    client: Client,
    rpc_url: String,
}

impl AptosAdapter {
    pub fn new() -> Self {
        Self::with_rpc(None, Network::Mainnet)
    }

    pub fn with_rpc(rpc_url: Option<String>, network: Network) -> Self {
        let url = rpc_url.unwrap_or_else(|| match network {
            Network::Mainnet => "https://fullnode.mainnet.aptoslabs.com/v1".to_string(),
            Network::Testnet => "https://fullnode.testnet.aptoslabs.com/v1".to_string(),
            Network::Devnet => "https://fullnode.devnet.aptoslabs.com/v1".to_string(),
            Network::Localnet => "http://127.0.0.1:8080/v1".to_string(),
        });

        Self {
            client: Client::new(),
            rpc_url: url,
        }
    }
}

#[async_trait]
impl ChainAdapter for AptosAdapter {
    fn name(&self) -> &'static str {
        "Aptos"
    }

    fn default_rpc(&self) -> &'static str {
        "https://fullnode.mainnet.aptoslabs.com/v1"
    }

    async fn call_rpc(&self, method: &str, _params: Value) -> Result<Value> {
        // Aptos uses REST API mostly, but we can simulate/wrap it
        let url = format!("{}/{}", self.rpc_url, method);
        let response = self.client.get(&url).send().await?;
        let body: Value = response.json().await?;
        Ok(body)
    }

    async fn get_balance(&self, address: &str) -> Result<Value> {
        let method = format!("accounts/{}/resources", address);
        self.call_rpc(&method, Value::Null).await
    }
}
