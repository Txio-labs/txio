import type { ChainTemplates } from './types';

// Sui Move 2024. The compiler maps the address in "module <address>::..." to
// 0x0, so each template uses its own address name.

export const SUI_TEMPLATES: ChainTemplates = {
    core: {
        name: 'Token',
        summary: 'A coin type. Publishing sends the TreasuryCap (mint and burn rights) to you.',
        code: `module token::token {
    use sui::coin::{Self, Coin, TreasuryCap};

    /// One-time witness: its name must be the module name in capitals.
    public struct TOKEN has drop {}

    /// Runs once at publish. The publisher receives the TreasuryCap.
    fun init(witness: TOKEN, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            9,
            b"TOKEN",
            b"Token",
            b"A token published from Txio",
            option::none(),
            ctx,
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, ctx.sender());
    }

    /// TreasuryCap holder only. Amounts are in base units (9 decimals).
    public fun mint(treasury: &mut TreasuryCap<TOKEN>, amount: u64, recipient: address, ctx: &mut TxContext) {
        transfer::public_transfer(coin::mint(treasury, amount, ctx), recipient);
    }

    public fun burn(treasury: &mut TreasuryCap<TOKEN>, coin: Coin<TOKEN>) {
        coin::burn(treasury, coin);
    }
}
`
    },
    defi: {
        name: 'Escrow',
        summary: 'Locks any coin for a payee; an arbiter releases it to the payee or refunds the payer.',
        code: `module escrow::escrow {
    use sui::balance::Balance;
    use sui::coin::{Self, Coin};
    use sui::event;

    const ENotArbiter: u64 = 0;

    /// A shared object holding the payment until the arbiter settles it.
    public struct Escrow<phantom T> has key {
        id: UID,
        payer: address,
        payee: address,
        arbiter: address,
        funds: Balance<T>,
    }

    public struct Settled has copy, drop {
        escrow: ID,
        recipient: address,
        amount: u64,
    }

    public fun open<T>(payment: Coin<T>, payee: address, arbiter: address, ctx: &mut TxContext) {
        transfer::share_object(Escrow {
            id: object::new(ctx),
            payer: ctx.sender(),
            payee,
            arbiter,
            funds: payment.into_balance(),
        });
    }

    /// Arbiter only: pays the payee and deletes the escrow.
    public fun release<T>(escrow: Escrow<T>, ctx: &mut TxContext) {
        settle(escrow, true, ctx);
    }

    /// Arbiter only: returns the payment to the payer and deletes the escrow.
    public fun refund<T>(escrow: Escrow<T>, ctx: &mut TxContext) {
        settle(escrow, false, ctx);
    }

    fun settle<T>(escrow: Escrow<T>, to_payee: bool, ctx: &mut TxContext) {
        let Escrow { id, payer, payee, arbiter, funds } = escrow;
        assert!(ctx.sender() == arbiter, ENotArbiter);
        let recipient = if (to_payee) payee else payer;
        event::emit(Settled { escrow: id.to_inner(), recipient, amount: funds.value() });
        id.delete();
        transfer::public_transfer(coin::from_balance(funds, ctx), recipient);
    }
}
`
    },
    identity: {
        name: 'NameRegistry',
        summary: 'A shared registry: one name per address, first come, first served.',
        code: `module names::registry {
    use std::string::String;
    use sui::table::{Self, Table};

    const ENameTaken: u64 = 0;
    const EAlreadyHasName: u64 = 1;
    const ENoName: u64 = 2;
    const EBadLength: u64 = 3;

    /// Shared once at publish; everyone registers in the same object.
    public struct Registry has key {
        id: UID,
        owners: Table<String, address>,
        names: Table<address, String>,
    }

    fun init(ctx: &mut TxContext) {
        transfer::share_object(Registry { id: object::new(ctx), owners: table::new(ctx), names: table::new(ctx) });
    }

    public fun register(registry: &mut Registry, name: String, ctx: &TxContext) {
        let length = name.length();
        assert!(length >= 3 && length <= 32, EBadLength);
        assert!(!registry.owners.contains(name), ENameTaken);
        let sender = ctx.sender();
        assert!(!registry.names.contains(sender), EAlreadyHasName);
        registry.owners.add(name, sender);
        registry.names.add(sender, name);
    }

    public fun release(registry: &mut Registry, ctx: &TxContext) {
        let sender = ctx.sender();
        assert!(registry.names.contains(sender), ENoName);
        let name = registry.names.remove(sender);
        registry.owners.remove(name);
    }

    public fun resolve(registry: &Registry, name: String): Option<address> {
        if (registry.owners.contains(name)) option::some(*registry.owners.borrow(name)) else option::none()
    }
}
`
    },
    social: {
        name: 'Profiles',
        summary: 'Shared profiles with a handle and follower counts; follow and unfollow other profiles.',
        code: `module social::profile {
    use std::string::String;
    use sui::vec_set::{Self, VecSet};

    const ENotOwner: u64 = 0;
    const ESelfFollow: u64 = 1;
    const EAlreadyFollowing: u64 = 2;
    const ENotFollowing: u64 = 3;

    /// Shared, so anyone can follow it; only the owner can follow from it.
    public struct Profile has key {
        id: UID,
        owner: address,
        handle: String,
        following: VecSet<ID>,
        followers: u64,
    }

    public fun create(handle: String, ctx: &mut TxContext) {
        transfer::share_object(Profile {
            id: object::new(ctx),
            owner: ctx.sender(),
            handle,
            following: vec_set::empty(),
            followers: 0,
        });
    }

    public fun follow(me: &mut Profile, target: &mut Profile, ctx: &TxContext) {
        assert!(me.owner == ctx.sender(), ENotOwner);
        let target_id = object::id(target);
        assert!(object::id(me) != target_id, ESelfFollow);
        assert!(!me.following.contains(&target_id), EAlreadyFollowing);
        me.following.insert(target_id);
        target.followers = target.followers + 1;
    }

    public fun unfollow(me: &mut Profile, target: &mut Profile, ctx: &TxContext) {
        assert!(me.owner == ctx.sender(), ENotOwner);
        let target_id = object::id(target);
        assert!(me.following.contains(&target_id), ENotFollowing);
        me.following.remove(&target_id);
        target.followers = target.followers - 1;
    }

    public fun set_handle(me: &mut Profile, handle: String, ctx: &TxContext) {
        assert!(me.owner == ctx.sender(), ENotOwner);
        me.handle = handle;
    }

    public fun followers(profile: &Profile): u64 {
        profile.followers
    }
}
`
    }
};
