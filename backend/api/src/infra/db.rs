use mongodb::{Client, error::Error, options::ClientOptions};

pub async fn establish_connection(uri: &str) -> mongodb::error::Result<Client> {
    let mut client_options = ClientOptions::parse(uri).await?;
    let server_api = mongodb::options::ServerApi::builder()
        .version(mongodb::options::ServerApiVersion::V1)
        .build();
    client_options.server_api = Some(server_api);

    let client = Client::with_options(client_options)?;

    Ok(client)
}

pub fn describe_connection_error(uri: &str, error: &Error) -> String {
    let base = format!("Failed to connect to MongoDB. {error}");

    if uri.starts_with("mongodb+srv://") && is_dns_resolution_error(error) {
        let host = extract_mongo_host(uri).unwrap_or("unknown host");
        return format!(
            "{base} Atlas SRV lookup failed for `{host}`. \
            Copy the exact connection string from MongoDB Atlas > Connect > Drivers. \
            If you intended to use local Mongo for development, set MONGO_URI to \
            `mongodb://localhost:27017/txio` instead of a `mongodb+srv://` URI."
        );
    }

    if uri.starts_with("mongodb://mongodb") {
        return format!(
            "{base} The host `mongodb` only resolves inside the Docker Compose network. \
            If you are running the API directly on your machine with `cargo run`, use \
            `mongodb://localhost:27017/txio`."
        );
    }

    base
}

fn is_dns_resolution_error(error: &Error) -> bool {
    let message = error.to_string();

    message.contains("DNS resolution")
        || message.contains("DnsResolve")
        || message.contains("_mongodb._tcp")
}

pub fn extract_mongo_host(uri: &str) -> Option<&str> {
    let (_, remainder) = uri.split_once("://")?;
    let without_credentials = remainder
        .rsplit_once('@')
        .map(|(_, value)| value)
        .unwrap_or(remainder);
    let authority = without_credentials
        .split('/')
        .next()
        .unwrap_or(without_credentials);

    authority.split(',').next()
}

#[cfg(test)]
mod tests {
    use super::extract_mongo_host;

    #[test]
    fn strips_credentials_from_srv_uri() {
        let host = extract_mongo_host("mongodb+srv://user:pass@cluster.example/db");

        assert_eq!(host, Some("cluster.example"));
        let host = host.expect("host should be extracted");
        assert!(!host.contains("user"));
        assert!(!host.contains("pass"));
    }

    #[test]
    fn never_returns_userinfo() {
        let cases: [(&str, &[&str]); 3] = [
            (
                "mongodb+srv://user:pass@cluster.example/db",
                &["user", "pass"],
            ),
            (
                "mongodb://admin:s3cret@localhost:27017/txio",
                &["admin", "s3cret"],
            ),
            (
                "mongodb://alice:hunter2@db1.example,db2.example/txio",
                &["alice", "hunter2"],
            ),
        ];

        for (uri, credentials) in cases {
            let host = extract_mongo_host(uri).expect("host should be extracted");
            assert!(!host.contains('@'), "host `{host}` must not contain `@`");
            for credential in credentials {
                assert!(
                    !host.contains(credential),
                    "host `{host}` must not contain credential `{credential}`"
                );
            }
        }
    }
}
