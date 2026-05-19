// Loads .env from the api/ root using Node's built-in env-file loader.
// Safe to call multiple times — process.loadEnvFile is idempotent on missing keys.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const candidates = [resolve(here, '../.env'), resolve(here, '../../.env')];
for (const path of candidates) {
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}
