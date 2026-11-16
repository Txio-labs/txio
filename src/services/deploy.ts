/**
 * Deploys Contract Builder artifacts with the connected wallet, one function
 * per chain. Every step is a real on-chain transaction the wallet signs;
 * nothing is deployed on the user's behalf.
 */
import type { Network } from '@/types';
import type { ConnectedWallet } from '@/wallet/types';
import { resolveChainRpcUrl } from './suiService';
import { stellarExplorerUrl, stellarPassphrase } from './adapters/stellarAdapter';
import { stellarExpertUrl } from '@/lib/constants';
import { signStellarTransaction } from '@/wallet/stellar';
import { signAllSolanaTransactions } from '@/wallet/solana';
import { signAndSubmitAptosTransaction } from '@/wallet/aptos';
import { aptosExplorerUrl } from './adapters/aptosAdapter';
import { requestStarknetWallet } from '@/wallet/starknet';
import { getStarknetProvider, loadStarknet, parseStarknetArg, starknetAccountExplorerUrl, starknetTxExplorerUrl } from './starknet';
import { base64ToBytes, type AptosArtifact, type StarknetContractArtifact, type SuiArtifact } from './compile/remote';

export interface DeployResult {
    /** Contract id, program id, package id or contract address. */
    address: string;
    explorerUrl?: string;
    transactions: string[];
}

type Log = (line: string) => void;

const requireWallet = (wallet: ConnectedWallet | null | undefined, family: ConnectedWallet['family'], label: string): ConnectedWallet => {
    if (!wallet || wallet.family !== family) throw new Error(`Connect a ${label} wallet to deploy.`);
    return wallet;
};

/* ----------------------------------------------------------------- Stellar */

/**
 * Two transactions: upload the WASM (installs the code, keyed by its hash),
 * then create a contract instance from that hash with a random salt.
 */
export async function deployStellar(wasmB64: string, wallet: ConnectedWallet | null, network: Network, log: Log): Promise<DeployResult> {
    const signer = requireWallet(wallet, 'stellar', 'Stellar');
    const { Address, BASE_FEE, Operation, TransactionBuilder, rpc, scValToNative, hash } = await import('@stellar/stellar-sdk');
    const server = new rpc.Server(resolveChainRpcUrl('stellar', network));
    const passphrase = await stellarPassphrase(network);
    const wasm = base64ToBytes(wasmB64);

    const submit = async (op: ReturnType<typeof Operation.uploadContractWasm>, what: string) => {
        const account = await server.getAccount(signer.address);
        const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: passphrase }).addOperation(op).setTimeout(120).build();
        const prepared = await server.prepareTransaction(tx);
        log(`${what}: waiting for your wallet…`);
        const signed = await signStellarTransaction(signer.id, prepared.toXDR(), passphrase, signer.address);
        const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signed, passphrase));
        if (sent.status === 'ERROR') throw new Error(`${what} was rejected by the network.`);
        log(`${what}: submitted ${sent.hash}`);
        for (let i = 0; i < 60; i++) {
            const got = await server.getTransaction(sent.hash);
            if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) return { hash: sent.hash, returnValue: got.returnValue };
            if (got.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error(`${what} failed on-chain (${sent.hash}).`);
            await new Promise((r) => setTimeout(r, 1000));
        }
        throw new Error(`${what} was not confirmed within 60s (${sent.hash}).`);
    };

    const upload = await submit(Operation.uploadContractWasm({ wasm }), 'Upload WASM');
    const wasmHash = hash(Buffer.from(wasm));
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const created = await submit(
        Operation.createCustomContract({ address: new Address(signer.address), wasmHash, salt }),
        'Create contract'
    );
    const contractId = created.returnValue ? String(scValToNative(created.returnValue)) : '';
    if (!contractId) throw new Error('The network did not return a contract id.');
    log(`Deployed ${contractId}`);
    return {
        address: contractId,
        explorerUrl: stellarExpertUrl(network, 'contract', contractId),
        transactions: [upload.hash, created.hash].map((h) => stellarExplorerUrl(network, h) ?? h)
    };
}

/* ------------------------------------------------------------------ Solana */

