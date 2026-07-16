import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],

    resolve: {
        alias: {
            '@': fileURLToPath(
                new URL('./src', import.meta.url)
            )
        }
    },

    test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        include: [
            'src/**/*.{test,spec}.{ts,tsx}'
        ],
        clearMocks: true,
        restoreMocks: true
    }
});
