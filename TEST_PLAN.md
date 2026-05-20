# Test Plan

## Scope

Bộ test bao phủ các lớp quan trọng của codebase:

- `lib/*`: sanitize Firebase key, Zod validators, crypto encrypt/decrypt, utility helpers.
- `services/*`: dual-path fetch fallback, parse API response, DPDNS calls, Cloudflare calls/retry/reuse existing zone, Firebase service CRUD, credential encryption/decryption.
- `app/api/proxy/*`: validation, request forwarding, upstream error envelope cho DPDNS và Cloudflare proxy routes.
- `stores/*`: Zustand auth/credentials/domains/sidebar state.
- `components/*`: status badge, step indicator, masked secret auto-hide, domain row actions, credentials form, edit modal, delete dialog, slot type mapping.
- `.http`: manual/API smoke tests dùng trực tiếp biến từ `.env` / `.env.local`.

## Commands

```bash
npm run smoke
npm run test
npm run test:coverage
npm run test:watch
```

## Manual `.http` scenarios

1. `http/dpdns.http`
   - List domains.
   - Register domain.
   - Update nameservers.
   - Delete domain, có cảnh báo destructive/pendingdelete.
   - Lặp lại các call trên qua Next.js proxy.

2. `http/cloudflare.http`
   - Verify credentials.
   - Create zone.
   - Find/get zone.
   - Delete zone.
   - Lặp lại các call trên qua Next.js proxy.

3. `http/registration-flow.http`
   - Verify DPDNS.
   - Verify Cloudflare.
   - Create Cloudflare zone.
   - Copy nameservers vào env.
   - Register DPDNS.
   - Rollback Cloudflare zone khi registration fail.

## Destructive test warnings

- DPDNS `DELETE` đưa domain vào pendingdelete, DNS dừng ngay và release sau 7 ngày.
- Cloudflare `DELETE /zones/{zone_id}` xóa zone khỏi account.
- Chỉ chạy request destructive với test domain/test zone.
