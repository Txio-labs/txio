use crate::chains::traits::ChainAdapter;
use crate::chains::validation::validate_solana_address;
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
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| Client::new()),
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
        let address = validate_solana_address(address)?;
        let params = json!([address]);
        self.call_rpc("getBalance", params).await
    }

    async fn get_transaction(&self, hash: &str) -> Result<Value> {
        self.call_rpc("getTransaction", json!([
            hash,
            { "encoding": "jsonParsed", "maxSupportedTransactionVersion": 0 }
        ])).await
    }

    async fn get_block(&self, block: Option<u64>) -> Result<Value> {
        let slot = match block {
            Some(n) => n,
            None => {
                let val = self.call_rpc("getSlot", json!([])).await?;
                val.as_u64().unwrap_or(0)
            }
        };
        self.call_rpc("getBlock", json!([
            slot,
            {
                "encoding": "jsonParsed",
                "maxSupportedTransactionVersion": 0,
                "transactionDetails": "full",
                "rewards": false
            }
        ])).await
    }

    async fn get_gas_price(&self) -> Result<Value> {
        self.call_rpc("getRecentPrioritizationFees", json!([[]])).await
    }

    async fn get_account(&self, address: &str) -> Result<Value> {
        let address = validate_solana_address(address)?;
        self.call_rpc("getAccountInfo", json!([
            address,
            { "encoding": "jsonParsed" }
        ])).await
    }

    async fn get_history(&self, address: &str, limit: u32) -> Result<Value> {
        let address = validate_solana_address(address)?;
        self.call_rpc("getSignaturesForAddress", json!([
            address,
            { "limit": limit }
        ])).await
    }
}
