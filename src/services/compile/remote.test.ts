import { afterEach, describe, expect, it, vi } from 'vitest';

const load = async () => {
    vi.resetModules();
    return import('./remote');
};

describe('COMPILER_URL', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('uses NEXT_PUBLIC_COMPILER_URL when set', async () => {
        vi.stubEnv('NEXT_PUBLIC_COMPILER_URL', 'https://compiler.example.com/');
        expect((await load()).COMPILER_URL).toBe('https://compiler.example.com');
    });

    it('falls back to a local compiler in development', async () => {
        vi.stubEnv('NEXT_PUBLIC_COMPILER_URL', '');
        vi.stubEnv('NODE_ENV', 'development');
        expect((await load()).COMPILER_URL).toBe('http://localhost:8090');
    });

    it('has no compiler in a production build without the variable, and says so without a request', async () => {
        vi.stubEnv('NEXT_PUBLIC_COMPILER_URL', '');
        vi.stubEnv('NODE_ENV', 'production');
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const remote = await load();
        expect(remote.COMPILER_URL).toBeNull();
        await expect(remote.getToolchains()).rejects.toThrow('Compiling isn’t available on this site yet.');
        await expect(remote.compileRemote('stellar', { name: 'x', source: '' })).rejects.toBeInstanceOf(remote.CompilerUnavailableError);
        expect(fetchMock).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
    });
});
