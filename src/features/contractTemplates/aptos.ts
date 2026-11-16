import type { ChainTemplates } from './types';

// Aptos Move against the mainnet aptos-framework. The address in
// "module <address>::..." becomes the publishing account.

export const APTOS_TEMPLATES: ChainTemplates = {
    core: {
        name: 'Token',
        summary: 'Fungible asset with primary stores. The publisher can mint and burn.',
        code: `module token::token {
    use std::error;
    use std::option;
    use std::signer;
    use std::string::utf8;
    use aptos_framework::fungible_asset::{Self, BurnRef, Metadata, MintRef, TransferRef};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;

    const ENOT_OWNER: u64 = 1;
    const ASSET_SYMBOL: vector<u8> = b"TOKEN";

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct Refs has key {
        mint_ref: MintRef,
        transfer_ref: TransferRef,
        burn_ref: BurnRef,
    }

    /// Runs once at publish: creates the asset, owned by the publisher.
    fun init_module(admin: &signer) {
        let constructor_ref = &object::create_named_object(admin, ASSET_SYMBOL);
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            utf8(b"Token"),
            utf8(ASSET_SYMBOL),
            8,
            utf8(b""),
            utf8(b""),
        );
        let metadata_signer = object::generate_signer(constructor_ref);
        move_to(&metadata_signer, Refs {
            mint_ref: fungible_asset::generate_mint_ref(constructor_ref),
            transfer_ref: fungible_asset::generate_transfer_ref(constructor_ref),
            burn_ref: fungible_asset::generate_burn_ref(constructor_ref),
        });
    }

    #[view]
    public fun metadata(): Object<Metadata> {
        object::address_to_object<Metadata>(object::create_object_address(&@token, ASSET_SYMBOL))
    }

    #[view]
    public fun balance(account: address): u64 {
        primary_fungible_store::balance(account, metadata())
    }

    /// Owner only. Amounts are in base units (8 decimals).
    public entry fun mint(admin: &signer, to: address, amount: u64) acquires Refs {
        let refs = authorized_refs(admin);
        let store = primary_fungible_store::ensure_primary_store_exists(to, metadata());
        fungible_asset::deposit_with_ref(&refs.transfer_ref, store, fungible_asset::mint(&refs.mint_ref, amount));
    }

    /// Owner only.
    public entry fun burn(admin: &signer, from: address, amount: u64) acquires Refs {
        let refs = authorized_refs(admin);
        let store = primary_fungible_store::primary_store(from, metadata());
        fungible_asset::burn_from(&refs.burn_ref, store, amount);
    }

    /// Holders move tokens with primary_fungible_store::transfer, or this wrapper.
    public entry fun transfer(from: &signer, to: address, amount: u64) {
        primary_fungible_store::transfer(from, metadata(), to, amount);
    }

    fun authorized_refs(owner: &signer): &Refs acquires Refs {
        let asset = metadata();
        assert!(object::is_owner(asset, signer::address_of(owner)), error::permission_denied(ENOT_OWNER));
        borrow_global<Refs>(object::object_address(&asset))
    }
}
`
    },
    defi: {
        name: 'SavingsVault',
        summary: 'Lock APT in your own account until a date you choose, then withdraw it.',
        code: `module vault::savings {
    use std::error;
    use std::signer;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;

    const ENO_VAULT: u64 = 1;
    const ESTILL_LOCKED: u64 = 2;
    const EZERO_AMOUNT: u64 = 3;

    /// Lives in the saver's own account.
    struct Vault has key {
        coins: Coin<AptosCoin>,
        unlock_at: u64,
    }

    /// Adds amount octas (1 APT = 10^8) and sets the unlock time to
    /// lock_seconds from now, or keeps the later of the two.
    public entry fun deposit(account: &signer, amount: u64, lock_seconds: u64) acquires Vault {
        assert!(amount > 0, error::invalid_argument(EZERO_AMOUNT));
        let addr = signer::address_of(account);
        let coins = coin::withdraw<AptosCoin>(account, amount);
        let unlock_at = timestamp::now_seconds() + lock_seconds;
        if (exists<Vault>(addr)) {
            let vault = borrow_global_mut<Vault>(addr);
            coin::merge(&mut vault.coins, coins);
            if (unlock_at > vault.unlock_at) vault.unlock_at = unlock_at;
        } else {
            move_to(account, Vault { coins, unlock_at });
        }
    }

    /// Withdraws everything once the unlock time has passed.
    public entry fun withdraw_all(account: &signer) acquires Vault {
        let addr = signer::address_of(account);
        assert!(exists<Vault>(addr), error::not_found(ENO_VAULT));
        let Vault { coins, unlock_at } = move_from<Vault>(addr);
        assert!(timestamp::now_seconds() >= unlock_at, error::invalid_state(ESTILL_LOCKED));
        coin::deposit(addr, coins);
    }

    #[view]
    public fun locked(addr: address): (u64, u64) acquires Vault {
        if (!exists<Vault>(addr)) return (0, 0);
        let vault = borrow_global<Vault>(addr);
        (coin::value(&vault.coins), vault.unlock_at)
    }
}
`
    },
    identity: {
        name: 'NameRegistry',
        summary: 'A registry under the publishing account: one name per address, first come, first served.',
        code: `module names::registry {
    use std::error;
    use std::option::{Self, Option};
    use std::signer;
    use std::string::{Self, String};
    use aptos_std::table::{Self, Table};

    const ENAME_TAKEN: u64 = 1;
    const EALREADY_HAS_NAME: u64 = 2;
    const ENO_NAME: u64 = 3;
    const EBAD_LENGTH: u64 = 4;

    struct Registry has key {
        owners: Table<String, address>,
        names: Table<address, String>,
    }

    fun init_module(publisher: &signer) {
        move_to(publisher, Registry { owners: table::new(), names: table::new() });
    }

    public entry fun register(account: &signer, name: String) acquires Registry {
        let length = string::length(&name);
        assert!(length >= 3 && length <= 32, error::invalid_argument(EBAD_LENGTH));
        let registry = borrow_global_mut<Registry>(@names);
        let addr = signer::address_of(account);
        assert!(!table::contains(&registry.owners, name), error::already_exists(ENAME_TAKEN));
        assert!(!table::contains(&registry.names, addr), error::already_exists(EALREADY_HAS_NAME));
        table::add(&mut registry.owners, name, addr);
        table::add(&mut registry.names, addr, name);
    }

    public entry fun release(account: &signer) acquires Registry {
        let registry = borrow_global_mut<Registry>(@names);
        let addr = signer::address_of(account);
        assert!(table::contains(&registry.names, addr), error::not_found(ENO_NAME));
        let name = table::remove(&mut registry.names, addr);
        table::remove(&mut registry.owners, name);
    }

    #[view]
    public fun resolve(name: String): Option<address> acquires Registry {
        let registry = borrow_global<Registry>(@names);
        if (table::contains(&registry.owners, name)) option::some(*table::borrow(&registry.owners, name))
        else option::none()
    }
}
`
    },
    social: {
        name: 'FollowGraph',
        summary: 'Profiles with follower counts; follow and unfollow other profiles, with events.',
        code: `module social::graph {
    use std::error;
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::event;

    const ENO_PROFILE: u64 = 1;
    const ETARGET_NO_PROFILE: u64 = 2;
    const ESELF_FOLLOW: u64 = 3;
    const EALREADY_FOLLOWING: u64 = 4;
    const ENOT_FOLLOWING: u64 = 5;

    struct Profile has key {
        handle: String,
        following: vector<address>,
        followers: u64,
    }

    #[event]
    struct Followed has drop, store {
        follower: address,
        target: address,
    }

    #[event]
    struct Unfollowed has drop, store {
        follower: address,
        target: address,
    }

    public entry fun create_profile(account: &signer, handle: String) {
        move_to(account, Profile { handle, following: vector::empty(), followers: 0 });
    }

    public entry fun follow(account: &signer, target: address) acquires Profile {
        let me = signer::address_of(account);
        assert!(me != target, error::invalid_argument(ESELF_FOLLOW));
        assert!(exists<Profile>(me), error::not_found(ENO_PROFILE));
        assert!(exists<Profile>(target), error::not_found(ETARGET_NO_PROFILE));
        let profile = borrow_global_mut<Profile>(me);
        assert!(!vector::contains(&profile.following, &target), error::already_exists(EALREADY_FOLLOWING));
        vector::push_back(&mut profile.following, target);
        let target_profile = borrow_global_mut<Profile>(target);
        target_profile.followers = target_profile.followers + 1;
        event::emit(Followed { follower: me, target });
    }

    public entry fun unfollow(account: &signer, target: address) acquires Profile {
        let me = signer::address_of(account);
        assert!(exists<Profile>(me), error::not_found(ENO_PROFILE));
        let profile = borrow_global_mut<Profile>(me);
        let (found, index) = vector::index_of(&profile.following, &target);
        assert!(found, error::not_found(ENOT_FOLLOWING));
        vector::remove(&mut profile.following, index);
        let target_profile = borrow_global_mut<Profile>(target);
        target_profile.followers = target_profile.followers - 1;
        event::emit(Unfollowed { follower: me, target });
    }

    #[view]
    public fun stats(addr: address): (u64, u64) acquires Profile {
        if (!exists<Profile>(addr)) return (0, 0);
        let profile = borrow_global<Profile>(addr);
        (profile.followers, vector::length(&profile.following))
    }
}
`
    }
};
