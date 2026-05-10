use crate::chains::traits::ChainAdapter;
use crate::cli::parser::Network;
use async_trait::async_trait;
use serde_json::{json, Value};
use anyhow::{Result, anyhow};
use reqwest::Client;

pub struct SolanaAdapter {
    client: Client,
    rpc_url: String,
}

impl SolanaAdapter {
    pub fn new() -> Self {
        Self::with_rpc(None, Network::Mainnet)
    }

    pub fn with_rpc(rpc_url: Option<String>, network: Network) -> Self {
        let url = rpc_url.unwrap_or_else(|| match network {
            Network::Mainnet => "https://api.mainnet-beta.solana.com".to_string(),
            Network::Testnet => "https://api.testnet.solana.com".to_string(),
            Network::Devnet => "https://api.devnet.solana.com".to_string(),
            Network::Localnet => "http://127.0.0.1:8899".to_string(),
        });

        Self {
            client: Client::new(),
            rpc_url: url,
        }
    }
}

#[async_trait]
impl ChainAdapter for SolanaAdapter {
    fn name(&self) -> &'static str {
        "Solana"
    }

    fn default_rpc(&self) -> &'static str {
        "https://api.mainnet-beta.solana.com"
    }

    async fn call_rpc(&self, method: &str, params: Value) -> Result<Value> {
        let payload = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params
        });

        let response = self.client.post(&self.rpc_url)
            .json(&payload)
            .send()
            .await?;

        let body: Value = response.json().await?;
        Ok(body.get("result").cloned().unwrap_or(Value::Null))
    }

    async fn get_balance(&self, address: &str) -> Result<Value> {
        let params = json!([address]);
        self.call_rpc("getBalance", params).await
    }
}
