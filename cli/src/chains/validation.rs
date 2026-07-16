use anyhow::{anyhow, Result};
use reqwest::Url;

pub fn validate_aptos_address(address: &str) -> Result<String> {
    let address = address.trim();
    let stripped = address.strip_prefix("0x").unwrap_or(address);
    if stripped.is_empty() || stripped.len() > 64 {
        return Err(anyhow!("Invalid Aptos address: length must be 1-64 hex chars, optionally prefixed with 0x"));
    }
    if !stripped.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(anyhow!("Invalid Aptos address: must contain only hexadecimal characters"));
    }
    Ok(format!("0x{}", stripped.to_lowercase()))
}

pub fn validate_soroban_address(address: &str) -> Result<String> {
    let address = address.trim();
    if address.len() != 56 || !address.starts_with('G') {
        return Err(anyhow!("Invalid Soroban address: expected a Stellar account ID starting with G"));
    }
    if !address.chars().all(|c| matches!(c, 'A'..='Z' | '2'..='7')) {
        return Err(anyhow!("Invalid Soroban address: must be a valid Stellar strkey public key"));
    }
    Ok(address.to_string())
}

pub fn validate_ethereum_address(address: &str) -> Result<String> {
    let address = address.trim();
    let stripped = address.strip_prefix("0x").unwrap_or(address);
    if stripped.is_empty() || stripped.len() > 40 {
        return Err(anyhow!("Invalid Ethereum address: must be 1-40 hex characters, optionally prefixed with 0x"));
    }
    if !stripped.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(anyhow!("Invalid Ethereum address: must contain only hexadecimal characters"));
    }
    Ok(format!("0x{}", stripped.to_lowercase()))
}

pub fn validate_solana_address(address: &str) -> Result<String> {
    let address = address.trim();
    if address.is_empty() {
        return Err(anyhow!("Invalid Solana address: cannot be empty"));
    }
    if !address.chars().all(|c| matches!(c, '1'..='9' | 'A'..='H' | 'J'..='N' | 'P'..='Z' | 'a'..='k' | 'm'..='z')) {
        return Err(anyhow!("Invalid Solana address: must be a base58-encoded public key"));
    }
    Ok(address.to_string())
}

pub fn validate_sui_address(address: &str) -> Result<String> {
    let address = address.trim();
    let stripped = address.strip_prefix("0x").unwrap_or(address);
    if stripped.is_empty() || stripped.len() > 64 {
        return Err(anyhow!("Invalid Sui address: length must be 1-64 hex chars, optionally prefixed with 0x"));
    }
    if !stripped.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(anyhow!("Invalid Sui address: must contain only hexadecimal characters"));
    }
    Ok(format!("0x{}", stripped.to_lowercase()))
}

pub fn build_url(base: &str, segments: &[&str]) -> Result<Url> {
    let mut url = Url::parse(base).map_err(|e| anyhow!("Invalid base URL: {}", e))?;
    let mut path_segments = url
        .path_segments_mut()
        .map_err(|_| anyhow!("Failed to build URL path segments from base URL"))?;
    for segment in segments {
        path_segments.push(segment);
    }
    Ok(url)
}

pub fn build_url_with_query(base: &str, segments: &[&str], query: &[(&str, String)]) -> Result<Url> {
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
        assert_eq!(validate_ethereum_address("0xabc").unwrap(), "0xabc");
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
