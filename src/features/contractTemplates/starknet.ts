import type { ChainTemplates } from './types';

// Cairo contracts for Scarb 2.x with only the starknet package available, so
// the token is written out rather than imported from OpenZeppelin.

export const STARKNET_TEMPLATES: ChainTemplates = {
    core: {
        name: 'Token',
        summary: 'ERC-20 token. The constructor mints the initial supply to a recipient.',
        code: `use starknet::ContractAddress;

#[starknet::interface]
pub trait IToken<TContractState> {
    fn name(self: @TContractState) -> ByteArray;
    fn symbol(self: @TContractState) -> ByteArray;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
}

#[starknet::contract]
mod Token {
    use core::num::traits::{Bounded, Zero};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        name: ByteArray,
        symbol: ByteArray,
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        #[key]
        from: ContractAddress,
        #[key]
        to: ContractAddress,
        value: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        #[key]
        owner: ContractAddress,
        #[key]
        spender: ContractAddress,
        value: u256,
    }

    /// initial_supply is in base units (18 decimals).
    #[constructor]
    fn constructor(
        ref self: ContractState, name: ByteArray, symbol: ByteArray, initial_supply: u256, recipient: ContractAddress,
    ) {
        assert(!recipient.is_zero(), 'recipient is zero');
        self.name.write(name);
        self.symbol.write(symbol);
        self.total_supply.write(initial_supply);
        self.balances.write(recipient, initial_supply);
        self.emit(Transfer { from: Zero::zero(), to: recipient, value: initial_supply });
    }

    #[abi(embed_v0)]
    impl TokenImpl of super::IToken<ContractState> {
        fn name(self: @ContractState) -> ByteArray {
            self.name.read()
        }

        fn symbol(self: @ContractState) -> ByteArray {
            self.symbol.read()
        }

        fn decimals(self: @ContractState) -> u8 {
            18
        }

        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            self._transfer(get_caller_address(), recipient, amount);
            true
        }

        fn transfer_from(
            ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
        ) -> bool {
            let caller = get_caller_address();
            let allowed = self.allowances.read((sender, caller));
            if allowed != Bounded::MAX {
                assert(allowed >= amount, 'allowance too low');
                self.allowances.write((sender, caller), allowed - amount);
            }
            self._transfer(sender, recipient, amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let owner = get_caller_address();
            self.allowances.write((owner, spender), amount);
            self.emit(Approval { owner, spender, value: amount });
            true
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _transfer(ref self: ContractState, from: ContractAddress, to: ContractAddress, amount: u256) {
            assert(!to.is_zero(), 'transfer to zero address');
            let balance = self.balances.read(from);
            assert(balance >= amount, 'balance too low');
            self.balances.write(from, balance - amount);
            self.balances.write(to, self.balances.read(to) + amount);
            self.emit(Transfer { from, to, value: amount });
        }
    }
}
`
    },
    defi: {
        name: 'Vault',
        summary: 'Deposit and withdraw one ERC-20 token (set at deploy), with per-user balances.',
        code: `use starknet::ContractAddress;

#[starknet::interface]
pub trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
}

#[starknet::interface]
pub trait IVault<TContractState> {
    fn deposit(ref self: TContractState, amount: u256);
    fn withdraw(ref self: TContractState, amount: u256);
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn token(self: @TContractState) -> ContractAddress;
}

/// Holds one ERC-20 token for its depositors. Approve the vault on the token
/// before depositing.
#[starknet::contract]
mod Vault {
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::{IERC20Dispatcher, IERC20DispatcherTrait};

    #[storage]
    struct Storage {
        token: ContractAddress,
        balances: Map<ContractAddress, u256>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Deposited: Moved,
        Withdrawn: Moved,
    }

    #[derive(Drop, starknet::Event)]
    struct Moved {
        #[key]
        account: ContractAddress,
        amount: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, token: ContractAddress) {
        self.token.write(token);
    }

    #[abi(embed_v0)]
    impl VaultImpl of super::IVault<ContractState> {
        fn deposit(ref self: ContractState, amount: u256) {
            assert(amount > 0, 'amount is zero');
            let caller = get_caller_address();
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            assert(token.transfer_from(caller, get_contract_address(), amount), 'transfer_from failed');
            self.balances.write(caller, self.balances.read(caller) + amount);
            self.emit(Event::Deposited(Moved { account: caller, amount }));
        }

        fn withdraw(ref self: ContractState, amount: u256) {
            assert(amount > 0, 'amount is zero');
            let caller = get_caller_address();
            let held = self.balances.read(caller);
            assert(held >= amount, 'deposit too low');
            // Record first, then pay out.
            self.balances.write(caller, held - amount);
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            assert(token.transfer(caller, amount), 'transfer failed');
            self.emit(Event::Withdrawn(Moved { account: caller, amount }));
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn token(self: @ContractState) -> ContractAddress {
            self.token.read()
        }
    }
}
`
    },
    identity: {
        name: 'NameRegistry',
        summary: 'Register a short name (up to 31 characters) for your address, resolve it, release it.',
        code: `use starknet::ContractAddress;

#[starknet::interface]
pub trait INameRegistry<TContractState> {
    fn register(ref self: TContractState, name: felt252);
    fn release(ref self: TContractState);
    fn resolve(self: @TContractState, name: felt252) -> ContractAddress;
    fn name_of(self: @TContractState, account: ContractAddress) -> felt252;
}

/// First come, first served names. A name is a Cairo short string (up to 31
/// ASCII characters). resolve returns the zero address for a free name.
#[starknet::contract]
mod NameRegistry {
    use core::num::traits::Zero;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        owners: Map<felt252, ContractAddress>,
        names: Map<ContractAddress, felt252>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Registered: Record,
        Released: Record,
    }

    #[derive(Drop, starknet::Event)]
    struct Record {
        #[key]
        name: felt252,
        #[key]
        owner: ContractAddress,
    }

    #[abi(embed_v0)]
    impl NameRegistryImpl of super::INameRegistry<ContractState> {
        fn register(ref self: ContractState, name: felt252) {
            assert(name != 0, 'name is empty');
            let caller = get_caller_address();
            assert(self.owners.read(name).is_zero(), 'name taken');
            assert(self.names.read(caller) == 0, 'release your name first');
            self.owners.write(name, caller);
            self.names.write(caller, name);
            self.emit(Event::Registered(Record { name, owner: caller }));
        }

        fn release(ref self: ContractState) {
            let caller = get_caller_address();
            let name = self.names.read(caller);
            assert(name != 0, 'no name registered');
            self.owners.write(name, Zero::zero());
            self.names.write(caller, 0);
            self.emit(Event::Released(Record { name, owner: caller }));
        }

        fn resolve(self: @ContractState, name: felt252) -> ContractAddress {
            self.owners.read(name)
        }

        fn name_of(self: @ContractState, account: ContractAddress) -> felt252 {
            self.names.read(account)
        }
    }
}
`
    },
    social: {
        name: 'FollowGraph',
        summary: 'Follow and unfollow addresses, with follower and following counts.',
        code: `use starknet::ContractAddress;

#[starknet::interface]
pub trait IFollowGraph<TContractState> {
    fn follow(ref self: TContractState, target: ContractAddress);
    fn unfollow(ref self: TContractState, target: ContractAddress);
    fn is_following(self: @TContractState, follower: ContractAddress, target: ContractAddress) -> bool;
    fn follower_count(self: @TContractState, account: ContractAddress) -> u64;
    fn following_count(self: @TContractState, account: ContractAddress) -> u64;
}

#[starknet::contract]
mod FollowGraph {
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        follows: Map<(ContractAddress, ContractAddress), bool>,
        followers: Map<ContractAddress, u64>,
        following: Map<ContractAddress, u64>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Followed: Edge,
        Unfollowed: Edge,
    }

    #[derive(Drop, starknet::Event)]
    struct Edge {
        #[key]
        follower: ContractAddress,
        #[key]
        target: ContractAddress,
    }

    #[abi(embed_v0)]
    impl FollowGraphImpl of super::IFollowGraph<ContractState> {
        fn follow(ref self: ContractState, target: ContractAddress) {
            let caller = get_caller_address();
            assert(caller != target, 'cannot follow yourself');
            assert(!self.follows.read((caller, target)), 'already following');
            self.follows.write((caller, target), true);
            self.followers.write(target, self.followers.read(target) + 1);
            self.following.write(caller, self.following.read(caller) + 1);
            self.emit(Event::Followed(Edge { follower: caller, target }));
        }

        fn unfollow(ref self: ContractState, target: ContractAddress) {
            let caller = get_caller_address();
            assert(self.follows.read((caller, target)), 'not following');
            self.follows.write((caller, target), false);
            self.followers.write(target, self.followers.read(target) - 1);
            self.following.write(caller, self.following.read(caller) - 1);
            self.emit(Event::Unfollowed(Edge { follower: caller, target }));
        }

        fn is_following(self: @ContractState, follower: ContractAddress, target: ContractAddress) -> bool {
            self.follows.read((follower, target))
        }

        fn follower_count(self: @ContractState, account: ContractAddress) -> u64 {
            self.followers.read(account)
        }

        fn following_count(self: @ContractState, account: ContractAddress) -> u64 {
            self.following.read(account)
        }
    }
}
`
    }
};
