// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as sdk from '@stellar/stellar-sdk';
import { decodeStellarRpcResult, decodeStellarXdr, detectStellarXdrType, summarizeStellarEnvelope } from './xdr';

const { Account, Address, Contract, Keypair, Networks, TransactionBuilder, nativeToScVal, xdr } = sdk;

const CONTRACT = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
// Deterministic test keys (never funded anywhere).
const sender = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 1));
const receiver = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 2));

const buildCall = () =>
    new TransactionBuilder(new Account(sender.publicKey(), '41'), { fee: '100', networkPassphrase: Networks.TESTNET })
        .addOperation(
            new Contract(CONTRACT).call(
                'transfer',
                new Address(sender.publicKey()).toScVal(),
                new Address(receiver.publicKey()).toScVal(),
                nativeToScVal(12345678901234567890n, { type: 'i128' })
            )
        )
        .setTimeout(30)
        .build();

describe('summarizeStellarEnvelope', () => {
    it('spells out a contract call with strkeys and native arguments', () => {
        const tx = buildCall();
        const summary = summarizeStellarEnvelope(sdk, tx.toXDR(), Networks.TESTNET);
        expect(summary.hash).toBe(tx.hash().toString('hex'));
        expect(summary).toMatchObject({ kind: 'transaction', source: sender.publicKey(), fee: '100', sequence: '42', signatures: 0 });
        expect(summary.operations).toEqual([
            {
                type: 'invokeHostFunction',
                contract: CONTRACT,
                function: 'transfer',
                args: [sender.publicKey(), receiver.publicKey(), '12345678901234567890']
            }
        ]);
    });

    it('describes non-contract operations by their fields', () => {
        const tx = new TransactionBuilder(new Account(sender.publicKey(), '1'), { fee: '200', networkPassphrase: Networks.TESTNET })
            .addOperation(sdk.Operation.payment({ destination: receiver.publicKey(), asset: sdk.Asset.native(), amount: '2.5' }))
            .addMemo(sdk.Memo.text('rent'))
            .setTimeout(30)
            .build();
        const summary = summarizeStellarEnvelope(sdk, tx.toXDR(), Networks.TESTNET);
        expect(summary.memo).toBe('rent');
        expect(summary.operations[0]).toMatchObject({
            type: 'payment',
            details: { destination: receiver.publicKey(), asset: 'assetTypeNative', amount: '25000000' }
        });
    });
});

describe('decodeStellarXdr', () => {
    it('renders an envelope with readable leaves', () => {
        const decoded = decodeStellarXdr(sdk, 'TransactionEnvelope', buildCall().toXDR()) as {
            type: string;
            tx: { sourceAccount: string; seqNum: string; operations: { body: { hostFunction: unknown } }[] };
        };
        expect(decoded.type).toBe('envelopeTypeTx');
        expect(decoded.tx.sourceAccount).toBe(sender.publicKey());
        expect(decoded.tx.seqNum).toBe('42');
        expect(decoded.tx.operations[0].body.hostFunction).toMatchObject({
            type: 'hostFunctionTypeInvokeContract',
            contractAddress: CONTRACT,
            functionName: 'transfer',
            args: [sender.publicKey(), receiver.publicKey(), '12345678901234567890']
        });
    });

    it('decodes a contract value to its native form', () => {
        const value = nativeToScVal({ amount: 5n, to: receiver.publicKey() }, { type: { amount: ['symbol', 'i128'], to: ['symbol', 'address'] } });
        expect(decodeStellarXdr(sdk, 'ScVal', value.toXDR('base64'))).toEqual({ amount: '5', to: receiver.publicKey() });
    });

    it('throws when the input is not the named type', () => {
        expect(() => decodeStellarXdr(sdk, 'TransactionEnvelope', nativeToScVal(1).toXDR('base64'))).toThrow();
    });
});

describe('detectStellarXdrType', () => {
    it('recognises envelopes, ledger keys and contract values', () => {
        expect(detectStellarXdrType(sdk, buildCall().toXDR())).toBe('TransactionEnvelope');
        const ledgerKey = new Contract(CONTRACT).getFootprint();
        expect(detectStellarXdrType(sdk, ledgerKey.toXDR('base64'))).toBe('LedgerKey');
        expect(detectStellarXdrType(sdk, xdr.ScVal.scvSymbol('hello').toXDR('base64'))).toBe('ScVal');
    });

    it('returns null for input that is not XDR', () => {
        expect(detectStellarXdrType(sdk, 'aGVsbG8gd29ybGQ=')).toBeNull();
    });
});

describe('decodeStellarRpcResult', () => {
    it('decodes the XDR fields of a getTransaction-shaped result and leaves the rest', () => {
        const envelopeXdr = buildCall().toXDR();
        const decoded = decodeStellarRpcResult(sdk, { status: 'SUCCESS', ledger: 7, envelopeXdr }) as Record<string, unknown>;
        expect(decoded.status).toBe('SUCCESS');
        expect(decoded.ledger).toBe(7);
        expect((decoded.envelopeXdr as { type: string }).type).toBe('envelopeTypeTx');
    });

    it('decodes getLedgerEntries keys and getEvents topics by their siblings', () => {
        const key = new Contract(CONTRACT).getFootprint().toXDR('base64');
        const topic = xdr.ScVal.scvSymbol('transfer').toXDR('base64');
        const value = nativeToScVal(9n, { type: 'i128' }).toXDR('base64');
        const decoded = decodeStellarRpcResult(sdk, {
            entries: [{ key, lastModifiedLedgerSeq: 3 }],
            events: [{ topic: [topic], value }]
        }) as { entries: { key: { type: string } }[]; events: { topic: unknown[]; value: unknown }[] };
        expect(decoded.entries[0].key.type).toBe('contractData');
        expect(decoded.events[0]).toEqual({ topic: ['transfer'], value: '9' });
    });

    it('returns null when nothing in the result is XDR', () => {
        expect(decodeStellarRpcResult(sdk, { status: 'healthy', latestLedger: 100 })).toBeNull();
    });
});