const LOADER = 'BPFLoaderUpgradeab1e11111111111111111111111';
const BUFFER_HEADER = 37; // UpgradeableLoaderState::Buffer: tag(4) + Option<authority>(1 + 32)
const PROGRAM_SIZE = 36; // UpgradeableLoaderState::Program: tag(4) + programdata address(32)
const PROGRAMDATA_HEADER = 45; // tag(4) + slot(8) + Option<authority>(1 + 32)
const WRITE_CHUNK = 900; // fits a Write instruction in one 1232-byte transaction

const u32 = (n: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n, true);
    return b;
};
const u64 = (n: number) => {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setBigUint64(0, BigInt(n), true);
    return b;
};
const concat = (...parts: Uint8Array[]) => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) {
        out.set(p, o);
        o += p.length;
    }
    return out;
};

/** Generates the program keypair before compiling, so `declare_id!` can match it. */
export async function newSolanaProgramKeypair() {
    const { Keypair } = await import('@solana/web3.js');
    return Keypair.generate();
}

/**
 * Upgradeable-loader deployment, as `solana program deploy` does it: create a
 * buffer, write the binary into it in chunks, then create the program account
 * and deploy from the buffer. The connected wallet pays and stays the upgrade
 * authority. All transactions are signed in one wallet prompt where the
 * wallet supports signAllTransactions.
 */
export async function deploySolana(
    programB64: string,
    programKeypair: import('@solana/web3.js').Keypair,
    wallet: ConnectedWallet | null,
    network: Network,
    log: Log
): Promise<DeployResult> {
    const signer = requireWallet(wallet, 'solana', 'Solana');
    const { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY } = await import(
        '@solana/web3.js'
    );
    const connection = new Connection(resolveChainRpcUrl('solana', network), 'confirmed');
    const loader = new PublicKey(LOADER);
    const payer = new PublicKey(signer.address);
    const program = base64ToBytes(programB64);
    const buffer = Keypair.generate();
    const [programData] = PublicKey.findProgramAddressSync([programKeypair.publicKey.toBuffer()], loader);

    const [bufferRent, programRent, dataRent] = await Promise.all([
        connection.getMinimumBalanceForRentExemption(BUFFER_HEADER + program.length),
        connection.getMinimumBalanceForRentExemption(PROGRAM_SIZE),
        connection.getMinimumBalanceForRentExemption(PROGRAMDATA_HEADER + program.length)
    ]);
    const balance = await connection.getBalance(payer);
    const needed = bufferRent + programRent + dataRent;
    if (balance < needed) {
        throw new Error(`Deploying needs about ${(needed / 1e9).toFixed(3)} SOL for rent; the wallet has ${(balance / 1e9).toFixed(3)} SOL.`);
    }

    const ix = (data: Uint8Array, keys: { pubkey: InstanceType<typeof PublicKey>; isSigner: boolean; isWritable: boolean }[]) =>
        new TransactionInstruction({ programId: loader, keys, data: Buffer.from(data) });

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const tx = () => new Transaction({ feePayer: payer, blockhash, lastValidBlockHeight });

    const create = tx().add(
        SystemProgram.createAccount({ fromPubkey: payer, newAccountPubkey: buffer.publicKey, lamports: bufferRent, space: BUFFER_HEADER + program.length, programId: loader }),
        ix(u32(0), [
            { pubkey: buffer.publicKey, isSigner: false, isWritable: true },
            { pubkey: payer, isSigner: false, isWritable: false }
        ])
    );
    create.partialSign(buffer);

    const writes = [];
    for (let offset = 0; offset < program.length; offset += WRITE_CHUNK) {
        const chunk = program.subarray(offset, offset + WRITE_CHUNK);
        writes.push(
            tx().add(
                ix(concat(u32(1), u32(offset), u64(chunk.length), chunk), [
                    { pubkey: buffer.publicKey, isSigner: false, isWritable: true },
                    { pubkey: payer, isSigner: true, isWritable: false }
                ])
            )
        );
    }

    const deploy = tx().add(
        SystemProgram.createAccount({ fromPubkey: payer, newAccountPubkey: programKeypair.publicKey, lamports: programRent, space: PROGRAM_SIZE, programId: loader }),
        ix(concat(u32(2), u64(program.length)), [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: programData, isSigner: false, isWritable: true },
            { pubkey: programKeypair.publicKey, isSigner: false, isWritable: true },
            { pubkey: buffer.publicKey, isSigner: false, isWritable: true },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: payer, isSigner: true, isWritable: false }
        ])
    );
    deploy.partialSign(programKeypair);

    log(`Signing ${writes.length + 2} transactions (${program.length} bytes)…`);
    const signed = await signAllSolanaTransactions(signer.id, [create, ...writes, deploy]);
    const send = async (t: InstanceType<typeof Transaction>) => {
        const sig = await connection.sendRawTransaction(t.serialize(), { skipPreflight: false });
        await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
        return sig;
    };

    const sigs = [await send(signed[0])];
    log('Buffer created. Writing program…');
    const body = signed.slice(1, -1);
    for (let i = 0; i < body.length; i += 8) {
        sigs.push(...(await Promise.all(body.slice(i, i + 8).map(send))));
        log(`Wrote ${Math.min(i + 8, body.length)}/${body.length} chunks`);
    }
    sigs.push(await send(signed[signed.length - 1]));
    const programId = programKeypair.publicKey.toBase58();
    log(`Deployed ${programId}`);
    const cluster = network === 'mainnet' ? '' : `?cluster=${network === 'localnet' ? 'custom' : network}`;
    return {
        address: programId,
        explorerUrl: `https://explorer.solana.com/address/${programId}${cluster}`,
        transactions: [sigs[0], sigs[sigs.length - 1]].map((s) => `https://explorer.solana.com/tx/${s}${cluster}`)
    };
}

