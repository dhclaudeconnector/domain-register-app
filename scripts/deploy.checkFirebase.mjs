import { existsSync } from 'node:fs';
import { readServiceAccount, redact } from './firebase-common.mjs';

const { path, serviceAccount } = readServiceAccount();

if (!existsSync('database.rules.json')) throw new Error('Missing database.rules.json');
if (!existsSync('firebase.json')) throw new Error('Missing firebase.json');

console.log(`Firebase project: ${serviceAccount.project_id}`);
console.log(`Database URL: ${serviceAccount.databaseURL}`);
console.log(`Client email: ${redact(serviceAccount.client_email)}`);
console.log(`Service account: ${path}`);
console.log('Firebase config check passed.');
