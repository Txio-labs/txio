use mongodb::{Client, options::ClientOptions};

pub async fn establish_connection(uri: &str) -> mongodb::error::Result<Client> {
    let mut client_options = ClientOptions::parse(uri).await?;
    let server_api = mongodb::options::ServerApi::builder().version(mongodb::options::ServerApiVersion::V1).build();
    client_options.server_api = Some(server_api);
    
    let client = Client::with_options(client_options)?;
    
    Ok(client)
}