/* --------------------------------------------------------------------- Sui */

/** Publishes the package and hands the UpgradeCap to the sender. */
export async function deploySui(
    artifact: SuiArtifact,
    wallet: ConnectedWallet | null,
    signAndExecute: (args: { transaction: unknown }) => Promise<{ digest: string }>,
    network: Network,
    log: Log
): Promise<DeployResult> {
    const signer = requireWallet(wallet, 'sui', 'Sui');
    const { Transaction } = await import('@mysten/sui/transactions');
    const tx = new Transaction();
    const [upgradeCap] = tx.publish({ modules: artifact.modules, dependencies: artifact.dependencies });
    tx.transferObjects([upgradeCap], signer.address);
    log('Publishing: waiting for your wallet…');
    const { digest } = await signAndExecute({ transaction: tx });
    log(`Submitted ${digest}`);
    // Read the published package id from the effects.
    const res = await fetch(resolveChainRpcUrl('sui', network), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'sui_getTransactionBlock', params: [digest, { showObjectChanges: true }] })
    });
    const data = (await res.json()) as { result?: { objectChanges?: { type: string; packageId?: string }[] } };
    const packageId = data.result?.objectChanges?.find((c) => c.type === 'published')?.packageId ?? '';
    const net = network === 'localnet' ? null : network;
    return {
        address: packageId || `(see transaction ${digest})`,
        explorerUrl: net && packageId ? `https://suiscan.xyz/${net}/object/${packageId}` : undefined,
        transactions: net ? [`https://suiscan.xyz/${net}/tx/${digest}`] : [digest]
    };
}

/* ------------------------------------------------------------------- Aptos */

/** Submits the `0x1::code::publish_package_txn` payload the Aptos CLI built. */
export async function deployAptos(artifact: AptosArtifact, wallet: ConnectedWallet | null, network: Network, log: Log): Promise<DeployResult> {
    const signer = requireWallet(wallet, 'aptos', 'Aptos');
    log('Publishing: waiting for your wallet…');
    const { hash } = await signAndSubmitAptosTransaction(signer.id, {
        type: 'entry_function_payload',
        function: artifact.function_id,
        type_arguments: artifact.type_args,
        arguments: artifact.args.map((a) => a.value)
    });
    log(`Submitted ${hash}`);
    const net = network === 'mainnet' ? '' : `?network=${network}`;
    return {
        address: signer.address,
        explorerUrl: network === 'localnet' ? undefined : `https://explorer.aptoslabs.com/account/${signer.address}/modules${net}`,
        transactions: [aptosExplorerUrl(network, hash) ?? hash]
    };
}

