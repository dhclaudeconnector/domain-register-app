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

Fill all Firebase variables and `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT` before running. Enable Google provider in Firebase Authentication and deploy `database.rules.json` to Realtime Database.

## Docker Deployment

Bạn có thể chạy ứng dụng bằng Docker theo hai cách:

### Cách 1: Sử dụng Docker Compose (Khuyến nghị)
Sao chép cấu hình môi trường và khởi chạy ứng dụng:
```bash
cp .env.example .env.local
# Điền đầy đủ các biến môi trường vào .env.local
# Vì docker compose build sử dụng biến từ file .env để truyền build arguments, hãy sao chép hoặc tạo file .env:
cp .env.local .env
docker compose up --build
```
Ứng dụng sẽ chạy tại `http://localhost:3000`.

### Cách 2: Sử dụng Docker CLI trực tiếp
1. Build image với các build arguments cần thiết (Next.js bake các biến `NEXT_PUBLIC_*` vào client bundle khi build):
```bash
docker build -t domain-register-app \
  --build-arg NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY="your_api_key" \
  --build-arg NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_AUTH_DOMAIN="your_auth_domain" \
  --build-arg NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID="your_project_id" \
  --build-arg NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL="your_database_url" \
  --build-arg NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_STORAGE_BUCKET="your_storage_bucket" \
  --build-arg NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_MESSAGING_SENDER_ID="your_sender_id" \
  --build-arg NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_APP_ID="your_app_id" \
  --build-arg NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT="your_encrypt_salt" \
  .
```

2. Chạy container:
```bash
docker run -p 3000:3000 --env-file .env.local domain-register-app
```



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

Credentials are encrypted client-side with `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT + uid` before storage. This is suitable for the MVP described in the spec. For higher assurance, move secret handling to Firebase Functions or a dedicated backend so decrypted provider credentials never live in the browser.
