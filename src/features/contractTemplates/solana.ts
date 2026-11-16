import type { ChainTemplates } from './types';

// Anchor 1.2 programs. The declare_id! line is replaced with a fresh program
// id each time the Contract Builder compiles. Only anchor-lang is available,
// so the token keeps its own ledger instead of using the SPL Token program.

export const SOLANA_TEMPLATES: ChainTemplates = {
    core: {
        name: 'Points',
        summary: 'A points token: a mint with an authority, per-owner balance accounts, mint and transfer.',
        code: `use anchor_lang::prelude::*;

// Replaced with a fresh program id each time you compile.
declare_id!("11111111111111111111111111111111");

#[program]
pub mod points {
    use super::*;

    /// Creates a points mint. The signer becomes its authority.
    pub fn create_mint(ctx: Context<CreateMint>, name: String, decimals: u8) -> Result<()> {
        require!(name.len() <= 32, PointsError::NameTooLong);
        let mint = &mut ctx.accounts.mint;
        mint.authority = ctx.accounts.authority.key();
        mint.name = name;
        mint.decimals = decimals;
        mint.supply = 0;
        Ok(())
    }

    /// Opens the signer's balance account for a mint (a PDA, one per owner and mint).
    pub fn open_balance(ctx: Context<OpenBalance>) -> Result<()> {
        let balance = &mut ctx.accounts.balance;
        balance.mint = ctx.accounts.mint.key();
        balance.owner = ctx.accounts.owner.key();
        balance.amount = 0;
        balance.bump = ctx.bumps.balance;
        Ok(())
    }

    /// Mint authority only.
    pub fn mint_to(ctx: Context<MintTo>, amount: u64) -> Result<()> {
        let mint = &mut ctx.accounts.mint;
        mint.supply = mint.supply.checked_add(amount).ok_or(PointsError::Overflow)?;
        let balance = &mut ctx.accounts.balance;
        balance.amount = balance.amount.checked_add(amount).ok_or(PointsError::Overflow)?;
        Ok(())
    }

    pub fn transfer(ctx: Context<TransferPoints>, amount: u64) -> Result<()> {
        let from = &mut ctx.accounts.from;
        from.amount = from.amount.checked_sub(amount).ok_or(PointsError::InsufficientBalance)?;
        let to = &mut ctx.accounts.to;
        to.amount = to.amount.checked_add(amount).ok_or(PointsError::Overflow)?;
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Mint {
    pub authority: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub decimals: u8,
    pub supply: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Balance {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct CreateMint<'info> {
    #[account(init, payer = authority, space = 8 + Mint::INIT_SPACE)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OpenBalance<'info> {
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = owner,
        space = 8 + Balance::INIT_SPACE,
        seeds = [b"balance", mint.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub balance: Account<'info, Balance>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintTo<'info> {
    #[account(mut, has_one = authority)]
    pub mint: Account<'info, Mint>,
    #[account(mut, has_one = mint)]
    pub balance: Account<'info, Balance>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferPoints<'info> {
    #[account(mut, has_one = owner)]
    pub from: Account<'info, Balance>,
    #[account(mut, constraint = to.mint == from.mint @ PointsError::MintMismatch)]
    pub to: Account<'info, Balance>,
    pub owner: Signer<'info>,
}

#[error_code]
pub enum PointsError {
    #[msg("Names are at most 32 bytes")]
    NameTooLong,
    #[msg("Amount overflows")]
    Overflow,
    #[msg("Balance too low")]
    InsufficientBalance,
    #[msg("Both balances must belong to the same mint")]
    MintMismatch,
}
`
    },
    defi: {
        name: 'Escrow',
        summary: 'Locks SOL for a payee; an arbiter releases it to the payee or refunds the payer.',
        code: `use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

// Replaced with a fresh program id each time you compile.
declare_id!("11111111111111111111111111111111");

#[program]
pub mod escrow {
    use super::*;

    /// Moves amount lamports from the payer into a new escrow account.
    pub fn open(ctx: Context<Open>, id: u64, payee: Pubkey, arbiter: Pubkey, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::ZeroAmount);
        let escrow = &mut ctx.accounts.escrow;
        escrow.id = id;
        escrow.payer = ctx.accounts.payer.key();
        escrow.payee = payee;
        escrow.arbiter = arbiter;
        escrow.amount = amount;
        escrow.bump = ctx.bumps.escrow;
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            amount,
        )
    }

    /// Arbiter only: closes the escrow and pays everything in it to the payee.
    pub fn release(_ctx: Context<Release>) -> Result<()> {
        Ok(())
    }

    /// Arbiter only: closes the escrow and returns everything in it to the payer.
    pub fn refund(_ctx: Context<Refund>) -> Result<()> {
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct EscrowAccount {
    pub id: u64,
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub arbiter: Pubkey,
    pub amount: u64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct Open<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + EscrowAccount::INIT_SPACE,
        seeds = [b"escrow", payer.key().as_ref(), &id.to_le_bytes()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    // close = payee sends the escrowed lamports and the rent to the payee.
    #[account(mut, has_one = arbiter, has_one = payee, close = payee)]
    pub escrow: Account<'info, EscrowAccount>,
    pub arbiter: Signer<'info>,
    /// CHECK: only receives lamports; must match escrow.payee (has_one).
    #[account(mut)]
    pub payee: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut, has_one = arbiter, has_one = payer, close = payer)]
    pub escrow: Account<'info, EscrowAccount>,
    pub arbiter: Signer<'info>,
    /// CHECK: only receives lamports; must match escrow.payer (has_one).
    #[account(mut)]
    pub payer: UncheckedAccount<'info>,
}

#[error_code]
pub enum EscrowError {
    #[msg("Escrow at least one lamport")]
    ZeroAmount,
}
`
    },
    identity: {
        name: 'NameRegistry',
        summary: 'Claim a name as a PDA, transfer it to another owner, or release it.',
        code: `use anchor_lang::prelude::*;

// Replaced with a fresh program id each time you compile.
declare_id!("11111111111111111111111111111111");

#[program]
pub mod name_registry {
    use super::*;

    /// Claims a name. Fails if someone already holds it.
    pub fn register(ctx: Context<Register>, name: String) -> Result<()> {
        require!((3..=32).contains(&name.len()), RegistryError::BadLength);
        let record = &mut ctx.accounts.record;
        record.owner = ctx.accounts.owner.key();
        record.name = name;
        record.bump = ctx.bumps.record;
        Ok(())
    }

    /// Current owner only.
    pub fn transfer_name(ctx: Context<Update>, new_owner: Pubkey) -> Result<()> {
        ctx.accounts.record.owner = new_owner;
        Ok(())
    }

    /// Current owner only: deletes the record and refunds its rent.
    pub fn release(_ctx: Context<Release>) -> Result<()> {
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct NameRecord {
    pub owner: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct Register<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + NameRecord::INIT_SPACE,
        seeds = [b"name", name.as_bytes()],
        bump
    )]
    pub record: Account<'info, NameRecord>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut, has_one = owner)]
    pub record: Account<'info, NameRecord>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut, has_one = owner, close = owner)]
    pub record: Account<'info, NameRecord>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[error_code]
pub enum RegistryError {
    #[msg("Names are 3 to 32 bytes")]
    BadLength,
}
`
    },
    social: {
        name: 'FollowGraph',
        summary: 'Profiles with follower counts; each follow is its own account.',
        code: `use anchor_lang::prelude::*;

// Replaced with a fresh program id each time you compile.
declare_id!("11111111111111111111111111111111");

#[program]
pub mod follow_graph {
    use super::*;

    pub fn create_profile(ctx: Context<CreateProfile>, handle: String) -> Result<()> {
        require!((3..=24).contains(&handle.len()), GraphError::BadHandle);
        let profile = &mut ctx.accounts.profile;
        profile.owner = ctx.accounts.owner.key();
        profile.handle = handle;
        profile.followers = 0;
        profile.following = 0;
        profile.bump = ctx.bumps.profile;
        Ok(())
    }

    pub fn follow(ctx: Context<Follow>) -> Result<()> {
        require_keys_neq!(ctx.accounts.my_profile.key(), ctx.accounts.target_profile.key(), GraphError::SelfFollow);
        ctx.accounts.edge.bump = ctx.bumps.edge;
        ctx.accounts.my_profile.following += 1;
        ctx.accounts.target_profile.followers += 1;
        Ok(())
    }

    pub fn unfollow(ctx: Context<Unfollow>) -> Result<()> {
        ctx.accounts.my_profile.following -= 1;
        ctx.accounts.target_profile.followers -= 1;
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Profile {
    pub owner: Pubkey,
    #[max_len(24)]
    pub handle: String,
    pub followers: u64,
    pub following: u64,
    pub bump: u8,
}

/// Exists while my_profile follows target_profile.
#[account]
#[derive(InitSpace)]
pub struct FollowEdge {
    pub bump: u8,
}

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(init, payer = owner, space = 8 + Profile::INIT_SPACE, seeds = [b"profile", owner.key().as_ref()], bump)]
    pub profile: Account<'info, Profile>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Follow<'info> {
    #[account(mut, has_one = owner)]
    pub my_profile: Account<'info, Profile>,
    #[account(mut)]
    pub target_profile: Account<'info, Profile>,
    #[account(
        init,
        payer = owner,
        space = 8 + FollowEdge::INIT_SPACE,
        seeds = [b"follow", my_profile.key().as_ref(), target_profile.key().as_ref()],
        bump
    )]
    pub edge: Account<'info, FollowEdge>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unfollow<'info> {
    #[account(mut, has_one = owner)]
    pub my_profile: Account<'info, Profile>,
    #[account(mut)]
    pub target_profile: Account<'info, Profile>,
    #[account(
        mut,
        close = owner,
        seeds = [b"follow", my_profile.key().as_ref(), target_profile.key().as_ref()],
        bump = edge.bump
    )]
    pub edge: Account<'info, FollowEdge>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[error_code]
pub enum GraphError {
    #[msg("Handles are 3 to 24 bytes")]
    BadHandle,
    #[msg("You cannot follow yourself")]
    SelfFollow,
}
`
    }
};
