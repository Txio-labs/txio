// Cross-platform replacement for `rm -rf <dir> && mkdir -p <dir> && cp -R frontend/out/* <dir>`,
// which relies on Unix shell syntax that `cmd.exe` doesn't understand on Windows CI runners.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const frontendOutDir = path.join(rootDir, 'frontend', 'out');
const targets = ['desktop/dist', 'dist'];

for (const target of targets) {
    const targetDir = path.join(rootDir, target);
    rmSync(targetDir, { recursive: true, force: true });
    mkdirSync(targetDir, { recursive: true });
    cpSync(frontendOutDir, targetDir, { recursive: true });
}
