use crate::chains::traits::ChainAdapter;
use crate::chains::validation::{build_url, build_url_with_query, validate_aptos_address};
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
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| Client::new()),
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
        let address = validate_aptos_address(address)?;
        let url = build_url(&self.rpc_url, &["accounts", &address, "resources"])?;
        Ok(self.client.get(url).send().await?.json().await?)
    }

    async fn get_transaction(&self, hash: &str) -> Result<Value> {
        let url = build_url(&self.rpc_url, &["transactions", "by_hash", hash])?;
        let res = self.client.get(url).send().await?;
        Ok(res.json().await?)
    }

    async fn get_block(&self, block: Option<u64>) -> Result<Value> {
        match block {
            Some(height) => {
                let url = build_url(&self.rpc_url, &["blocks", "by_height", &height.to_string()])?;
                Ok(self.client.get(url).send().await?.json().await?)
            }
            None => {
                let url = build_url(&self.rpc_url, &[""])?;
                Ok(self.client.get(url).send().await?.json().await?)
            }
        }
    }

    async fn get_gas_price(&self) -> Result<Value> {
        let url = build_url(&self.rpc_url, &["estimate_gas_price"])?;
        Ok(self.client.get(url).send().await?.json().await?)
    }

    async fn get_account(&self, address: &str) -> Result<Value> {
        let address = validate_aptos_address(address)?;
        let url = build_url(&self.rpc_url, &["accounts", &address])?;
        Ok(self.client.get(url).send().await?.json().await?)
    }

    async fn get_history(&self, address: &str, limit: u32) -> Result<Value> {
        let address = validate_aptos_address(address)?;
        let url = build_url_with_query(
            &self.rpc_url,
            &["accounts", &address, "transactions"],
            &[("limit", limit.to_string())],
        )?;
        Ok(self.client.get(url).send().await?.json().await?)
    }
}
