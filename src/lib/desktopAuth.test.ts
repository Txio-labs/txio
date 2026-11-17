import { describe, expect, it, beforeEach } from 'vitest';
import {
    clearDesktopSignIn,
    desktopAppLink,
    pendingVerifier,
    readDesktopAuthRequest,
    startDesktopSignIn
} from './desktopAuth';

const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('desktop sign-in handoff', () => {
    beforeEach(() => clearDesktopSignIn());

    it('accepts only well-formed requests from the desktop app', () => {
        expect(readDesktopAuthRequest(`?challenge=${challenge}&state=abcdefghijklmnop`)).toEqual({
            challenge,
            state: 'abcdefghijklmnop'
        });
        expect(readDesktopAuthRequest(`?challenge=${challenge}`)).toBeNull();
        expect(readDesktopAuthRequest('?challenge=short&state=abcdefghijklmnop')).toBeNull();
        expect(readDesktopAuthRequest(`?challenge=${challenge}&state=bad%20state%20value!!`)).toBeNull();
    });

    it('opens the website with an S256 challenge and keeps the verifier for the matching state', async () => {
        const url = new URL(await startDesktopSignIn());
        expect(url.pathname).toBe('/desktop-auth');
        const state = url.searchParams.get('state')!;
        const sent = url.searchParams.get('challenge')!;

        const verifier = pendingVerifier(state);
        expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
        const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier!)));
        const expected = btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        expect(sent).toBe(expected);

        expect(pendingVerifier('some-other-state')).toBeNull();
        expect(pendingVerifier()).toBe(verifier);
    });

    it('builds the app link the desktop shell handles', () => {
        expect(desktopAppLink('c'.repeat(43), 'abcdefghijklmnop')).toBe(
            `txio-desktop://auth?code=${'c'.repeat(43)}&state=abcdefghijklmnop`
        );
    });
});
