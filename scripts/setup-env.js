/**
 * Copy .env.example -> .env for each app folder (skips if .env already exists).
 * Run from repo root: node scripts/setup-env.js
 */
import { copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const APP_FOLDERS = ['backend', 'admin', 'bookie', 'frontend', 'frontend2', 'mobile-app'];

for (const folder of APP_FOLDERS) {
  const examplePath = join(root, folder, '.env.example');
  const envPath = join(root, folder, '.env');

  if (!existsSync(examplePath)) {
    console.warn(`[skip] ${folder}: no .env.example`);
    continue;
  }
  if (existsSync(envPath)) {
    console.log(`[skip] ${folder}/.env already exists`);
    continue;
  }

  copyFileSync(examplePath, envPath);
  console.log(`[ok]   created ${folder}/.env`);
}

console.log('\nEdit each .env with your secrets (especially backend MONGODB_URI and JWT_SECRET).');
