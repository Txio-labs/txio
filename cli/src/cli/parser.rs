
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
#[command(name = "flow")]
#[command(version = "1.0")]
#[command(about = "Flow: The Universal Multi-Chain Blockchain Terminal", long_about = None)]
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

    /// User email for account-linked requests
    #[arg(short, long, global = true, env = "FLOW_EMAIL")]
    pub email: Option<String>,
}

#[derive(Subcommand)]
pub enum Commands {
    /// List all supported chains
    Chains,

    /// Switch the default chain
    Switch {
        chain: String,
    },

    /// Login to your Flow account
    Login,

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
    /// Call an RPC method
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
    /// Query a specific object or account
    Query {
        id: String,
    },
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
}
