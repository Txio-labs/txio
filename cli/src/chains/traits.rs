use async_trait::async_trait;
use serde_json::Value;
use anyhow::Result;

#[async_trait]
pub trait ChainAdapter: Send + Sync {
    /// The name of the blockchain (e.g., "Sui", "Ethereum")
    fn name(&self) -> &'static str;

    /// The default RPC endpoint for this chain
    fn default_rpc(&self) -> &'static str;

    /// Call a JSON-RPC method on this chain
    async fn call_rpc(&self, method: &str, params: Value) -> Result<Value>;

    /// Optional: Resolve a name (SuiNS, ENS, etc.)
    async fn resolve_name(&self, name: &str) -> Result<Option<String>> {
        Ok(None)
    }

    /// Get balance for an account
    async fn get_balance(&self, address: &str) -> Result<Value>;
}
