import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

function readJson(path: string) {
  const resolved = resolve(path);
  if (!existsSync(resolved)) return null;
  return JSON.parse(readFileSync(resolved, 'utf8')) as Record<string, string>;
}

const serviceAccount = readJson(process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_SERVICE_ACCOUNT_PATH || '-gitignore/domain-register-app-demo-firebase-adminsdk-fbsvc-698c709985.json');
const configApp = readJson(process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_CONFIG_APP_PATH || '-gitignore/firebaseConfig-app.json');
const projectId = serviceAccount?.project_id;

const env = {
  NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY || configApp?.apiKey || '',
  NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_AUTH_DOMAIN || configApp?.authDomain || (projectId ? `${projectId}.firebaseapp.com` : ''),
  NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID || configApp?.projectId || projectId || '',
  NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL || configApp?.databaseURL || serviceAccount?.databaseURL || '',
  NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_STORAGE_BUCKET || configApp?.storageBucket || (projectId ? `${projectId}.firebasestorage.app` : ''),
  NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_MESSAGING_SENDER_ID || configApp?.messagingSenderId || '',
  NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_APP_ID || configApp?.appId || '',
  NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT: process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT || serviceAccount?.secret01 || '',
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env,
  output: 'standalone',
};

export default nextConfig;
