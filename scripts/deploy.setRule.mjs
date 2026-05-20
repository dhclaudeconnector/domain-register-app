import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readServiceAccount } from './firebase-common.mjs';

const { serviceAccount } = readServiceAccount();
const rules = JSON.parse(readFileSync('database.rules.json', 'utf8'));

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(header)}.${base64url(claim)}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(serviceAccount.private_key, 'base64url');
  const assertion = `${unsigned}.${signature}`;
  const response = await fetch(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) throw new Error(`Token request failed: ${response.status} ${await response.text()}`);
  return (await response.json()).access_token;
}

const databaseUrl = serviceAccount.databaseURL?.replace(/\/$/, '');
if (!databaseUrl) throw new Error('Firebase service account missing databaseURL');

const accessToken = await getAccessToken();
const response = await fetch(`${databaseUrl}/.settings/rules.json`, {
  method: 'PUT',
  headers: {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify(rules),
});

if (!response.ok) throw new Error(`Deploy rules failed: ${response.status} ${await response.text()}`);
console.log(`Realtime Database rules deployed: ${serviceAccount.project_id}`);
