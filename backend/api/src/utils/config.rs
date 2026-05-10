use config::{Config as ConfigLoader, ConfigError, Environment};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Config {
    pub mongo_uri: String,
    pub jwt_secret: String,
    pub brevo_api_key: String,
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
        
        Ok(Config {
            mongo_uri,
            jwt_secret,
            brevo_api_key,
        })
    }
}
