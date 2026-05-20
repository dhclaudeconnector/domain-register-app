# Domain Register App

Next.js App Router implementation for automating free/paid namespace domain registration through Cloudflare Zone creation and DigitalPlat DPDNS registration.

## Implemented

- Firebase Google Sign-In only.
- Firebase Realtime Database per-user domain and encrypted credentials storage.
- Mandatory Firebase key sanitization for domain keys.
- Dual-path API caller: browser direct fetch first, silent fallback to `/api/proxy/dpdns` or `/api/proxy/cloudflare` on CORS/network `TypeError`.
- Cloudflare service: verify credentials, create zone, lookup existing zone, delete zone, 429 retry.
- DPDNS service: list, register, update nameservers, delete, 500ms debounce/minimum interval.
- Register modal with 3-step state machine and Cloudflare rollback if DPDNS registration fails.
- Dashboard realtime domain list, copy nameservers, edit notes/status, delete warning with optional Cloudflare Zone deletion.
- Settings page with masked DPDNS/Cloudflare credentials and encrypted save.
- Coinbase-style design tokens, responsive sidebar drawer/collapsed/full layouts.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Fill all Firebase variables and `NEXT_PUBLIC_ENCRYPT_SALT` before running. Enable Google provider in Firebase Authentication and deploy `database.rules.json` to Realtime Database.


## Tests

```bash
npm run smoke
npm run test
npm run test:coverage
```

- Unit/component/API route tests live in `__tests__/`.
- Vitest config lives in `vitest.config.ts`; global test mocks/setup live in `test/setup.ts`.
- Full checklist and scenario matrix live in `TEST_PLAN.md`.

## HTTP request suite

Manual API checks live in `http/` and read variables directly from `.env` / `.env.local` with `{{$dotenv VAR_NAME}}`. Copy `.env.example`, fill the `*_TEST_*` variables, run `npm run dev`, then execute requests from your HTTP client.

Destructive requests are clearly marked in the `.http` files. DPDNS delete puts domains into pendingdelete, disables DNS immediately, and releases the domain after 7 days.

## Firebase rules

```bash
firebase deploy --only database
```

## Smoke check

```bash
npm run smoke
```

## Vercel

Add every `NEXT_PUBLIC_*` variable from `.env.example` to Vercel Project Settings → Environment Variables, then deploy.

## Security note

Credentials are encrypted client-side with `NEXT_PUBLIC_ENCRYPT_SALT + uid` before storage. This is suitable for the MVP described in the spec. For higher assurance, move secret handling to Firebase Functions or a dedicated backend so decrypted provider credentials never live in the browser.
