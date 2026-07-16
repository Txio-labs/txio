use crate::chains::traits::ChainAdapter;
use crate::chains::validation::{build_url_with_query, build_url, validate_soroban_address};
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

    fn horizon_url(&self) -> &'static str {
        if self.rpc_url.contains("mainnet") {
            "https://horizon.stellar.org"
        } else {
            "https://horizon-testnet.stellar.org"
        }
    }

    pub fn with_rpc(rpc_url: Option<String>, network: Network) -> Self {
        let url = rpc_url.unwrap_or_else(|| match network {
            Network::Mainnet => "https://soroban-rpc.mainnet.stellar.org".to_string(),
            Network::Testnet => "https://soroban-testnet.stellar.org".to_string(),
            Network::Devnet => "https://futurenet.soroban-rpc.stellar.org".to_string(), // Futurenet is often used as devnet
            Network::Localnet => "http://127.0.0.1:8000/soroban/rpc".to_string(),
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
        let address = validate_soroban_address(address)?;
        let horizon = self.horizon_url();
        let url = build_url(&horizon, &["accounts", &address])?;
        Ok(self.client.get(url).send().await?.json().await?)
    }

    async fn get_transaction(&self, hash: &str) -> Result<Value> {
        self.call_rpc("getTransaction", json!({ "hash": hash })).await
    }

    async fn get_block(&self, block: Option<u64>) -> Result<Value> {
        match block {
            Some(seq) => {
                self.call_rpc("getLedgers", json!({ "startLedger": seq, "limit": 1 })).await
            }
            None => {
                self.call_rpc("getLatestLedger", json!({})).await
            }
        }
    }

    async fn get_gas_price(&self) -> Result<Value> {
        self.call_rpc("getFeeStats", json!({})).await
    }

    async fn get_account(&self, address: &str) -> Result<Value> {
        let address = validate_soroban_address(address)?;
        let horizon = self.horizon_url();
        let url = build_url(&horizon, &["accounts", &address])?;
        Ok(self.client.get(url).send().await?.json().await?)
    }

    async fn get_history(&self, address: &str, limit: u32) -> Result<Value> {
        let address = validate_soroban_address(address)?;
        let horizon = self.horizon_url();
        let url = build_url_with_query(
            &horizon,
            &["accounts", &address, "transactions"],
            &[("limit", limit.to_string()), ("order", "desc".to_string())],
        )?;
        Ok(self.client.get(url).send().await?.json().await?)
    }
}
