use crate::chains::traits::ChainAdapter;
use crate::cli::parser::Network;
use anyhow::{Result, anyhow};
use async_trait::async_trait;
use regex::Regex;
use reqwest::Client;
use serde_json::{Value, json};

pub struct SuiAdapter {
    client: Client,
    rpc_url: String,
}

impl SuiAdapter {
    pub fn new() -> Self {
        Self::with_rpc(None, Network::Mainnet)
    }

    pub fn with_rpc(rpc_url: Option<String>, network: Network) -> Self {
        let url = rpc_url.unwrap_or_else(|| match network {
            Network::Mainnet => "https://fullnode.mainnet.sui.io".to_string(),
            Network::Testnet => "https://fullnode.testnet.sui.io".to_string(),
            Network::Devnet => "https://fullnode.devnet.sui.io".to_string(),
            Network::Localnet => "http://127.0.0.1:9000".to_string(),
        });

        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| Client::new()),
            rpc_url: url,
        }
    }

    async fn call_rpc_internal(&self, method: &str, params: Value) -> Result<Value> {
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
            let data = error.get("data").and_then(|d| d.as_str()).unwrap_or("");
            let code = error.get("code").and_then(|c| c.as_i64()).unwrap_or(0);

            let err_str = if data.is_empty() {
                format!("{} (Code: {})", msg, code)
            } else {
                format!("{} - {} (Code: {})", msg, data, code)
            };
            return Err(anyhow!("{}", err_str));
        }

        Ok(body.get("result").cloned().unwrap_or(Value::Null))
    }

    async fn resolve_names_in_value(&self, value: &mut Value) -> Result<()> {
        let suins_regex = Regex::new(r"([a-zA-Z0-9-]+\.sui)")?;

        match value {
            Value::String(s) => {
                if suins_regex.is_match(s) {
                    let mut new_string = s.to_string();
                    let matches: Vec<String> = suins_regex
                        .find_iter(s)
                        .map(|m| m.as_str().to_string())
                        .collect();

                    for name in matches {
                        if let Ok(Some(addr)) = self.resolve_name(&name).await {
                            new_string = new_string.replace(&name, &addr);
                        }
                    }
                    *s = new_string;
                }
            }
            Value::Array(arr) => {
                for v in arr.iter_mut() {
                    let _ = Box::pin(self.resolve_names_in_value(v)).await;
                }
            }
            Value::Object(map) => {
                for v in map.values_mut() {
                    let _ = Box::pin(self.resolve_names_in_value(v)).await;
                }
            }
            _ => {}
        }
        Ok(())
    }
}

#[async_trait]
impl ChainAdapter for SuiAdapter {
    fn name(&self) -> &'static str {
        "Sui"
    }

    fn default_rpc(&self) -> &'static str {
        "https://fullnode.mainnet.sui.io"
    }

    async fn call_rpc(&self, method: &str, mut params: Value) -> Result<Value> {
        self.resolve_names_in_value(&mut params).await?;
        self.call_rpc_internal(method, params).await
    }

    async fn resolve_name(&self, name: &str) -> Result<Option<String>> {
        if !name.ends_with(".sui") {
            return Ok(None);
        }
        let params = json!([name]);
        let result = self
            .call_rpc_internal("suix_resolveNameServiceAddress", params)
            .await?;
        Ok(result.as_str().map(|s| s.to_string()))
    }

    async fn get_balance(&self, address: &str) -> Result<Value> {
        let params = json!([address]);
        self.call_rpc("suix_getAllBalances", params).await
    }

    async fn get_transaction(&self, hash: &str) -> Result<Value> {
        let params = json!([
            hash,
            {
                "showInput": true,
                "showEffects": true,
                "showEvents": true,
                "showObjectChanges": true,
                "showBalanceChanges": true
            }
        ]);
        self.call_rpc_internal("sui_getTransactionBlock", params)
            .await
    }

    async fn get_block(&self, block: Option<u64>) -> Result<Value> {
        if let Some(seq) = block {
            let params = json!([seq.to_string()]);
            self.call_rpc_internal("sui_getCheckpoint", params).await
        } else {
            let seq = self
                .call_rpc_internal("sui_getLatestCheckpointSequenceNumber", json!([]))
                .await?;
            let params = json!([seq]);
            self.call_rpc_internal("sui_getCheckpoint", params).await
        }
    }

    async fn get_gas_price(&self) -> Result<Value> {
        self.call_rpc_internal("suix_getReferenceGasPrice", json!([]))
            .await
    }

    async fn get_account(&self, id: &str) -> Result<Value> {
        let params = json!([
            id,
            { "showType": true, "showContent": true, "showOwner": true, "showDisplay": true }
        ]);
        self.call_rpc_internal("sui_getObject", params).await
    }

    async fn get_history(&self, address: &str, limit: u32) -> Result<Value> {
        let params = json!([
            {
                "filter": { "FromAddress": address },
                "options": { "showInput": true, "showEffects": true }
            },
            null,
            limit,
            true
        ]);
        self.call_rpc_internal("suix_queryTransactionBlocks", params)
            .await
    }
}
