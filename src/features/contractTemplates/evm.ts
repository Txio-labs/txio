import type { ChainTemplates } from './types';

export const EVM_TEMPLATES: ChainTemplates = {
    core: {
        name: 'Token',
        summary: 'ERC-20 token. The deployer receives the initial supply.',
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// A fixed-supply ERC-20 token. The deployer receives the whole supply,
/// given in base units (18 decimals: 1 token = 10^18).
contract Token {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint256 initialSupply) {
        name = name_;
        symbol = symbol_;
        totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply;
        emit Transfer(address(0), msg.sender, initialSupply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= value, "allowance too low");
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "transfer to the zero address");
        uint256 balance = balanceOf[from];
        require(balance >= value, "balance too low");
        unchecked {
            balanceOf[from] = balance - value;
        }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
`
    },
    defi: {
        name: 'Escrow',
        summary: 'Holds ETH for a payee until an arbiter releases it or refunds the payer.',
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Holds ETH for a payee until the arbiter releases it, or refunds the payer.
contract Escrow {
    struct Deal {
        address payer;
        address payee;
        address arbiter;
        uint256 amount;
        bool settled;
    }

    mapping(uint256 => Deal) public deals;
    uint256 public dealCount;

    event Opened(uint256 indexed id, address indexed payer, address indexed payee, address arbiter, uint256 amount);
    event Released(uint256 indexed id);
    event Refunded(uint256 indexed id);

    /// Locks the ETH sent with this call. Returns the deal id.
    function open(address payee, address arbiter) external payable returns (uint256 id) {
        require(msg.value > 0, "send ETH to escrow");
        require(payee != address(0) && arbiter != address(0), "zero address");
        id = ++dealCount;
        deals[id] = Deal(msg.sender, payee, arbiter, msg.value, false);
        emit Opened(id, msg.sender, payee, arbiter, msg.value);
    }

    /// Arbiter only: pays the payee.
    function release(uint256 id) external {
        Deal storage deal = _settle(id);
        _pay(deal.payee, deal.amount);
        emit Released(id);
    }

    /// Arbiter only: returns the ETH to the payer.
    function refund(uint256 id) external {
        Deal storage deal = _settle(id);
        _pay(deal.payer, deal.amount);
        emit Refunded(id);
    }

    function _settle(uint256 id) internal returns (Deal storage deal) {
        deal = deals[id];
        require(deal.amount > 0, "no such deal");
        require(msg.sender == deal.arbiter, "only the arbiter");
        require(!deal.settled, "already settled");
        // Marked settled before any ETH moves, so a re-entrant call fails.
        deal.settled = true;
    }

    function _pay(address to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "payment failed");
    }
}
`
    },
    identity: {
        name: 'NameRegistry',
        summary: 'First come, first served names: one owner per name, one name per address.',
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// First come, first served names. Each name has one owner and each
/// address holds at most one name.
contract NameRegistry {
    mapping(string => address) public ownerOf;
    mapping(address => string) public nameOf;

    event Registered(string name, address indexed owner);
    event Released(string name, address indexed owner);

    function register(string calldata name) external {
        uint256 length = bytes(name).length;
        require(length >= 3 && length <= 32, "names are 3 to 32 bytes");
        require(ownerOf[name] == address(0), "name taken");
        require(bytes(nameOf[msg.sender]).length == 0, "release your current name first");
        ownerOf[name] = msg.sender;
        nameOf[msg.sender] = name;
        emit Registered(name, msg.sender);
    }

    function release() external {
        string memory name = nameOf[msg.sender];
        require(bytes(name).length > 0, "no name registered");
        delete ownerOf[name];
        delete nameOf[msg.sender];
        emit Released(name, msg.sender);
    }
}
`
    },
    social: {
        name: 'FollowGraph',
        summary: 'Follow and unfollow accounts, with follower counts and a short bio.',
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// An on-chain follow graph with follower counts and a short bio.
contract FollowGraph {
    mapping(address => mapping(address => bool)) public isFollowing;
    mapping(address => uint256) public followerCount;
    mapping(address => uint256) public followingCount;
    mapping(address => string) public bio;

    event Followed(address indexed follower, address indexed target);
    event Unfollowed(address indexed follower, address indexed target);
    event BioUpdated(address indexed account, string bio);

    function follow(address target) external {
        require(target != msg.sender, "cannot follow yourself");
        require(!isFollowing[msg.sender][target], "already following");
        isFollowing[msg.sender][target] = true;
        followerCount[target] += 1;
        followingCount[msg.sender] += 1;
        emit Followed(msg.sender, target);
    }

    function unfollow(address target) external {
        require(isFollowing[msg.sender][target], "not following");
        isFollowing[msg.sender][target] = false;
        followerCount[target] -= 1;
        followingCount[msg.sender] -= 1;
        emit Unfollowed(msg.sender, target);
    }

    function setBio(string calldata text) external {
        require(bytes(text).length <= 160, "bios are at most 160 bytes");
        bio[msg.sender] = text;
        emit BioUpdated(msg.sender, text);
    }
}
`
    }
};
