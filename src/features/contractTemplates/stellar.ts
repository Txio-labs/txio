import type { ChainTemplates } from './types';

// Soroban contracts for soroban-sdk 23. None uses a constructor: Txio deploys
// without constructor arguments, so setup happens in an initialize call.

export const STELLAR_TEMPLATES: ChainTemplates = {
    core: {
        name: 'Token',
        summary: 'Fungible token with an admin who mints. Emits SEP-41 style transfer events.',
        code: `#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, Address, Env, String,
};

#[contracttype]
enum DataKey {
    Admin,
    Name,
    Symbol,
    Balance(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum TokenError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InsufficientBalance = 3,
    InvalidAmount = 4,
}

/// Topics: "transfer", from, to. Data: the amount.
#[contractevent(data_format = "single-value")]
pub struct Transfer {
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contractevent(data_format = "single-value")]
pub struct Mint {
    #[topic]
    pub to: Address,
    pub amount: i128,
}

// About 30 days of ledgers: balances are extended whenever they are touched.
const BALANCE_TTL: u32 = 518_400;

#[contract]
pub struct Token;

#[contractimpl]
impl Token {
    /// Call once after deploying. The admin can mint.
    pub fn initialize(env: Env, admin: Address, name: String, symbol: String) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, TokenError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
    }

    /// Admin only. Amounts are in base units (7 decimals).
    pub fn mint(env: Env, to: Address, amount: i128) {
        check_amount(&env, amount);
        admin(&env).require_auth();
        set_balance(&env, &to, balance_of(&env, &to) + amount);
        Mint { to, amount }.publish(&env);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        check_amount(&env, amount);
        from.require_auth();
        let from_balance = balance_of(&env, &from);
        if from_balance < amount {
            panic_with_error!(&env, TokenError::InsufficientBalance);
        }
        set_balance(&env, &from, from_balance - amount);
        set_balance(&env, &to, balance_of(&env, &to) + amount);
        Transfer { from, to, amount }.publish(&env);
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        balance_of(&env, &id)
    }

    pub fn decimals(_env: Env) -> u32 {
        7
    }

    pub fn name(env: Env) -> String {
        read(&env, &DataKey::Name)
    }

    pub fn symbol(env: Env) -> String {
        read(&env, &DataKey::Symbol)
    }
}

fn check_amount(env: &Env, amount: i128) {
    if amount <= 0 {
        panic_with_error!(env, TokenError::InvalidAmount);
    }
}

fn read<T: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(env: &Env, key: &DataKey) -> T {
    env.storage()
        .instance()
        .get(key)
        .unwrap_or_else(|| panic_with_error!(env, TokenError::NotInitialized))
}

fn admin(env: &Env) -> Address {
    read(env, &DataKey::Admin)
}

fn balance_of(env: &Env, id: &Address) -> i128 {
    env.storage().persistent().get(&DataKey::Balance(id.clone())).unwrap_or(0)
}

fn set_balance(env: &Env, id: &Address, amount: i128) {
    let key = DataKey::Balance(id.clone());
    env.storage().persistent().set(&key, &amount);
    env.storage().persistent().extend_ttl(&key, BALANCE_TTL / 2, BALANCE_TTL);
}
`
    },
    defi: {
        name: 'Vault',
        summary: 'Deposit and withdraw any Stellar token, including XLM, with per-user balances.',
        code: `#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, panic_with_error, token, Address, Env};

#[contracttype]
enum DataKey {
    /// (token, owner) -> amount held for the owner
    Deposit(Address, Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum VaultError {
    InvalidAmount = 1,
    InsufficientDeposit = 2,
}

const DEPOSIT_TTL: u32 = 518_400;

/// Holds tokens for their owners. Works with any SEP-41 token, including
/// Stellar Asset Contracts such as native XLM.
#[contract]
pub struct Vault;

#[contractimpl]
impl Vault {
    /// Moves amount of token from owner into the vault. Returns the owner's new deposit.
    pub fn deposit(env: Env, owner: Address, token: Address, amount: i128) -> i128 {
        owner.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, VaultError::InvalidAmount);
        }
        token::Client::new(&env, &token).transfer(&owner, &env.current_contract_address(), &amount);
        let total = deposit_of(&env, &token, &owner) + amount;
        set_deposit(&env, &token, &owner, total);
        total
    }

    /// Sends amount back to owner. Returns what is left.
    pub fn withdraw(env: Env, owner: Address, token: Address, amount: i128) -> i128 {
        owner.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, VaultError::InvalidAmount);
        }
        let held = deposit_of(&env, &token, &owner);
        if held < amount {
            panic_with_error!(&env, VaultError::InsufficientDeposit);
        }
        // Record first, then pay out.
        set_deposit(&env, &token, &owner, held - amount);
        token::Client::new(&env, &token).transfer(&env.current_contract_address(), &owner, &amount);
        held - amount
    }

    pub fn balance(env: Env, owner: Address, token: Address) -> i128 {
        deposit_of(&env, &token, &owner)
    }
}

fn deposit_of(env: &Env, token: &Address, owner: &Address) -> i128 {
    env.storage().persistent().get(&DataKey::Deposit(token.clone(), owner.clone())).unwrap_or(0)
}

fn set_deposit(env: &Env, token: &Address, owner: &Address, amount: i128) {
    let key = DataKey::Deposit(token.clone(), owner.clone());
    env.storage().persistent().set(&key, &amount);
    env.storage().persistent().extend_ttl(&key, DEPOSIT_TTL / 2, DEPOSIT_TTL);
}
`
    },
    identity: {
        name: 'NameRegistry',
        summary: 'Register a name for your address, resolve names, and release them.',
        code: `#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, panic_with_error, Address, Env, Symbol};

#[contracttype]
enum DataKey {
    Owner(Symbol),
    Name(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RegistryError {
    NameTaken = 1,
    AlreadyHasName = 2,
    NoName = 3,
}

const RECORD_TTL: u32 = 518_400;

/// First come, first served names. A name is a Symbol: up to 32 characters
/// from a-z, A-Z, 0-9 and _.
#[contract]
pub struct NameRegistry;

#[contractimpl]
impl NameRegistry {
    pub fn register(env: Env, owner: Address, name: Symbol) {
        owner.require_auth();
        let storage = env.storage().persistent();
        if storage.has(&DataKey::Owner(name.clone())) {
            panic_with_error!(&env, RegistryError::NameTaken);
        }
        if storage.has(&DataKey::Name(owner.clone())) {
            panic_with_error!(&env, RegistryError::AlreadyHasName);
        }
        storage.set(&DataKey::Owner(name.clone()), &owner);
        storage.set(&DataKey::Name(owner.clone()), &name);
        storage.extend_ttl(&DataKey::Owner(name), RECORD_TTL / 2, RECORD_TTL);
        storage.extend_ttl(&DataKey::Name(owner), RECORD_TTL / 2, RECORD_TTL);
    }

    pub fn release(env: Env, owner: Address) {
        owner.require_auth();
        let storage = env.storage().persistent();
        let name: Symbol = storage
            .get(&DataKey::Name(owner.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, RegistryError::NoName));
        storage.remove(&DataKey::Owner(name));
        storage.remove(&DataKey::Name(owner));
    }

    pub fn resolve(env: Env, name: Symbol) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Owner(name))
    }

    pub fn name_of(env: Env, owner: Address) -> Option<Symbol> {
        env.storage().persistent().get(&DataKey::Name(owner))
    }
}
`
    },
    social: {
        name: 'FollowGraph',
        summary: 'Follow and unfollow addresses, with follower and following counts.',
        code: `#![no_std]
use soroban_sdk::{contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, Address, Env};

#[contracttype]
enum DataKey {
    Follows(Address, Address),
    Followers(Address),
    Following(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum GraphError {
    SelfFollow = 1,
    AlreadyFollowing = 2,
    NotFollowing = 3,
}

#[contractevent]
pub struct Followed {
    #[topic]
    pub follower: Address,
    #[topic]
    pub target: Address,
}

#[contractevent]
pub struct Unfollowed {
    #[topic]
    pub follower: Address,
    #[topic]
    pub target: Address,
}

const EDGE_TTL: u32 = 518_400;

#[contract]
pub struct FollowGraph;

#[contractimpl]
impl FollowGraph {
    pub fn follow(env: Env, follower: Address, target: Address) {
        follower.require_auth();
        if follower == target {
            panic_with_error!(&env, GraphError::SelfFollow);
        }
        let edge = DataKey::Follows(follower.clone(), target.clone());
        if env.storage().persistent().has(&edge) {
            panic_with_error!(&env, GraphError::AlreadyFollowing);
        }
        env.storage().persistent().set(&edge, &true);
        env.storage().persistent().extend_ttl(&edge, EDGE_TTL / 2, EDGE_TTL);
        bump(&env, DataKey::Followers(target.clone()), 1);
        bump(&env, DataKey::Following(follower.clone()), 1);
        Followed { follower, target }.publish(&env);
    }

    pub fn unfollow(env: Env, follower: Address, target: Address) {
        follower.require_auth();
        let edge = DataKey::Follows(follower.clone(), target.clone());
        if !env.storage().persistent().has(&edge) {
            panic_with_error!(&env, GraphError::NotFollowing);
        }
        env.storage().persistent().remove(&edge);
        bump(&env, DataKey::Followers(target.clone()), -1);
        bump(&env, DataKey::Following(follower.clone()), -1);
        Unfollowed { follower, target }.publish(&env);
    }

    pub fn is_following(env: Env, follower: Address, target: Address) -> bool {
        env.storage().persistent().has(&DataKey::Follows(follower, target))
    }

    pub fn follower_count(env: Env, account: Address) -> u32 {
        env.storage().persistent().get(&DataKey::Followers(account)).unwrap_or(0)
    }

    pub fn following_count(env: Env, account: Address) -> u32 {
        env.storage().persistent().get(&DataKey::Following(account)).unwrap_or(0)
    }
}

fn bump(env: &Env, key: DataKey, delta: i32) {
    let current: u32 = env.storage().persistent().get(&key).unwrap_or(0);
    let next = current.saturating_add_signed(delta);
    env.storage().persistent().set(&key, &next);
    env.storage().persistent().extend_ttl(&key, EDGE_TTL / 2, EDGE_TTL);
}
`
    }
};
