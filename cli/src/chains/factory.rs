use crate::chains::aptos::AptosAdapter;
use crate::chains::ethereum::EthereumAdapter;
use crate::chains::solana::SolanaAdapter;
use crate::chains::soroban::SorobanAdapter;
use crate::chains::sui::SuiAdapter;
use crate::chains::traits::ChainAdapter;
use crate::cli::parser::Network;
use anyhow::{Result, anyhow};
use std::sync::Arc;
use strsim;

pub struct ChainFactory;

impl ChainFactory {
    pub fn get_adapter(
        chain_name: &str,
        rpc_url: Option<String>,
        network: Network,
    ) -> Result<Arc<dyn ChainAdapter>> {
        match chain_name.to_lowercase().as_str() {
            "sui" => Ok(Arc::new(SuiAdapter::with_rpc(rpc_url, network))),
            "eth" | "ethereum" => Ok(Arc::new(EthereumAdapter::with_rpc(rpc_url, network))),
            "sol" | "solana" => Ok(Arc::new(SolanaAdapter::with_rpc(rpc_url, network))),
            "aptos" => Ok(Arc::new(AptosAdapter::with_rpc(rpc_url, network))),
            "soroban" | "stellar" => Ok(Arc::new(SorobanAdapter::with_rpc(rpc_url, network))),
            _ => {
                let suggestion = Self::suggest_chain(chain_name);
                let mut msg = format!("Unknown chain '{chain_name}'");
                if let Some(s) = suggestion {
                    msg.push_str(&format!("\n\nDid you mean:\n  {s}"));
                }
                Err(anyhow!(msg))
            }
        }
    }

    pub fn list_chains() -> Vec<&'static str> {
        vec!["sui", "ethereum", "solana", "aptos", "soroban"]
    }

    pub fn suggest_chain(input: &str) -> Option<&'static str> {
        let chains = Self::list_chains();
        chains
            .into_iter()
            .map(|c| (c, strsim::jaro_winkler(input, c)))
            .filter(|(_, score)| *score > 0.7)
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
            .map(|(c, _)| c)
    }
}
