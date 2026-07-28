use crate::chains::traits::ChainAdapter;
use crate::chains::validation::{build_url, build_url_with_query, validate_soroban_address};
use crate::cli::parser::Network;
use anyhow::{Result, anyhow};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::{Value, json};

pub struct SorobanAdapter {
    client: Client,
    rpc_url: String,
    network: Network,
}

impl SorobanAdapter {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self::with_rpc(None, Network::Mainnet)
    }

    fn horizon_url(&self) -> Result<&'static str> {
        match self.network {
            Network::Mainnet => Ok("https://horizon.stellar.org"),
            Network::Testnet => Ok("https://horizon-testnet.stellar.org"),
            Network::Devnet | Network::Localnet => Err(anyhow!(
                "Horizon API is not available for {:?} network; \
                 balance, account, and history commands require mainnet or testnet",
                self.network
            )),
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
            network,
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

        let response = self
            .client
            .post(&self.rpc_url)
            .json(&payload)
            .send()
            .await?;

        let body: Value = response.json().await?;
        if let Some(error) = body.get("error") {
            let msg = error
                .get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("Unknown RPC Error");
            let code = error.get("code").and_then(|c| c.as_i64()).unwrap_or(0);
            return Err(anyhow!("{msg} (Code: {code})"));
        }

        Ok(body.get("result").cloned().unwrap_or(Value::Null))
    }

    async fn get_balance(&self, address: &str) -> Result<Value> {
        let address = validate_soroban_address(address)?;
        let horizon = self.horizon_url()?;
        let url = build_url(horizon, &["accounts", &address])?;
        Ok(self.client.get(url).send().await?.json().await?)
    }

    async fn get_transaction(&self, hash: &str) -> Result<Value> {
        self.call_rpc("getTransaction", json!({ "hash": hash }))
            .await
    }

    async fn get_block(&self, block: Option<u64>) -> Result<Value> {
        match block {
            Some(seq) => {
                self.call_rpc("getLedgers", json!({ "startLedger": seq, "limit": 1 }))
                    .await
            }
            None => self.call_rpc("getLatestLedger", json!({})).await,
        }
    }

    async fn get_gas_price(&self) -> Result<Value> {
        self.call_rpc("getFeeStats", json!({})).await
    }

    async fn get_account(&self, address: &str) -> Result<Value> {
        let address = validate_soroban_address(address)?;
        let horizon = self.horizon_url()?;
        let url = build_url(horizon, &["accounts", &address])?;
        Ok(self.client.get(url).send().await?.json().await?)
    }

    async fn get_history(&self, address: &str, limit: u32) -> Result<Value> {
        let address = validate_soroban_address(address)?;
        let horizon = self.horizon_url()?;
        let url = build_url_with_query(
            horizon,
            &["accounts", &address, "transactions"],
            &[("limit", limit.to_string()), ("order", "desc".to_string())],
        )?;
        Ok(self.client.get(url).send().await?.json().await?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn horizon_url_mainnet_returns_mainnet_horizon() {
        let adapter = SorobanAdapter::with_rpc(None, Network::Mainnet);
        assert_eq!(
            adapter.horizon_url().unwrap(),
            "https://horizon.stellar.org"
        );
    }

    #[test]
    fn horizon_url_mainnet_with_custom_rpc_still_returns_mainnet_horizon() {
        let adapter = SorobanAdapter::with_rpc(
            Some("https://my-node.example.com".to_string()),
            Network::Mainnet,
        );
        assert_eq!(
            adapter.horizon_url().unwrap(),
            "https://horizon.stellar.org"
        );
    }

    #[test]
    fn horizon_url_testnet_returns_testnet_horizon() {
        let adapter = SorobanAdapter::with_rpc(None, Network::Testnet);
        assert_eq!(
            adapter.horizon_url().unwrap(),
            "https://horizon-testnet.stellar.org"
        );
    }

    #[test]
    fn horizon_url_devnet_returns_error() {
        let adapter = SorobanAdapter::with_rpc(None, Network::Devnet);
        let err = adapter.horizon_url().unwrap_err();
        assert!(
            err.to_string().contains("not available"),
            "expected 'not available' error, got: {err}"
        );
    }

    #[test]
    fn horizon_url_localnet_returns_error() {
        let adapter = SorobanAdapter::with_rpc(None, Network::Localnet);
        let err = adapter.horizon_url().unwrap_err();
        assert!(
            err.to_string().contains("not available"),
            "expected 'not available' error, got: {err}"
        );
    }

    #[test]
    fn with_rpc_stores_network() {
        let adapter = SorobanAdapter::with_rpc(None, Network::Testnet);
        assert_eq!(adapter.network, Network::Testnet);
    }

    #[test]
    fn with_rpc_custom_url_uses_network_for_horizon() {
        // The exact bug scenario: custom rpc_url that doesn't contain "mainnet"
        // but user selected mainnet network — should still resolve to mainnet Horizon
        let adapter = SorobanAdapter::with_rpc(
            Some("https://custom-soroban-rpc.example.com".to_string()),
            Network::Mainnet,
        );
        assert_eq!(
            adapter.horizon_url().unwrap(),
            "https://horizon.stellar.org"
        );
        assert_eq!(adapter.rpc_url, "https://custom-soroban-rpc.example.com");
    }
}
