import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const DEFAULT_SERVICE_ACCOUNT_PATH = '-gitignore/domain-register-app-demo-firebase-adminsdk-fbsvc-698c709985.json';
export const DEFAULT_CONFIG_APP_PATH = '-gitignore/firebaseConfig-app.json';

export function serviceAccountPath() {
  return resolve(process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_SERVICE_ACCOUNT_PATH || DEFAULT_SERVICE_ACCOUNT_PATH);
}

export function configAppPath() {
  return resolve(process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_CONFIG_APP_PATH || DEFAULT_CONFIG_APP_PATH);
}

export function readServiceAccount() {
  const path = serviceAccountPath();
  if (!existsSync(path)) {
    throw new Error(`Missing Firebase service account file: ${path}`);
  }

  const serviceAccount = JSON.parse(readFileSync(path, 'utf8'));
  for (const field of ['project_id', 'client_email', 'private_key', 'databaseURL']) {
    if (!serviceAccount[field]) throw new Error(`Firebase service account missing ${field}`);
  }
  return { path, serviceAccount };
}

export function readConfigApp() {
  const path = configAppPath();
  if (!existsSync(path)) return { path, configApp: null };

  const configApp = JSON.parse(readFileSync(path, 'utf8'));
  return { path, configApp };
}

export function redact(value) {
  if (!value) return '';
  return `${String(value).slice(0, 6)}…${String(value).slice(-4)}`;
}
