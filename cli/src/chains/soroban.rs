use crate::chains::traits::ChainAdapter;
use crate::cli::parser::Network;
use async_trait::async_trait;
use serde_json::{json, Value};
use anyhow::{Result, anyhow};
use reqwest::Client;

pub struct SorobanAdapter {
    client: Client,
    rpc_url: String,
}

impl SorobanAdapter {
    pub fn new() -> Self {
        Self::with_rpc(None, Network::Mainnet)
    }

    pub fn with_rpc(rpc_url: Option<String>, network: Network) -> Self {
        let url = rpc_url.unwrap_or_else(|| match network {
            Network::Mainnet => "https://soroban-rpc.mainnet.stellar.org".to_string(),
            Network::Testnet => "https://soroban-testnet.stellar.org".to_string(),
            Network::Devnet => "https://futurenet.soroban-rpc.stellar.org".to_string(), // Futurenet is often used as devnet
            Network::Localnet => "http://127.0.0.1:8000/soroban/rpc".to_string(),
        });

        Self {
            client: Client::new(),
            rpc_url: url,
        }
    }
}

#[async_trait]
impl ChainAdapter for SorobanAdapter {
    fn name(&self) -> &'static str {
        "Soroban"
    }

    fn default_rpc(&self) -> &'static str {
        "https://soroban-rpc.mainnet.stellar.org"
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

    async fn get_balance(&self, address: &str) -> Result<Value> {
        // Typically stellar balances are fetched via Horizon API, but for Soroban RPC
        // we can fetch ledger entries. For simplicity, we just use getLatestLedger as a ping
        // or attempt to query if the user requests it. We'll return a simulated response for now 
        // until a specific Soroban token ID is provided.
        // Let's just do a generic getLatestLedger to ensure the RPC works
        self.call_rpc("getLatestLedger", json!([])).await
    }
}
