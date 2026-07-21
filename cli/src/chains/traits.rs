use anyhow::{Result, anyhow};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait ChainAdapter: Send + Sync {
    /// The name of the blockchain (e.g., "Sui", "Ethereum")
    fn name(&self) -> &'static str;

    /// The default RPC endpoint for this chain
    fn default_rpc(&self) -> &'static str;

    /// Call a JSON-RPC method on this chain
    async fn call_rpc(&self, method: &str, params: Value) -> Result<Value>;

    /// Optional: Resolve a name (SuiNS, ENS, etc.)
    async fn resolve_name(&self, _name: &str) -> Result<Option<String>> {
        Ok(None)
    }

    /// Get balance for an account
    async fn get_balance(&self, address: &str) -> Result<Value>;

    /// Fetch a transaction by hash or digest
    async fn get_transaction(&self, _hash: &str) -> Result<Value> {
        Err(anyhow!("get_transaction not supported for {}", self.name()))
    }

    /// Get block / checkpoint / ledger info. None means latest.
    async fn get_block(&self, _block: Option<u64>) -> Result<Value> {
        Err(anyhow!("get_block not supported for {}", self.name()))
    }

    /// Get current gas price or reference fee
    async fn get_gas_price(&self) -> Result<Value> {
        Err(anyhow!("get_gas_price not supported for {}", self.name()))
    }

    /// Inspect an object or account by ID
    async fn get_account(&self, _id: &str) -> Result<Value> {
        Err(anyhow!("get_account not supported for {}", self.name()))
    }

    /// Fetch recent transaction history for an address
    async fn get_history(&self, _address: &str, _limit: u32) -> Result<Value> {
        Err(anyhow!("get_history not supported for {}", self.name()))
    }
}
