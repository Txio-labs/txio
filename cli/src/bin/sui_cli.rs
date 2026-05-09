use clap::Parser;
use api::utils::config::Config;
use api::infra::db::establish_connection;
use api::repositories::user_repository::UserRepository;
use api::repositories::rpc_repository::RpcRepository;
use api::services::sui_service::SuiService;
use api::model::user::SuiNetwork;
use serde_json::Value;
use std::process;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// SUI RPC Method (e.g. sui_getObject)
    #[arg(short, long)]
    method: String,

    /// Params as JSON string (e.g. '["0x123..."]')
    #[arg(short, long, default_value = "[]")]
    params: String,

    /// User Email to link request to
    #[arg(short, long, env = "SUI_CLI_EMAIL")]
    email: String,

    /// Set/Switch user's default network (Mainnet, Testnet, Devnet)
    #[arg(long, value_enum)]
    network: Option<SuiNetwork>,

    /// Override SUI RPC URL (ignores user preference)
    #[arg(long)]
    rpc_url: Option<String>,

    /// Pretty print the JSON output
    #[arg(long, default_value_t = false)]
    pretty: bool,
}

#[tokio::main]
async fn main() {
    // Load environment
    dotenvy::dotenv().ok();
    
    // Parse args
    let args = Args::parse();

    // 1. Load Config
    let config = match Config::from_env() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to load configuration (check .env): {}", e);
            process::exit(1);
        }
    };
    
    // 2. Connect DB
    let db_client = match establish_connection(&config.mongo_uri).await {
        Ok(client) => client,
        Err(e) => {
            eprintln!("Failed to connect to MongoDB: {}", e);
            process::exit(1);
        }
    };
    
    // 3. Init Repos
    let user_repo = UserRepository::new(&db_client);
    let rpc_repo = RpcRepository::new(&db_client);
    
    // 4. Fetch User
    let mut user = match user_repo.find_by_email(&args.email).await {
        Ok(u) => u,
        Err(_) => {
            eprintln!("User not found with email: {}", args.email);
            process::exit(1);
        }
    };

    // 5. Handle Network Update
    if let Some(new_network) = args.network {
        println!("Switching user network preference to: {:?}", new_network);
        user.network = new_network.clone();
        if let Err(e) = user_repo.update(&user).await {
            eprintln!("Failed to update user network preference: {}", e);
            process::exit(1);
        }
    }
    
    // 6. Determine RPC URL
    // Explicit --rpc-url > User Config > Default Mainnet (User default)
    let final_rpc_url = if let Some(url) = args.rpc_url {
        url
    } else {
        user.network.url().to_string()
    };
    
    let sui_service = SuiService::new(rpc_repo, final_rpc_url.clone());
    
    // 7. Parse Params
    let mut params_val: Value = match serde_json::from_str(&args.params) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Invalid JSON parameters: {}", e);
            process::exit(1);
        }
    };
    
    // 7.1 Auto-resolve SuiNS names
    // Regex to find domain-like strings ending in .sui (e.g., "demo.sui", "sub.demo.sui")
    // Note: We avoid matching if it's already part of a hex string, but unlikely for .sui
    let suins_regex = regex::Regex::new(r"([a-zA-Z0-9-]+\.sui)").unwrap();

    if let Some(arr) = params_val.as_array_mut() {
        for v in arr.iter_mut() {
            if let Some(s) = v.as_str() {
                // Check if string contains ANY .sui pattern
                if suins_regex.is_match(s) {
                    println!("Detected SuiNS pattern in: {}", s);
                    
                    let mut new_string = s.to_string();
                    let mut replacements = Vec::new();

                    // 1. Identify all unique names to resolve
                    for cap in suins_regex.captures_iter(s) {
                        if let Some(m) = cap.get(0) {
                            let name = m.as_str().to_string();
                            replacements.push(name);
                        }
                    }

                    // 2. Resolve each name
                    for name in replacements {
                        if args.pretty {
                            println!("  Resolving: {}", name);
                        }
                        match sui_service.resolve_name_service_address(&final_rpc_url, &name).await {
                            Ok(addr) => {
                                if args.pretty {
                                    println!("  -> Resolved {} to: {}", name, addr);
                                }
                                new_string = new_string.replace(&name, &addr);
                            },
                            Err(e) => {
                                let err_val = sui_service.error_response(-32002, &format!("SuiNS Resolution Error for '{}': {}", name, e));
                                let output = if args.pretty {
                                    serde_json::to_string_pretty(&err_val)
                                } else {
                                    serde_json::to_string(&err_val)
                                }.unwrap_or_else(|_| "Failed to serialize error".into());
                                
                                println!("{}", output);
                                process::exit(1);
                            }
                        }
                    }
                    
                    // 3. Update the value
                    if new_string != *s {
                        *v = Value::String(new_string);
                    }
                }
            }
        }
    }
    
    if args.pretty {
        println!("Authenticating as: {}", user.email);
        println!("Network: {:?} | RPC URL: {}", user.network, final_rpc_url);
        println!("Executing RPC: {}", args.method);
    }
    
    // 8. Execute Call
    match sui_service.call_rpc_direct(&final_rpc_url, user.id.clone().unwrap(), &args.method, &params_val).await {
        Ok(result) => {
            let output = if args.pretty {
                serde_json::to_string_pretty(&result)
            } else {
                serde_json::to_string(&result)
            };

            match output {
                Ok(s) => println!("{}", s),
                Err(e) => println!("Result: {:?} (Serialization error: {})", result, e),
            }
        },
        Err(e) => {
            eprintln!("Internal Error (Repo/DB): {:?}", e);
            process::exit(1);
        }
    }
}
