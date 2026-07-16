use crate::chains::traits::ChainAdapter;
use crate::chains::validation::{validate_ethereum_address};
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
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| Client::new()),
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
        let address = validate_ethereum_address(address)?;
        let params = json!([address, "latest"]);
        self.call_rpc("eth_getBalance", params).await
    }

    async fn get_transaction(&self, hash: &str) -> Result<Value> {
        self.call_rpc("eth_getTransactionByHash", json!([hash])).await
    }

    async fn get_block(&self, block: Option<u64>) -> Result<Value> {
        let tag = match block {
            Some(n) => format!("0x{:x}", n),
            None => "latest".to_string(),
        };
        self.call_rpc("eth_getBlockByNumber", json!([tag, false])).await
    }

    async fn get_gas_price(&self) -> Result<Value> {
        self.call_rpc("eth_gasPrice", json!([])).await
    }

    async fn get_account(&self, address: &str) -> Result<Value> {
        let address = validate_ethereum_address(address)?;
        let balance = self.call_rpc("eth_getBalance", json!([address, "latest"])).await?;
        let nonce = self.call_rpc("eth_getTransactionCount", json!([address, "latest"])).await?;
        let code = self.call_rpc("eth_getCode", json!([address, "latest"])).await?;
        Ok(json!({
            "address": address,
            "balance": balance,
            "nonce": nonce,
            "bytecode": code,
            "isContract": code.as_str().map(|c| c != "0x").unwrap_or(false)
        }))
    }

    async fn get_history(&self, address: &str, limit: u32) -> Result<Value> {
        let address = validate_ethereum_address(address)?;
        let block_hex = self.call_rpc("eth_blockNumber", json!([])).await?;
        let latest = u64::from_str_radix(
            block_hex.as_str().unwrap_or("0x0").trim_start_matches("0x"),
            16,
        ).unwrap_or(0);
        let from = if latest > 10000 { latest - 10000 } else { 0 };
        let padded = format!("0x{:0>64}", address.trim_start_matches("0x"));
        let transfer_sig = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

        let sent = self.call_rpc("eth_getLogs", json!([{
            "fromBlock": format!("0x{:x}", from), "toBlock": "latest",
            "topics": [transfer_sig, padded.clone()]
        }])).await.unwrap_or(Value::Array(vec![]));

        let received = self.call_rpc("eth_getLogs", json!([{
            "fromBlock": format!("0x{:x}", from), "toBlock": "latest",
            "topics": [transfer_sig, null, padded.clone()]
        }])).await.unwrap_or(Value::Array(vec![]));

        let mut logs = sent.as_array().cloned().unwrap_or_default();
        logs.extend(received.as_array().cloned().unwrap_or_default());
        logs.truncate(limit as usize);
        Ok(Value::Array(logs))
    }
}
