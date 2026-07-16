
use clap::{Parser, Subcommand, ValueEnum};

#[derive(Clone, Debug, ValueEnum, Default, PartialEq)]
pub enum Network {
    #[default]
    Mainnet,
    Testnet,
    Devnet,
    Localnet,
}

#[derive(Parser)]
#[command(name = "txio")]
#[command(version = env!("CARGO_PKG_VERSION"))]
#[command(about = "txio: The Universal Multi-Chain Blockchain Terminal", long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,

    /// Enable verbose output
    #[arg(short, long, global = true)]
    pub verbose: bool,

    /// Pretty print JSON output
    #[arg(short, long, global = true)]
    pub pretty: bool,

    /// Override the default RPC URL
    #[arg(long, global = true)]
    pub rpc_url: Option<String>,

    /// Select the network to use
    #[arg(short, long, global = true, value_enum, default_value_t = Network::Mainnet)]
    pub network: Network,

    /// Load environment overrides from an explicit file (opt-in; no upward search).
    /// Without this flag, a `./.env` in the current directory is NOT loaded.
    #[arg(long, global = true, value_name = "PATH")]
    pub env_file: Option<std::path::PathBuf>,
}

#[derive(Subcommand)]
pub enum Commands {
    /// List all supported chains
    Chains,

    /// Switch the default chain
    Switch {
        chain: String,
    },

    /// Login to your txio account
    Login,

    /// Logout from your txio account
    Logout,

    /// Show current CLI status (chain, network, login state, RPC health)
    Status,

    /// Manage CLI configuration key-value settings
    Config {
        #[command(subcommand)]
        action: ConfigAction,
    },

    /// Manage user profiles
    Profile {
        #[command(subcommand)]
        action: ProfileAction,
    },

    /// Manage wallets
    Wallet {
        #[command(subcommand)]
        action: WalletAction,
    },

    /// Generate shell completion scripts
    Completion {
        shell: clap_complete::Shell,
    },

    /// Launch interactive console
    Console,

    /// Sui blockchain commands
    Sui {
        #[command(subcommand)]
        command: ChainCommand,
    },

    /// Ethereum blockchain commands
    #[command(alias = "eth")]
    Ethereum {
        #[command(subcommand)]
        command: ChainCommand,
    },

    /// Solana blockchain commands
    #[command(alias = "sol")]
    Solana {
        #[command(subcommand)]
        command: ChainCommand,
    },

    /// Aptos blockchain commands
    Aptos {
        #[command(subcommand)]
        command: ChainCommand,
    },

    /// Soroban/Stellar blockchain commands
    #[command(alias = "stellar")]
    Soroban {
        #[command(subcommand)]
        command: ChainCommand,
    },

    /// Database and Admin commands
    Db {
        #[command(subcommand)]
        action: DbAction,
    },
}

#[derive(Subcommand)]
pub enum ChainCommand {
    /// Call a raw RPC method
    Call {
        #[arg(short, long)]
        method: String,
        #[arg(short, long)]
        params: Option<String>,
    },
    /// Check balance for an address
    Balance {
        address: String,
    },
    /// Fetch a transaction by hash or digest
    #[command(alias = "hash")]
    Tx {
        hash: String,
    },
    /// Inspect an object or account by ID
    #[command(alias = "account")]
    Object {
        id: String,
    },
    /// Get recent transaction history for an address
    History {
        address: String,
        /// Maximum number of transactions to return
        #[arg(short, long, default_value_t = 10)]
        limit: u32,
    },
    /// Get the current gas price / reference fee
    Gas,
    /// Get the latest block, checkpoint, or ledger (or by number)
    Block {
        /// Block number / checkpoint sequence / slot to fetch
        #[arg(short, long)]
        number: Option<u64>,
    },
}

#[derive(Subcommand)]
pub enum ConfigAction {
    /// List all configuration settings
    List,
    /// Get a specific configuration value
    Get { key: String },
    /// Set a configuration value
    Set { key: String, value: String },
    /// Remove a configuration key
    Unset { key: String },
}

#[derive(Subcommand)]
pub enum ProfileAction {
    Add,
    List,
    Remove { name: String },
}

#[derive(Subcommand)]
pub enum WalletAction {
    Import,
    List,
    New,
}

#[derive(Subcommand)]
pub enum DbAction {
    /// List all registered users
    ListUsers,
    /// Delete a user by email (admin only)
    DeleteUser {
        email: String,
    },
    /// Show database statistics (users, RPC call count)
    Stats,
    /// List recent RPC call logs
    ListLogs {
        /// Maximum number of log entries to show
        #[arg(short, long, default_value_t = 20)]
        limit: u64,
    },
}
