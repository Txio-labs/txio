use config::{Config as ConfigLoader, ConfigError, Environment};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Config {
    pub mongo_uri: String,
    pub jwt_secret: String,
    pub brevo_api_key: String,
    pub admin_emails: Vec<String>,
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let builder = ConfigLoader::builder()
            .add_source(Environment::default());
        
        let config = builder.build()?;
        
        // Require critical values, no defaults for security
        let mongo_uri = config.get_string("MONGO_URI")
            .map_err(|_| ConfigError::Message("MONGO_URI must be set".into()))?;
        
        let jwt_secret = config.get_string("JWT_SECRET")
            .map_err(|_| ConfigError::Message("JWT_SECRET must be set".into()))?;
        
        let brevo_api_key = config.get_string("BREVO_API_KEY")
            .map_err(|_| ConfigError::Message("BREVO_API_KEY must be set".into()))?;
        
        if jwt_secret.len() < 32 {
            return Err(ConfigError::Message("JWT_SECRET must be at least 32 characters".into()));
        }

        let admin_emails = config
            .get_string("ADMIN_EMAILS")
            .map(|raw| parse_admin_emails(&raw))
            .unwrap_or_default();

        Ok(Config {
            mongo_uri,
            jwt_secret,
            brevo_api_key,
            admin_emails,
        })
    }
}

/// Parses a comma-separated ADMIN_EMAILS env var into a normalized
/// (trimmed, lower-cased, empty entries dropped) list of email addresses.
fn parse_admin_emails(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(|s| s.trim().to_ascii_lowercase())
        .filter(|s| !s.is_empty())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_and_normalizes_admin_emails() {
        let emails = parse_admin_emails(" Admin@Example.com ,, second@example.com,THIRD@EXAMPLE.COM");
        assert_eq!(
            emails,
            vec![
                "admin@example.com".to_string(),
                "second@example.com".to_string(),
                "third@example.com".to_string(),
            ]
        );
    }

    #[test]
    fn empty_admin_emails_yields_empty_list() {
        assert!(parse_admin_emails("").is_empty());
        assert!(parse_admin_emails("   ").is_empty());
    }
}
