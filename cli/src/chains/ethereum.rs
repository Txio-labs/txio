use crate::chains::traits::ChainAdapter;
use crate::cli::parser::Network;
use async_trait::async_trait;
use serde_json::{json, Value};
use anyhow::{Result, anyhow};
use reqwest::Client;

pub struct EthereumAdapter {
    client: Client,
    rpc_url: String,
}

impl EthereumAdapter {
    pub fn new() -> Self {
        Self::with_rpc(None, Network::Mainnet)
    }

    pub fn with_rpc(rpc_url: Option<String>, network: Network) -> Self {
        let url = rpc_url.unwrap_or_else(|| match network {
            Network::Mainnet => "https://eth.llamarpc.com".to_string(),
            Network::Testnet => "https://rpc.sepolia.org".to_string(), // Sepolia as testnet
            Network::Devnet => "http://127.0.0.1:8545".to_string(), // Anvil/Hardhat
            Network::Localnet => "http://127.0.0.1:8545".to_string(),
        });

        Self {
            client: Client::new(),
            rpc_url: url,
        }
    }
}

#[async_trait]
impl ChainAdapter for EthereumAdapter {
    fn name(&self) -> &'static str {
        "Ethereum"
    }

    fn default_rpc(&self) -> &'static str {
        "https://eth.llamarpc.com"
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
        if let Some(error) = body.get("error") {
            let msg = error.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown RPC Error");
            let code = error.get("code").and_then(|c| c.as_i64()).unwrap_or(0);
            return Err(anyhow!("{} (Code: {})", msg, code));
        }

        Ok(body.get("result").cloned().unwrap_or(Value::Null))
    }

    async fn resolve_name(&self, name: &str) -> Result<Option<String>> {
        if !name.ends_with(".eth") {
            return Ok(None);
        }
        // ENS resolution would go here
        Ok(None)
    }

    async fn get_balance(&self, address: &str) -> Result<Value> {
        let params = json!([address, "latest"]);
        self.call_rpc("eth_getBalance", params).await
    }
}
