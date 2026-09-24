import { createConnector } from 'wagmi';
import { serializeTransaction, type Hex, type TransactionSerializable } from 'viem';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import Eth from '@ledgerhq/hw-app-eth';

/**
 * A wagmi Connector wrapping a Ledger hardware wallet over WebHID — wagmi
 * has no official Ledger connector (confirmed against current docs, only
 * injected/metaMask/coinbaseWallet/walletConnect/safe/etc ship in
 * @wagmi/connectors), so this is a from-scratch EIP-1193-shaped adapter
 * over @ledgerhq/hw-app-eth's device API.
 *
 * Only the operations Txio's execution path actually needs are implemented
 * (eth_requestAccounts/eth_accounts, eth_chainId, eth_sendTransaction via a
 * build-locally/sign-on-device/broadcast-via-RPC flow, personal_sign). A
 * transaction is built as an unsigned viem TransactionSerializable, its
 * unsigned RLP hex is sent to the device to sign, and the returned {v,r,s}
 * is used to re-serialize a complete signed transaction, which is then
 * broadcast over eth_sendRawTransaction against whatever RPC transport the
 * active wagmi chain config points at (the connector never talks to the
 * device for anything beyond producing a signature).
 */

const DEFAULT_DERIVATION_PATH = "44'/60'/0'/0/0";

export function ledgerConnector() {
    let transport: TransportWebHID | null = null;
    let eth: Eth | null = null;
    let address: Hex | null = null;

    const getEth = async (): Promise<Eth> => {
        if (eth) return eth;
        const supported = await TransportWebHID.isSupported();
        if (!supported) {
            throw new Error('WebHID is not supported in this browser. Use a recent Chrome/Edge over HTTPS or localhost.');
        }
        // Must run in a click handler — wagmi's connect() is always
        // triggered from a user click in WalletModal, so this is safe here.
        transport = await TransportWebHID.request();
        eth = new Eth(transport);
        return eth;
    };

    return createConnector<typeof window.ethereum>((config) => ({
        id: 'ledger',
        name: 'Ledger',
        type: 'hardware' as const,
        icon: undefined,

        async setup() {
            // Nothing to pre-initialize — the WebHID device picker only
            // opens on an explicit connect() call, not on page load.
        },

        async connect() {
            const client = await getEth();
            const result = await client.getAddress(DEFAULT_DERIVATION_PATH);
            address = result.address as Hex;
            const chainId = config.chains[0]?.id ?? 1;
            config.emitter.emit('connect', { accounts: [address], chainId });
            // wagmi's generic `withCapabilities` connect() overload doesn't
            // narrow cleanly for a connector that never returns capability
            // metadata — same `as never`-style escape the rest of this
            // codebase already uses for viem/wagmi generic friction (see
            // transactionService.ts/evmContract.ts).
            return { accounts: [address], chainId } as never;
        },

        async disconnect() {
            if (transport) {
                await transport.close().catch(() => {});
            }
            transport = null;
            eth = null;
            address = null;
            config.emitter.emit('disconnect');
        },

        async getAccounts() {
            return address ? [address] : [];
        },

        async getChainId() {
            return config.chains[0]?.id ?? 1;
        },

        async getProvider() {
            // Not a real EIP-1193 provider — Txio's execution path calls
            // wagmi's typed actions (sendTransaction, etc.), which call the
            // connector's own methods directly, not a raw `request()`.
            // Returning undefined here is intentional; getEth() above is
            // the actual device handle this connector uses internally.
            return undefined;
        },

        async isAuthorized() {
            return Boolean(address);
        },

        async switchChain({ chainId }) {
            const chain = config.chains.find((c) => c.id === chainId);
            if (!chain) throw new Error(`Chain ${chainId} is not configured.`);
            config.emitter.emit('change', { chainId });
            return chain;
        },

        onAccountsChanged() {
            // Ledger has no live account-change event over WebHID — the
            // user must reconnect to pick a different address.
        },

        onChainChanged(chainId) {
            config.emitter.emit('change', { chainId: Number(chainId) });
        },

        onDisconnect() {
            config.emitter.emit('disconnect');
        },

        /**
         * Not part of wagmi's Connector interface — Txio's EVM executor
         * (adapters/evmAdapter.ts) calls this directly for a Ledger-backed
         * wallet instead of going through wagmi's sendTransaction action,
         * since a hardware signer needs the sign-then-broadcast split this
         * method performs rather than a single opaque call.
         */
        async signAndSendTransaction(tx: TransactionSerializable, rpcUrl: string): Promise<Hex> {
            const client = await getEth();
            const unsignedHex = serializeTransaction(tx).slice(2); // drop 0x for hw-app-eth
            const { v, r, s } = await client.signTransaction(DEFAULT_DERIVATION_PATH, unsignedHex, null);

            const signedTx = serializeTransaction(tx, {
                r: `0x${r}` as Hex,
                s: `0x${s}` as Hex,
                v: BigInt(`0x${v}`)
            });

            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_sendRawTransaction',
                    params: [signedTx]
                })
            });
            const body = await response.json();
            if (body.error) {
                throw new Error(body.error.message || 'Ledger transaction broadcast failed.');
            }
            return body.result as Hex;
        }
    }));
}
