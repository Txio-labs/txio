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
        let builder = ConfigLoader::builder().add_source(Environment::default());

        let config = builder.build()?;

        // Require critical values, no defaults for security
        let mongo_uri = config
            .get_string("MONGO_URI")
            .map_err(|_| ConfigError::Message("MONGO_URI must be set".into()))?;

        let jwt_secret = config
            .get_string("JWT_SECRET")
            .map_err(|_| ConfigError::Message("JWT_SECRET must be set".into()))?;

        let brevo_api_key = config
            .get_string("BREVO_API_KEY")
            .map_err(|_| ConfigError::Message("BREVO_API_KEY must be set".into()))?;

        if jwt_secret.len() < 32 {
            return Err(ConfigError::Message(
                "JWT_SECRET must be at least 32 characters".into(),
            ));
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
///
/// These addresses are **reserved**: they cannot be claimed via self-service
/// registration / OAuth signup / email change. Admin privilege itself lives on
/// `User.is_admin` and is granted only via `bootstrap_admin`.
pub fn parse_admin_emails(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(|s| s.trim().to_ascii_lowercase())
        .filter(|s| !s.is_empty())
        .collect()
}

/// Returns true when `email` is on the reserved ADMIN_EMAILS roster.
pub fn is_reserved_admin_email(email: &str, reserved: &[String]) -> bool {
    let normalized = email.trim().to_ascii_lowercase();
    reserved
        .iter()
        .any(|admin_email| admin_email.eq_ignore_ascii_case(&normalized))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_and_normalizes_admin_emails() {
        let emails =
            parse_admin_emails(" Admin@Example.com ,, second@example.com,THIRD@EXAMPLE.COM");
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

    #[test]
    fn reserved_email_match_is_case_insensitive() {
        let reserved = parse_admin_emails("Admin@Txio.io");
        assert!(is_reserved_admin_email("admin@txio.io", &reserved));
        assert!(is_reserved_admin_email(" ADMIN@TXIO.IO ", &reserved));
        assert!(!is_reserved_admin_email("user@txio.io", &reserved));
    }
}
