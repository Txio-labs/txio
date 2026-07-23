use crate::chains::traits::ChainAdapter;
use crate::chains::validation::validate_ethereum_address;
use crate::cli::parser::Network;
use anyhow::{Result, anyhow};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::{Value, json};
use sha3::{Digest, Keccak256};

/// Default `eth_getLogs` block span when `TXIO_ETH_HISTORY_BLOCK_WINDOW` is unset.
const DEFAULT_HISTORY_BLOCK_WINDOW: u64 = 2000;

/// ERC-20 Transfer(address,address,uint256) topic0.
const ERC20_TRANSFER_TOPIC: &str =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/// ENS registry contract — the same address on mainnet and every major testnet.
const ENS_REGISTRY: &str = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

/// `resolver(bytes32)` function selector.
const SELECTOR_RESOLVER: &str = "0178b8bf";

/// `addr(bytes32)` function selector.
const SELECTOR_ADDR: &str = "3b3b57de";

const ZERO_ADDRESS: &str = "0x0000000000000000000000000000000000000000";

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Computes the ENS namehash of a dotted name, per EIP-137:
/// `namehash("") = 0x00..00`, `namehash(label.rest) = keccak256(namehash(rest) ++ keccak256(label))`.
fn namehash(name: &str) -> [u8; 32] {
    // `"".split('.')` yields one empty-string label rather than none, which
    // would otherwise run one spurious hash iteration for the empty name.
    if name.is_empty() {
        return [0u8; 32];
    }

    let mut node = [0u8; 32];
    for label in name.split('.').rev() {
        let label_hash = Keccak256::digest(label.as_bytes());
        let mut hasher = Keccak256::new();
        hasher.update(node);
        hasher.update(label_hash);
        node = hasher.finalize().into();
    }
    node
}

/// Extracts the low 20 bytes (an ABI-encoded `address`) from a 32-byte
/// `eth_call` return word.
fn extract_address(result: &Value) -> Option<String> {
    let hex_word = result.as_str()?;
    let stripped = hex_word.strip_prefix("0x").unwrap_or(hex_word);
    if stripped.len() < 64 {
        return None;
    }
    Some(format!("0x{}", &stripped[stripped.len() - 40..]))
}

pub struct EthereumAdapter {
    client: Client,
    rpc_url: String,
}

