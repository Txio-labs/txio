import { describe, expect, it } from 'vitest';
import { curlToRpcRequest, parseCurl, parseImportFile } from './importRequest';

describe('parseCurl', () => {
  it('parses method, url, headers, and JSON body from a typical curl command', () => {
    const curl = `curl -X POST https://fullnode.mainnet.sui.io:443 -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"suix_getAllBalances","params":["0xabc"]}'`;

    const parsed = parseCurl(curl);

    expect(parsed.method).toBe('POST');
    expect(parsed.url).toBe('https://fullnode.mainnet.sui.io:443');
    expect(parsed.headers['Content-Type']).toBe('application/json');
    expect(parsed.body).toBe(
      '{"jsonrpc":"2.0","id":1,"method":"suix_getAllBalances","params":["0xabc"]}'
    );
  });

  it('handles multi-line curl commands with backslash continuations', () => {
    const curl = `curl --location 'https://fullnode.testnet.sui.io:443' \\\n--header 'Content-Type: application/json' \\\n--data '{"method":"sui_getChainIdentifier","params":[]}'`;

    const parsed = parseCurl(curl);

    expect(parsed.url).toBe('https://fullnode.testnet.sui.io:443');
    expect(parsed.body).toBe('{"method":"sui_getChainIdentifier","params":[]}');
  });

  it('defaults method to POST when a data flag is present without -X', () => {
    const curl = `curl https://example.com -d '{"method":"foo","params":[]}'`;
    expect(parseCurl(curl).method).toBe('POST');
  });
});

describe('curlToRpcRequest', () => {
  it('extracts method and params from the JSON-RPC body', () => {
    const curl = `curl -X POST https://fullnode.mainnet.sui.io:443 -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"suix_getAllBalances","params":["0xabc"]}'`;

    expect(curlToRpcRequest(curl)).toEqual({
      name: 'suix_getAllBalances',
      method: 'suix_getAllBalances',
      params: ['0xabc']
    });
  });

  it('defaults params to an empty array when omitted', () => {
    const curl = `curl -X POST https://example.com -d '{"method":"sui_getChainIdentifier"}'`;
    expect(curlToRpcRequest(curl).params).toEqual([]);
  });

  it('throws when there is no data body', () => {
    expect(() => curlToRpcRequest('curl https://example.com')).toThrow(/data/i);
  });

  it('throws when the body is not valid JSON', () => {
    expect(() => curlToRpcRequest(`curl https://example.com -d 'not json'`)).toThrow(
      /valid JSON/i
    );
  });

  it('throws when the JSON body has no method field', () => {
    expect(() =>
      curlToRpcRequest(`curl https://example.com -d '{"params":[]}'`)
    ).toThrow(/method/i);
  });

  it('throws on an empty command', () => {
    expect(() => curlToRpcRequest('   ')).toThrow(/paste a curl/i);
  });
});

describe('parseImportFile', () => {
  it('parses a single JSON-RPC object', () => {
    const requests = parseImportFile(
      JSON.stringify({ method: 'sui_getObject', params: ['0x1'] })
    );

    expect(requests).toEqual([{ name: 'sui_getObject', method: 'sui_getObject', params: ['0x1'] }]);
  });

  it('parses an array of JSON-RPC objects', () => {
    const requests = parseImportFile(
      JSON.stringify([
        { method: 'sui_getObject', params: ['0x1'] },
        { method: 'sui_getChainIdentifier', params: [] }
      ])
    );

    expect(requests).toHaveLength(2);
    expect(requests[0].method).toBe('sui_getObject');
    expect(requests[1].method).toBe('sui_getChainIdentifier');
  });

  it('parses txio RequestItem-shaped exports using name + rpcParams', () => {
    const requests = parseImportFile(
      JSON.stringify({
        name: 'Get Balances',
        rpcParams: { method: 'suix_getAllBalances', params: ['0xabc'] }
      })
    );

    expect(requests).toEqual([
      { name: 'Get Balances', method: 'suix_getAllBalances', params: ['0xabc'] }
    ]);
  });

  it('extracts JSON-RPC entries from a HAR file, skipping non-RPC entries', () => {
    const har = {
      log: {
        entries: [
          { request: { postData: { text: '{"method":"sui_getObject","params":["0x1"]}' } } },
          { request: { postData: { text: 'not json' } } },
          { request: {} }
        ]
      }
    };

    const requests = parseImportFile(JSON.stringify(har));

    expect(requests).toEqual([{ name: 'sui_getObject', method: 'sui_getObject', params: ['0x1'] }]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseImportFile('not json')).toThrow(/valid JSON/i);
  });

  it('throws when nothing importable is found', () => {
    expect(() => parseImportFile(JSON.stringify({ foo: 'bar' }))).toThrow(/no json-rpc requests/i);
  });
});
