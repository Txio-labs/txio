use anyhow::{Result, anyhow};
use reqwest::Url;

pub fn validate_aptos_address(address: &str) -> Result<String> {
    let address = address.trim();
    let stripped = address.strip_prefix("0x").unwrap_or(address);
    if stripped.is_empty() || stripped.len() > 64 {
        return Err(anyhow!(
            "Invalid Aptos address: length must be 1-64 hex chars, optionally prefixed with 0x"
        ));
    }
    if !stripped.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(anyhow!(
            "Invalid Aptos address: must contain only hexadecimal characters"
        ));
    }
    Ok(format!("0x{}", stripped.to_lowercase()))
}

pub fn validate_soroban_address(address: &str) -> Result<String> {
    let address = address.trim();
    if address.len() != 56 || !address.starts_with('G') {
        return Err(anyhow!(
            "Invalid Soroban address: expected a Stellar account ID starting with G"
        ));
    }
    if !address.chars().all(|c| matches!(c, 'A'..='Z' | '2'..='7')) {
        return Err(anyhow!(
            "Invalid Soroban address: must be a valid Stellar strkey public key"
        ));
    }
    Ok(address.to_string())
}

pub fn validate_ethereum_address(address: &str) -> Result<String> {
    let address = address.trim();
    let stripped = address.strip_prefix("0x").unwrap_or(address);
    // Ethereum account addresses are exactly 20 bytes (40 hex characters).
    if stripped.len() != 40 {
        return Err(anyhow!(
            "Invalid Ethereum address: must be exactly 40 hex characters (20 bytes), optionally prefixed with 0x"
        ));
    }
    if !stripped.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(anyhow!(
            "Invalid Ethereum address: must contain only hexadecimal characters"
        ));
    }
    Ok(format!("0x{}", stripped.to_lowercase()))
}

pub fn validate_solana_address(address: &str) -> Result<String> {
    let address = address.trim();
    if address.is_empty() {
        return Err(anyhow!("Invalid Solana address: cannot be empty"));
    }
    // Reject characters outside the base58 alphabet before decoding.
    if !address
        .chars()
        .all(|c| matches!(c, '1'..='9' | 'A'..='H' | 'J'..='N' | 'P'..='Z' | 'a'..='k' | 'm'..='z'))
    {
        return Err(anyhow!(
            "Invalid Solana address: must be a base58-encoded public key"
        ));
    }
    // Decode and verify the address produces exactly 32 bytes (Ed25519 public key).
    let decoded = bs58::decode(address)
        .into_vec()
        .map_err(|e| anyhow!("Invalid Solana address: base58 decode failed: {e}"))?;
    if decoded.len() != 32 {
        return Err(anyhow!(
            "Invalid Solana address: expected 32-byte public key, got {} bytes",
            decoded.len()
        ));
    }
    Ok(address.to_string())
}

pub fn validate_sui_address(address: &str) -> Result<String> {
    let address = address.trim();
    let stripped = address.strip_prefix("0x").unwrap_or(address);
    if stripped.is_empty() || stripped.len() > 64 {
        return Err(anyhow!(
            "Invalid Sui address: length must be 1-64 hex chars, optionally prefixed with 0x"
        ));
    }
    if !stripped.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(anyhow!(
            "Invalid Sui address: must contain only hexadecimal characters"
        ));
    }
    Ok(format!("0x{}", stripped.to_lowercase()))
}

pub fn build_url(base: &str, segments: &[&str]) -> Result<Url> {
    let mut url = Url::parse(base).map_err(|e| anyhow!("Invalid base URL: {e}"))?;
    {
        let mut path_segments = url
            .path_segments_mut()
            .map_err(|_| anyhow!("Failed to build URL path segments from base URL"))?;
        for segment in segments {
            path_segments.push(segment);
        }
    }
    Ok(url)
}

pub fn build_url_with_query(
    base: &str,
    segments: &[&str],
    query: &[(&str, String)],
) -> Result<Url> {
    let mut url = build_url(base, segments)?;
    {
        let mut pairs = url.query_pairs_mut();
        for (key, value) in query {
            pairs.append_pair(key, value);
        }
    }
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_ethereum_address_accepts_0x_prefixed() {
        // Ethereum addresses must be exactly 40 hex chars (20 bytes).
        assert_eq!(
            validate_ethereum_address("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045").unwrap(),
            "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
        );
    }

    #[test]
    fn validate_ethereum_address_rejects_short() {
        assert!(validate_ethereum_address("0xabc").is_err());
    }

    #[test]
    fn validate_ethereum_address_rejects_invalid_hex() {
        assert!(validate_ethereum_address("0xzz").is_err());
    }

    #[test]
    fn build_url_encodes_path_segments() {
        let url = build_url("https://example.com/v1", &["accounts", "foo/bar"]).unwrap();
        assert_eq!(url.as_str(), "https://example.com/v1/accounts/foo%2Fbar");
    }
}
