//! Canonical blockchain network representation.
//!
//! This is the **single source of truth** for the set of networks txio
//! understands. It is shared verbatim by the CLI (which re-exports it from
//! `crate::cli::parser`) and the backend API, and is mirrored on the wire by
//! the frontend `Network` string union.
//!
//! ## Serialization contract
//!
//! A network always **serializes** to its lowercase name (`mainnet`,
//! `testnet`, `devnet`, `localnet`). This is the canonical form used across
//! every boundary — Rust ↔ JSON, CLI ↔ backend, and backend ↔ frontend — so a
//! value round-trips identically no matter where it is produced.
//!
//! **Deserialization** is case-insensitive: it accepts any casing (so
//! documents persisted before this unification, which used PascalCase such as
//! `"Mainnet"`, continue to load) but rejects any value that is not one of the
//! four known networks. Unknown values produce an explicit
//! [`ParseNetworkError`] rather than silently defaulting to `Mainnet` — a
//! silent fallback previously hid invalid selections and made `Localnet`
//! impossible to reach end-to-end.

use std::fmt;
use std::str::FromStr;

use serde::{Deserialize, Deserializer, Serialize, Serializer, de::Error as _};

/// A blockchain network supported by txio.
///
/// See the [module documentation](self) for the serialization contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default, clap::ValueEnum)]
pub enum Network {
    #[default]
    Mainnet,
    Testnet,
    Devnet,
    Localnet,
}

impl Network {
    /// Every supported network, in canonical order.
    pub const ALL: [Network; 4] = [
        Network::Mainnet,
        Network::Testnet,
        Network::Devnet,
        Network::Localnet,
    ];

    /// The canonical lowercase name of this network.
    ///
    /// This is the exact string used for serialization everywhere.
    pub const fn as_str(&self) -> &'static str {
        match self {
            Network::Mainnet => "mainnet",
            Network::Testnet => "testnet",
            Network::Devnet => "devnet",
            Network::Localnet => "localnet",
        }
    }

    /// The default Sui fullnode RPC endpoint for this network.
    ///
    /// The backend is a Sui-focused RPC gateway, so this is its canonical
    /// per-network URL. The CLI is multi-chain and resolves URLs per chain in
    /// its own adapters.
    pub const fn sui_url(&self) -> &'static str {
        match self {
            Network::Mainnet => "https://fullnode.mainnet.sui.io:443",
            Network::Testnet => "https://fullnode.testnet.sui.io:443",
            Network::Devnet => "https://fullnode.devnet.sui.io:443",
            Network::Localnet => "http://127.0.0.1:9000",
        }
    }
}

impl fmt::Display for Network {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// Error returned when a string does not name a known [`Network`].
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[error("invalid network '{0}': expected one of mainnet, testnet, devnet, localnet")]
pub struct ParseNetworkError(pub String);

impl FromStr for Network {
    type Err = ParseNetworkError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.trim().to_ascii_lowercase().as_str() {
            "mainnet" => Ok(Network::Mainnet),
            "testnet" => Ok(Network::Testnet),
            "devnet" => Ok(Network::Devnet),
            "localnet" => Ok(Network::Localnet),
            _ => Err(ParseNetworkError(s.to_string())),
        }
    }
}

impl Serialize for Network {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_str())
    }
}

impl<'de> Deserialize<'de> for Network {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        // Deserialize as a string, then reuse the single `FromStr`
        // implementation so parsing rules live in exactly one place. This is
        // case-insensitive and rejects unknown values instead of defaulting.
        let raw = String::deserialize(deserializer)?;
        raw.parse().map_err(D::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn as_str_is_lowercase_canonical() {
        assert_eq!(Network::Mainnet.as_str(), "mainnet");
        assert_eq!(Network::Testnet.as_str(), "testnet");
        assert_eq!(Network::Devnet.as_str(), "devnet");
        assert_eq!(Network::Localnet.as_str(), "localnet");
    }

    #[test]
    fn display_matches_as_str() {
        for net in Network::ALL {
            assert_eq!(net.to_string(), net.as_str());
        }
    }

    #[test]
    fn default_is_mainnet() {
        assert_eq!(Network::default(), Network::Mainnet);
    }

    #[test]
    fn serializes_to_lowercase_json_string() {
        assert_eq!(
            serde_json::to_string(&Network::Mainnet).unwrap(),
            "\"mainnet\""
        );
        assert_eq!(
            serde_json::to_string(&Network::Localnet).unwrap(),
            "\"localnet\""
        );
    }

    #[test]
    fn deserializes_lowercase_json_string() {
        assert_eq!(
            serde_json::from_str::<Network>("\"testnet\"").unwrap(),
            Network::Testnet
        );
        assert_eq!(
            serde_json::from_str::<Network>("\"localnet\"").unwrap(),
            Network::Localnet
        );
    }

    #[test]
    fn deserialization_is_case_insensitive_for_legacy_documents() {
        // Documents persisted before unification used PascalCase. They must
        // still load rather than error or silently reset.
        assert_eq!(
            serde_json::from_str::<Network>("\"Mainnet\"").unwrap(),
            Network::Mainnet
        );
        assert_eq!(
            serde_json::from_str::<Network>("\"DEVNET\"").unwrap(),
            Network::Devnet
        );
    }

    #[test]
    fn round_trips_through_json() {
        for net in Network::ALL {
            let json = serde_json::to_string(&net).unwrap();
            let back: Network = serde_json::from_str(&json).unwrap();
            assert_eq!(net, back);
        }
    }

    #[test]
    fn from_str_accepts_all_known_networks() {
        assert_eq!("mainnet".parse::<Network>().unwrap(), Network::Mainnet);
        assert_eq!("testnet".parse::<Network>().unwrap(), Network::Testnet);
        assert_eq!("devnet".parse::<Network>().unwrap(), Network::Devnet);
        assert_eq!("localnet".parse::<Network>().unwrap(), Network::Localnet);
        // Surrounding whitespace and mixed casing are tolerated.
        assert_eq!("  Testnet  ".parse::<Network>().unwrap(), Network::Testnet);
    }

    #[test]
    fn unknown_values_are_rejected_not_defaulted() {
        // Regression: unknown networks previously became `Mainnet` silently.
        assert!("".parse::<Network>().is_err());
        assert!("main".parse::<Network>().is_err());
        assert!("mainnet-beta".parse::<Network>().is_err());
        assert!("supernet".parse::<Network>().is_err());

        let err = "supernet".parse::<Network>().unwrap_err();
        assert_eq!(err, ParseNetworkError("supernet".to_string()));
        assert!(err.to_string().contains("invalid network 'supernet'"));
    }

    #[test]
    fn invalid_json_values_are_rejected() {
        assert!(serde_json::from_str::<Network>("\"bogus\"").is_err());
        assert!(serde_json::from_str::<Network>("\"mainnet-beta\"").is_err());
    }

    #[test]
    fn sui_url_covers_every_network_including_localnet() {
        assert_eq!(
            Network::Mainnet.sui_url(),
            "https://fullnode.mainnet.sui.io:443"
        );
        assert_eq!(Network::Localnet.sui_url(), "http://127.0.0.1:9000");
    }
}
