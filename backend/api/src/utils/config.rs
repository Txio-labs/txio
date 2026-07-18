use config::{Config as ConfigLoader, ConfigError, Environment};
use serde::Deserialize;

/// Application configuration loaded from environment variables
/// 
/// Required environment variables:
/// - MONGO_URI: MongoDB connection string (mongodb:// or mongodb+srv://)
/// - JWT_SECRET: Secret key for JWT signing (minimum 32 characters)
/// - BREVO_API_KEY: API key for email service
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
            .map_err(|_| ConfigError::Message(
                "MONGO_URI must be set. Example: mongodb://localhost:27017/txio or mongodb+srv://user:pass@cluster.mongodb.net/txio".into()
            ))?;
        
        let jwt_secret = config.get_string("JWT_SECRET")
            .map_err(|_| ConfigError::Message("JWT_SECRET must be set".into()))?;
        
        let brevo_api_key = config.get_string("BREVO_API_KEY")
            .map_err(|_| ConfigError::Message("BREVO_API_KEY must be set".into()))?;
        
        // Validation: JWT_SECRET minimum length
        if jwt_secret.len() < 32 {
            return Err(ConfigError::Message(
                format!("JWT_SECRET must be at least 32 characters (current: {})", jwt_secret.len())
            ));
        }
        
        // Validation: MONGO_URI format
        if !Self::is_valid_mongo_uri(&mongo_uri) {
            return Err(ConfigError::Message(
                "MONGO_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)".into()
            ));
        }
        
        // Validation: Brevo API key not empty
        if brevo_api_key.trim().is_empty() {
            return Err(ConfigError::Message("BREVO_API_KEY cannot be empty".into()));
        }
        
        Ok(Config {
            mongo_uri,
            jwt_secret,
            brevo_api_key,
        })
    }
    
    /// Validates MongoDB URI format
    fn is_valid_mongo_uri(uri: &str) -> bool {
        uri.starts_with("mongodb://") || uri.starts_with("mongodb+srv://")
    }
    
    /// Check if all critical services are configured
    pub fn is_configured(&self) -> bool {
        !self.mongo_uri.is_empty() 
            && !self.jwt_secret.is_empty() 
            && !self.brevo_api_key.trim().is_empty()
    }
}