impl EthereumAdapter {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self::with_rpc(None, Network::Mainnet)
    }

    pub fn with_rpc(rpc_url: Option<String>, network: Network) -> Self {
        let url = rpc_url.unwrap_or_else(|| match network {
            Network::Mainnet => "https://eth.llamarpc.com".to_string(),
            Network::Testnet => "https://rpc.sepolia.org".to_string(), // Sepolia as testnet
            Network::Devnet => "http://127.0.0.1:8545".to_string(),    // Anvil/Hardhat
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

    async fn resolve_name(&self, name: &str) -> Result<Option<String>> {
        if !name.ends_with(".eth") {
            return Ok(None);
        }

        let node_hex = to_hex(&namehash(name));

        let resolver_result = self
            .call_rpc(
                "eth_call",
                json!([
                    { "to": ENS_REGISTRY, "data": format!("0x{SELECTOR_RESOLVER}{node_hex}") },
                    "latest"
                ]),
            )
            .await?;
        let Some(resolver) = extract_address(&resolver_result) else {
            return Ok(None);
        };
        if resolver.eq_ignore_ascii_case(ZERO_ADDRESS) {
            return Ok(None);
        }

        let addr_result = self
            .call_rpc(
                "eth_call",
                json!([
                    { "to": resolver, "data": format!("0x{SELECTOR_ADDR}{node_hex}") },
                    "latest"
                ]),
            )
            .await?;

        match extract_address(&addr_result) {
            Some(addr) if !addr.eq_ignore_ascii_case(ZERO_ADDRESS) => Ok(Some(addr)),
            _ => Ok(None),
        }
    }

    async fn get_balance(&self, address: &str) -> Result<Value> {
        let address = validate_ethereum_address(address)?;
        let params = json!([address, "latest"]);
        self.call_rpc("eth_getBalance", params).await
    }

    async fn get_transaction(&self, hash: &str) -> Result<Value> {
        self.call_rpc("eth_getTransactionByHash", json!([hash]))
            .await
    }

    async fn get_block(&self, block: Option<u64>) -> Result<Value> {
        let tag = match block {
            Some(n) => format!("0x{n:x}"),
            None => "latest".to_string(),
        };
        self.call_rpc("eth_getBlockByNumber", json!([tag, false]))
            .await
    }

    async fn get_gas_price(&self) -> Result<Value> {
        self.call_rpc("eth_gasPrice", json!([])).await
    }

    async fn get_account(&self, address: &str) -> Result<Value> {
        let address = validate_ethereum_address(address)?;
        let balance = self
            .call_rpc("eth_getBalance", json!([address, "latest"]))
            .await?;
        let nonce = self
            .call_rpc("eth_getTransactionCount", json!([address, "latest"]))
            .await?;
        let code = self
            .call_rpc("eth_getCode", json!([address, "latest"]))
            .await?;
        Ok(json!({
            "address": address,
            "balance": balance,
            "nonce": nonce,
            "bytecode": code,
            "isContract": code.as_str().map(|c| c != "0x").unwrap_or(false)
        }))
    }

    /// Returns recent ERC-20 Transfer event logs for an address (not native ETH txs).
    async fn get_history(&self, address: &str, limit: u32) -> Result<Value> {
        let address = validate_ethereum_address(address)?;
        let block_window = history_block_window();
        let block_hex = self.call_rpc("eth_blockNumber", json!([])).await?;
        let latest = parse_hex_u64(block_hex.as_str().unwrap_or("0x0"));
        let from = latest.saturating_sub(block_window);
        let padded = format!("0x{:0>64}", address.trim_start_matches("0x"));

        let sent = self
            .call_rpc(
                "eth_getLogs",
                json!([{
                    "fromBlock": format!("0x{:x}", from),
                    "toBlock": "latest",
                    "topics": [ERC20_TRANSFER_TOPIC, padded.clone()]
                }]),
            )
            .await?;

        let received = self
            .call_rpc(
                "eth_getLogs",
                json!([{
                    "fromBlock": format!("0x{:x}", from),
                    "toBlock": "latest",
                    "topics": [ERC20_TRANSFER_TOPIC, null, padded.clone()]
                }]),
            )
            .await?;

        let mut logs = sent.as_array().cloned().unwrap_or_default();
        logs.extend(received.as_array().cloned().unwrap_or_default());
        sort_logs_by_recency(&mut logs);
        logs.truncate(limit as usize);
        Ok(Value::Array(logs))
    }
}

fn history_block_window() -> u64 {
    std::env::var("TXIO_ETH_HISTORY_BLOCK_WINDOW")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|&window| window > 0)
        .unwrap_or(DEFAULT_HISTORY_BLOCK_WINDOW)
}

fn parse_hex_u64(hex: &str) -> u64 {
    u64::from_str_radix(hex.trim_start_matches("0x"), 16).unwrap_or(0)
}

fn log_sort_key(log: &Value) -> (u64, u64) {
    let block = log
        .get("blockNumber")
        .and_then(|v| v.as_str())
        .map(parse_hex_u64)
        .unwrap_or(0);
    let index = log
        .get("logIndex")
        .and_then(|v| v.as_str())
        .map(parse_hex_u64)
        .unwrap_or(0);
    (block, index)
}

fn sort_logs_by_recency(logs: &mut [Value]) {
    logs.sort_by_key(|b| std::cmp::Reverse(log_sort_key(b)));
}

#[cfg(test)]
mod tests {
    use super::*;

    // Reference vectors from EIP-137.
    #[test]
    fn namehash_matches_eip137_reference_vectors() {
        assert_eq!(to_hex(&namehash("")), "0".repeat(64));
        assert_eq!(
            to_hex(&namehash("eth")),
            "93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae"
        );
        assert_eq!(
            to_hex(&namehash("foo.eth")),
            "de9b09fd7c5f901e23a3f19fecc54828e9c848539801e86591bd9801b019f84f"
        );
    }

    #[test]
    fn extract_address_reads_low_20_bytes_of_a_return_word() {
        let word = format!("0x{}{}", "0".repeat(24), "a".repeat(40));
        assert_eq!(
            extract_address(&Value::String(word)),
            Some(format!("0x{}", "a".repeat(40)))
        );
    }

    #[test]
    fn extract_address_rejects_short_or_non_string_values() {
        assert_eq!(extract_address(&Value::String("0x1234".to_string())), None);
        assert_eq!(extract_address(&Value::Null), None);
    }

    fn sample_log(block: &str, index: &str) -> Value {
        json!({
            "blockNumber": block,
            "logIndex": index,
        })
    }

    #[test]
    fn sort_logs_by_recency_orders_newest_first() {
        let mut logs = vec![
            sample_log("0x10", "0x1"),
            sample_log("0x20", "0x0"),
            sample_log("0x10", "0x2"),
        ];
        sort_logs_by_recency(&mut logs);
        assert_eq!(logs[0]["blockNumber"], "0x20");
        assert_eq!(logs[1]["blockNumber"], "0x10");
        assert_eq!(logs[1]["logIndex"], "0x2");
        assert_eq!(logs[2]["logIndex"], "0x1");
    }

    #[test]
    fn parse_hex_u64_parses_quantity_strings() {
        assert_eq!(parse_hex_u64("0x10"), 16);
        assert_eq!(parse_hex_u64("0x0"), 0);
    }
}
