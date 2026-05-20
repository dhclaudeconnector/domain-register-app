import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'app/login/page.tsx',
  'app/page.tsx',
  'app/settings/page.tsx',
  'app/api/proxy/dpdns/route.ts',
  'app/api/proxy/cloudflare/route.ts',
  'lib/firebase-key.ts',
  'services/api-caller.ts',
  'services/firebase.service.ts',
  'components/domain/RegisterModal.tsx',
  'database.rules.json',
  'vitest.config.ts',
  'test/setup.ts',
  'TEST_PLAN.md',
  'http/dpdns.http',
  'http/cloudflare.http',
  'http/registration-flow.http',
  '__tests__/lib/firebase-key.test.ts',
  '__tests__/services/api-caller.test.ts',
  '__tests__/api/proxy/dpdns/route.test.ts',
  '__tests__/components/credentials-form.test.tsx',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`Missing ${file}`);
  }
}

const firebaseKey = readFileSync('lib/firebase-key.ts', 'utf8');
const apiCaller = readFileSync('services/api-caller.ts', 'utf8');
const firebaseService = readFileSync('services/firebase.service.ts', 'utf8');

for (const token of ['_dot_', '_dol_', '_hash_', '_lb_', '_rb_', '_sl_']) {
  if (!firebaseKey.includes(token)) throw new Error(`Firebase key sanitizer missing ${token}`);
}
if (!apiCaller.includes('callWithFallback') || !apiCaller.includes('proxyPath') || apiCaller.includes('fetch(directUrl')) {
  throw new Error('Proxy-only API caller is incomplete');
}
if (!firebaseService.match(/toFirebaseKey\(domain\.fqdn\)/) || !firebaseService.match(/toFirebaseKey\(fqdn\)/)) {
  throw new Error('FirebaseService must sanitize domain keys');
}



const packageJson = readFileSync('package.json', 'utf8');
for (const script of ['"test": "vitest run"', '"test:coverage": "vitest run --coverage"']) {
  if (!packageJson.includes(script)) throw new Error(`Missing package script ${script}`);
}

const httpDpdns = readFileSync('http/dpdns.http', 'utf8');
const httpCloudflare = readFileSync('http/cloudflare.http', 'utf8');
for (const dotenvToken of ['{{$dotenv DPDNS_TEST_TOKEN}}', '{{$dotenv CLOUDFLARE_TEST_API_KEY}}', '{{$dotenv NEXT_PUBLIC_APP_URL}}']) {
  if (!`${httpDpdns}
${httpCloudflare}`.includes(dotenvToken)) throw new Error(`HTTP suite missing dotenv token ${dotenvToken}`);
}

console.log('Smoke test passed.');
