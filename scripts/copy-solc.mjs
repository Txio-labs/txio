// Copies the Solidity compiler (solc-js, WebAssembly inside soljson.js) into
// public/vendor so the compile worker can load it from the app's own origin.
// It is never fetched from a third-party host at run time.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', 'solc', 'soljson.js');
const target = join(root, 'public', 'vendor', 'soljson.js');

if (!existsSync(source)) {
    console.error('copy-solc: node_modules/solc is missing. Run `npm install` first.');
    process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
const { version } = JSON.parse(readFileSync(join(root, 'node_modules', 'solc', 'package.json'), 'utf8'));
console.log(`copy-solc: solc ${version} -> public/vendor/soljson.js`);