/* ---------------------------------------------------------------- Starknet */

/**
 * Declares the class (skipped when the network already has it), then deploys
 * an instance through the Universal Deployer with a random salt. Constructor
 * arguments are encoded against the class ABI.
 */
export async function deployStarknet(
    contract: StarknetContractArtifact,
    constructorArgs: string[],
    wallet: ConnectedWallet | null,
    network: Network,
    log: Log
): Promise<DeployResult> {
    const signer = requireWallet(wallet, 'starknet', 'Starknet');
    if (network === 'localnet') throw new Error('Browser wallets cannot deploy to a local Starknet node. Switch to testnet or mainnet.');
    const { hash, CallData, constants, stark } = await loadStarknet();
    const provider = await getStarknetProvider(network);
    const request = await requestStarknetWallet(signer.id, network);

    const sierra = contract.sierra as Record<string, unknown>;
    const abi = typeof sierra.abi === 'string' ? JSON.parse(sierra.abi) : sierra.abi;
    const classHash = hash.computeContractClassHash({ ...sierra, abi } as never);
    const block = (await provider.getBlockWithTxHashes('latest')) as { starknet_version?: string };
    const compiledClassHash = hash.computeCompiledClassHash(contract.casm as never, block.starknet_version);
    const txs: string[] = [];

    let declared = true;
    try {
        await provider.getClassByHash(classHash);
    } catch {
        declared = false;
    }
    if (!declared) {
        log('Declaring the class: waiting for your wallet…');
        const res = (await request({
            type: 'wallet_addDeclareTransaction',
            params: {
                compiled_class_hash: compiledClassHash,
                class_hash: classHash,
                contract_class: {
                    sierra_program: sierra.sierra_program,
                    contract_class_version: sierra.contract_class_version,
                    entry_points_by_type: sierra.entry_points_by_type,
                    abi: JSON.stringify(abi)
                }
            }
        })) as { transaction_hash: string };
        log(`Declare submitted ${res.transaction_hash}`);
        await provider.waitForTransaction(res.transaction_hash);
        txs.push(res.transaction_hash);
    } else {
        log(`Class ${classHash} is already declared on ${network}.`);
    }

    const ctor = (abi as { type: string; inputs?: unknown[] }[]).find((i) => i.type === 'constructor');
    const ctorCalldata = ctor
        ? new CallData(abi).compile(
              'constructor',
              ((ctor.inputs ?? []) as { type: string }[]).map((input, i) => parseStarknetArg(constructorArgs[i] ?? '', input.type)) as never
          )
        : [];
    const salt = stark.randomAddress();
    // not_from_zero = 0: the address depends only on salt, class and calldata.
    const deployCalldata = [classHash, salt, '0x0', `0x${ctorCalldata.length.toString(16)}`, ...ctorCalldata.map((v) => `0x${BigInt(v).toString(16)}`)];
    const address = hash.calculateContractAddressFromHash(salt, classHash, ctorCalldata, 0);

    log('Deploying: waiting for your wallet…');
    const res = (await request({
        type: 'wallet_addInvokeTransaction',
        params: { calls: [{ contract_address: constants.UDC.ADDRESS, entry_point: constants.UDC.ENTRYPOINT, calldata: deployCalldata }] }
    })) as { transaction_hash: string };
    log(`Deploy submitted ${res.transaction_hash}`);
    const receipt = (await provider.waitForTransaction(res.transaction_hash)) as unknown as { execution_status?: string; revert_reason?: string };
    if (receipt.execution_status === 'REVERTED') throw new Error(receipt.revert_reason ?? 'Deployment reverted.');
    txs.push(res.transaction_hash);
    log(`Deployed ${address}`);
    return {
        address,
        explorerUrl: starknetAccountExplorerUrl(network, address),
        transactions: txs.map((h) => starknetTxExplorerUrl(network, h) ?? h)
    };
}
