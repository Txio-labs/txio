import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 18+ (and notably Node 26) expose a built-in experimental `localStorage`
// global that resolves to `undefined` unless the process is started with
// `--localstorage-file`. That built-in accessor shadows the store jsdom would
// otherwise provide, so a bare `localStorage` reference is `undefined` and every
// test that touches storage throws before any application code runs. Install a
// self-contained in-memory Storage implementation on both `globalThis` and
// `window` so tests get a real, spec-shaped store regardless of the Node
// version or jsdom quirks.
class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length(): number {
        return this.store.size;
    }

    clear(): void {
        this.store.clear();
    }

    getItem(key: string): string | null {
        return this.store.has(key) ? this.store.get(key)! : null;
    }

    key(index: number): string | null {
        return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    setItem(key: string, value: string): void {
        this.store.set(key, String(value));
    }
}

function installStorage(name: 'localStorage' | 'sessionStorage'): void {
    const storage = new MemoryStorage();
    const descriptor: PropertyDescriptor = {
        value: storage,
        configurable: true,
        enumerable: false,
        writable: false
    };
    Object.defineProperty(globalThis, name, descriptor);
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, name, descriptor);
    }
}

installStorage('localStorage');
installStorage('sessionStorage');

afterEach(() => {
    cleanup();
    localStorage.clear();
});
