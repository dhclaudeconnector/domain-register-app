# Domain Register App — Agent Specification
> **Version:** 1.0 — Consolidated from 10-section spec  
> **Target:** AI Coding Agents (full implementation guide)  
> **Stack:** Next.js (latest) · TypeScript · Tailwind · Firebase · Vercel  
> **Design System:** Coinbase-style (DESIGN.md tokens)

---

## 0. OVERVIEW

Ứng dụng web tự động hóa quy trình đăng ký domain miễn phí từ DigitalPlat DPDNS:

1. User lưu API credentials (DPDNS Token + Cloudflare Email/API Key)
2. Nhập tên domain muốn đăng ký
3. App tự động: tạo Cloudflare Zone → lấy nameservers → đăng ký DPDNS
4. Lưu toàn bộ vào Firebase Realtime Database, hiển thị realtime

---

## 1. TECH STACK

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (latest, App Router) |
| Language | TypeScript (latest) |
| Styling | Tailwind CSS (latest) + CSS Variables (Coinbase tokens) |
| Components | shadcn/ui (latest) |
| State | Zustand (latest) |
| Database | Firebase Realtime Database (Spark free tier) |
| Auth | Firebase Authentication (Google Sign-In only) |
| Forms | react-hook-form + Zod |
| Encryption | CryptoJS (AES-256-GCM) |
| Deploy | Vercel (free tier) |
| Icons | Lucide React (latest) |

> **Version pinning:** KHÔNG pin version cụ thể trong `package.json`. Dùng `"next": "latest"` v.v.

---

## 2. PROJECT STRUCTURE

```
domain-register-app/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx                    # Dashboard — domain list
│   │   └── settings/page.tsx           # Settings — credentials
│   ├── api/
│   │   ├── accounts/
│   │   │   └── route.ts                # Backend Accounts Manager API
│   │   └── proxy/
│   │       ├── dpdns/route.ts          # DPDNS CORS proxy
│   │       └── cloudflare/route.ts     # Cloudflare CORS proxy
│   ├── globals.css                     # Coinbase design tokens (CSS vars)
│   └── layout.tsx
├── components/
│   ├── ui/                             # shadcn/ui base
│   ├── layout/
│   │   ├── Sidebar.tsx                 # Collapsible sidebar (mobile hidden)
│   │   ├── TopNav.tsx
│   │   └── StatusBadge.tsx
│   ├── domain/
│   │   ├── DomainRow.tsx
│   │   ├── RegisterModal.tsx
│   │   ├── EditDomainModal.tsx
│   │   ├── ConfirmDeleteDialog.tsx
│   │   └── StepIndicator.tsx
│   └── credentials/
│       ├── CredentialsForm.tsx
│       └── MaskedInput.tsx
├── services/
│   ├── api-caller.ts                   # Dual-path fetch wrapper
│   ├── dpdns.service.ts
│   ├── cloudflare.service.ts
│   ├── firebase.service.ts
│   └── credentials.service.ts
├── stores/
│   └── app.store.ts                    # Zustand store
├── lib/
│   ├── firebase.ts
│   ├── crypto.ts                       # AES-256 encrypt/decrypt
│   ├── firebase-key.ts                 # ⚠️ Key sanitization utils
│   └── validators.ts                   # Zod schemas
├── types/
│   └── index.ts
└── .env.local
```

---

## 3. DESIGN SYSTEM — COINBASE TOKENS

### 3.1 CSS Variables (globals.css)

```css
:root {
  --color-primary: #0052ff;
  --color-primary-active: #003ecc;
  --color-primary-disabled: #a8b8cc;
  --color-ink: #0a0b0d;
  --color-body: #5b616e;
  --color-muted: #7c828a;
  --color-muted-soft: #a8acb3;
  --color-hairline: #dee1e6;
  --color-hairline-soft: #eef0f3;
  --color-canvas: #ffffff;
  --color-surface-soft: #f7f7f7;
  --color-surface-strong: #eef0f3;
  --color-surface-dark: #0a0b0d;
  --color-surface-dark-elevated: #16181c;
  --color-on-primary: #ffffff;
  --color-on-dark: #ffffff;
  --color-on-dark-soft: #a8acb3;
  --color-semantic-up: #05b169;
  --color-semantic-down: #cf202f;

  --rounded-xs: 4px;
  --rounded-sm: 8px;
  --rounded-md: 12px;
  --rounded-lg: 16px;
  --rounded-xl: 24px;
  --rounded-pill: 100px;
  --rounded-full: 9999px;
}
```

### 3.2 Typography (Font fallback — không có Coinbase font)

```css
/* Display headlines → Inter weight 400 */
/* Body/Nav/Button → Inter weight 400/600 */
/* Numbers → JetBrains Mono weight 500 */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
```

### 3.3 Design Rules

| Rule | Value |
|------|-------|
| Primary CTA | `background: var(--color-primary)`, `border-radius: var(--rounded-pill)`, height 44px |
| Cards | `border-radius: var(--rounded-xl)`, padding 32px |
| Asset icon | `border-radius: var(--rounded-full)`, size 32px |
| Section padding | 96px top/bottom |
| Domain rows | Coinbase `asset-row` style: transparent bg, 1px hairline divider |
| Status badge | `border-radius: var(--rounded-pill)`, semantic colors |

### 3.4 Dark Hero (Login Page)

```
Background: var(--color-surface-dark) = #0a0b0d
Text: var(--color-on-dark) = #ffffff
CTA: button-primary pill
```

### 3.5 Light Dashboard

```
Background: var(--color-canvas) = #ffffff
Cards: feature-card style (white, rounded-xl, 32px padding, 1px hairline)
Domain list: asset-row style
```

---

## 4. RESPONSIVE & LAYOUT

### 4.1 Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| Mobile | < 768px | Sidebar hidden, hamburger menu, single column |
| Tablet | 768–1024px | Sidebar collapsible (icon-only mode) |
| Desktop | > 1024px | Sidebar expanded (240px), content area fill |

### 4.2 Sidebar

```tsx
// Sidebar phải ẩn/hiện được qua state
// Mobile: drawer (absolute, z-50, slide-in từ trái)
// Tablet: icon-only mode (64px width, tooltip on hover)
// Desktop: full expanded (240px, text + icon)

const [sidebarOpen, setSidebarOpen] = useState(false);
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
```

**Sidebar nav items:**
- Dashboard (domain list) — icon: Globe
- Settings (credentials) — icon: Settings
- User profile + Logout — bottom của sidebar

### 4.3 TopNav

```
Height: 64px
Background: var(--color-canvas) (light) hoặc var(--color-surface-dark) (dark)
Left: hamburger (mobile) + logo
Right: user avatar + dropdown (Profile / Logout)
```

---

## 5. FIREBASE REALTIME DATABASE

### 5.1 Data Structure

```json
{
  "users": {
    "<uid>": {
      "settings": {
        "accounts": {
          "<accountId>": {
            "id": "acc_default",
            "name": "Default Account",
            "dpdns": {
              "token": "<encrypted>",
              "verified": true,
              "verified_at": 1716192000000
            },
            "cloudflare": {
              "email": "user@example.com",
              "api_key": "<encrypted>",
              "account_id": "01a7362d577a6c3019a474fd6f485823",
              "verified": true,
              "verified_at": 1716192000000
            },
            "created_at": 1716192000000,
            "updated_at": 1716192000000
          }
        },
        "updated_at": 1716192000000
      },
      "domains": {
        "<sanitized-domain-key>": {
          "name": "myapp",
          "namespace": ".dpdns.org",
          "fqdn": "myapp.dpdns.org",
          "cloudflare": {
            "zone_id": "023e105f4ecef8ad9ca31a8372d0c353",
            "nameservers": [
              "anna.ns.cloudflare.com",
              "bob.ns.cloudflare.com"
            ]
          },
          "dpdns": {
            "registered": true,
            "registration_response": "success"
          },
          "status": "active",
          "notes": "",
          "created_at": 1716192000000,
          "updated_at": 1716192000000,
          "credentialAccountId": "acc_default"
        }
      }
    }
  }
}
```

### 5.2 ⚠️ CRITICAL — Firebase Key Sanitization

Firebase Realtime Database **KHÔNG hỗ trợ** các ký tự sau trong key:
```
. $ # [ ] /
```

Domain names thường chứa `.` (e.g. `myapp.dpdns.org`) — **PHẢI sanitize trước khi dùng làm key**.

```typescript
// lib/firebase-key.ts
// ⚠️ BẮT BUỘC dùng hàm này mọi nơi lưu domain key vào Firebase

/**
 * Sanitize một string để dùng làm Firebase Realtime DB key.
 * Thay thế: . → _dot_  /  $ → _dol_  /  # → _hash_  /  [ → _lb_  /  ] → _rb_
 */
export function toFirebaseKey(value: string): string {
  return value
    .replace(/\./g, '_dot_')
    .replace(/\$/g, '_dol_')
    .replace(/\#/g, '_hash_')
    .replace(/\[/g, '_lb_')
    .replace(/\]/g, '_rb_')
    .replace(/\//g, '_sl_');
}

/**
 * Reverse — chuyển Firebase key về giá trị gốc để hiển thị
 */
export function fromFirebaseKey(key: string): string {
  return key
    .replace(/_dot_/g, '.')
    .replace(/_dol_/g, '$')
    .replace(/_hash_/g, '#')
    .replace(/_lb_/g, '[')
    .replace(/_rb_/g, ']')
    .replace(/_sl_/g, '/');
}

// Ví dụ:
// toFirebaseKey("myapp.dpdns.org")  → "myapp_dot_dpdns_dot_org"
// fromFirebaseKey("myapp_dot_dpdns_dot_org") → "myapp.dpdns.org"
```

**Quy tắc áp dụng:**
- `FirebaseService.saveDomain()` → key của domain node = `toFirebaseKey(fqdn)`
- `FirebaseService.deleteDomain()` → key = `toFirebaseKey(fqdn)`
- `FirebaseService.updateDomain()` → key = `toFirebaseKey(fqdn)`
- Khi đọc list từ `onValue()` → dùng `fromFirebaseKey()` để reverse nếu cần
- Field `fqdn` bên trong object vẫn lưu giá trị gốc (e.g. `"myapp.dpdns.org"`)

### 5.3 Firebase Security Rules

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        "settings": {
          "accounts": {
            ".read": "auth != null && auth.uid === $uid",
            ".write": "auth != null && auth.uid === $uid"
          }
        },
        "domains": {
          ".indexOn": ["created_at", "status"],
          "$domainId": {
            ".validate": "newData.hasChildren(['name', 'namespace', 'fqdn', 'status', 'created_at'])"
          }
        }
      }
    }
  }
}
```


### 5.4 Domain Status State Machine

```
PENDING → ACTIVE   (Cloudflare OK + DPDNS OK)
ACTIVE  → DELETED  (User xóa)
PENDING → ERROR    (API thất bại, sau rollback)
```

---

## 6. EXTERNAL APIS

### 6.1 DigitalPlat DPDNS API

**Base URL:** `https://domain-api.digitalplat.org/api/v1`  
**Auth:** `Authorization: Bearer <dp_live_xxxxx>`  
**Content-Type:** `application/json`  
**Response Envelope:** `{ "success": boolean, "data": {...}, "meta": {...} }`

| Endpoint | Method | Path | Mô tả |
|----------|--------|------|-------|
| EP-DPDNS-01 | GET | `/api/v1/domains` | List tất cả domain |
| EP-DPDNS-02 | POST | `/api/v1/domains` | Đăng ký domain mới |
| EP-DPDNS-03 | PATCH | `/api/v1/domains/{domain}/nameservers` | Cập nhật NS |
| EP-DPDNS-04 | DELETE | `/api/v1/domains/{domain}` | Xóa domain |

**EP-DPDNS-02 Register — Request Body:**
```json
{
  "domain": "myapp.dpdns.org",
  "slot_type": "free",
  "nameservers": ["anna.ns.cloudflare.com", "bob.ns.cloudflare.com"]
}
```

**slot_type mapping:**
| Namespace | slot_type |
|-----------|-----------|
| `.dpdns.org` | `"free"` |
| `.qzz.io` | `"free"` |
| `.us.kg` | `"paid"` hoặc `"subscription"` |
| `.xx.kg` | `"paid"` hoặc `"subscription"` |

> ⚠️ `slot_type` phải được auto-detect từ namespace, không để user nhập tay.

**EP-DPDNS-04 Delete — Lưu ý:**
> Delete đưa domain về `pendingdelete`. DNS tắt ngay, domain release sau **7 ngày**. App phải hiện cảnh báo này trước khi user xác nhận xóa.

### 6.2 Cloudflare API v4

**Base URL:** `https://api.cloudflare.com/client/v4`  
**Auth Headers:** `X-Auth-Email` + `X-Auth-Key`

| Endpoint | Method | Path | Mô tả |
|----------|--------|------|-------|
| EP-CF-01 | GET | `/user` | Verify credentials |
| EP-CF-02 | POST | `/zones` | Tạo zone mới |
| EP-CF-03 | GET | `/zones/{zone_id}` | Lấy zone details |
| EP-CF-04 | DELETE | `/zones/{zone_id}` | Xóa zone (rollback) |

**EP-CF-02 Create Zone — Request Body:**
```json
{
  "name": "myapp.dpdns.org",
  "account": { "id": "<account_id>" },
  "type": "full"
}
```

**Response chứa nameservers:**
```json
{
  "success": true,
  "result": {
    "id": "023e105f4ecef8ad9ca31a8372d0c353",
    "name": "myapp.dpdns.org",
    "name_servers": ["anna.ns.cloudflare.com", "bob.ns.cloudflare.com"],
    "status": "pending"
  }
}
```

> ✅ Cloudflare chấp nhận subdomain `.dpdns.org` làm zone. `name_servers[]` trong response này là giá trị truyền vào DPDNS.

---

## 7. CORS DUAL-PATH STRATEGY

Cả DPDNS và Cloudflare API đều có thể bị CORS block từ browser. Áp dụng **dual-path**: thử direct trước, nếu CORS error thì fallback về Next.js proxy.

```
Browser
  ├─► [1] Direct fetch → external API
  │         ├── 200 OK ──────────────────► Done ✅
  │         └── CORS Error (TypeError)
  │                   ▼
  └─► [2] fetch /api/proxy/dpdns | /api/proxy/cloudflare
              (server-side, no CORS) ──► Done ✅
```

### 7.1 Next.js API Route — DPDNS Proxy

```typescript
// app/api/proxy/dpdns/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { endpoint, method, body, token } = await req.json();
  const res = await fetch(`https://domain-api.digitalplat.org${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

### 7.2 Next.js API Route — Cloudflare Proxy

```typescript
// app/api/proxy/cloudflare/route.ts
export async function POST(req: NextRequest) {
  const { endpoint, method, body, email, apiKey } = await req.json();
  const res = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, {
    method,
    headers: {
      'X-Auth-Email': email,
      'X-Auth-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

### 7.2.1 Next.js API Route — Backend Accounts Manager

API cho phép thêm/cập nhật thông tin tài khoản credentials từ backend bên ngoài, kiểm tra email trùng và ghi log theo ngày.

```typescript
// app/api/accounts/route.ts
import { NextResponse } from 'next/server';
import { CredentialsService } from '@/services/credentials.service';
import { db } from '@/lib/firebase';
import { ref as dbRef, set } from 'firebase/database';

async function writeDailyLog(action: string, status: 'success' | 'failed', details: Record<string, any>) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const logRef = dbRef(db, `logs/${today}/${timestamp}`);
    await set(logRef, { action, status, timestamp, ...details });
  } catch (logError) {
    console.error('Failed to write daily log:', logError);
  }
}

export async function POST(request: Request) {
  const secretKey = process.env.BACKEND_API_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'API Secret Key is not configured on the server.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const clientToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  if (!clientToken || clientToken !== secretKey) {
    await writeDailyLog('AUTH_FAILED', 'failed', { ip, message: 'Unauthorized access attempt.' });
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const { userId, service, name, email, token, apiKey, accountId } = body;

  if (!userId || !service || !email) {
    return NextResponse.json({ error: 'Missing required fields (userId, service, email).' }, { status: 400 });
  }

  try {
    const existingAccounts = await CredentialsService.load(userId);
    const existing = existingAccounts.find(acc => acc.cloudflareEmail?.toLowerCase() === email.toLowerCase());

    let resultId = '';
    let isUpdate = false;

    if (existing) {
      isUpdate = true;
      resultId = existing.id;
      if (service === 'dpdns') {
        if (!token) return NextResponse.json({ error: 'Missing DPDNS token.' }, { status: 400 });
        await CredentialsService.save(userId, { ...existing, name: name || existing.name, dpdnsToken: token }, { dpdns: true, cloudflare: existing.cloudflareVerified });
      } else {
        if (!apiKey || !accountId) return NextResponse.json({ error: 'Missing CF credentials.' }, { status: 400 });
        await CredentialsService.save(userId, { ...existing, name: name || existing.name, cloudflareEmail: email, cloudflareApiKey: apiKey, cloudflareAccountId: accountId }, { dpdns: existing.dpdnsVerified, cloudflare: true });
      }
    } else {
      if (service === 'dpdns') {
        if (!token) return NextResponse.json({ error: 'Missing DPDNS token.' }, { status: 400 });
        resultId = await CredentialsService.save(userId, { id: '', name: name || 'DPDNS Account', dpdnsToken: token, cloudflareEmail: email, cloudflareApiKey: '', cloudflareAccountId: '', dpdnsVerified: true, cloudflareVerified: false }, { dpdns: true, cloudflare: false });
      } else {
        if (!apiKey || !accountId) return NextResponse.json({ error: 'Missing CF credentials.' }, { status: 400 });
        resultId = await CredentialsService.save(userId, { id: '', name: name || 'Cloudflare Account', dpdnsToken: '', cloudflareEmail: email, cloudflareApiKey: apiKey, cloudflareAccountId: accountId, dpdnsVerified: false, cloudflareVerified: true }, { dpdns: false, cloudflare: true });
      }
    }

    const logAction = `${isUpdate ? 'UPDATE' : 'CREATE'}_${service.toUpperCase()}_ACCOUNT`;
    await writeDailyLog(logAction, 'success', { ip, userId, email, accountId: resultId });

    return NextResponse.json({ success: true, accountId: resultId, action: isUpdate ? 'updated' : 'created' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
```

### 7.3 Client-side Dual-Path Wrapper

```typescript
// services/api-caller.ts
export async function callWithFallback(
  directUrl: string,
  directHeaders: Record<string, string>,
  proxyPath: string,
  proxyBody: object,
  method = 'GET',
  body?: object
): Promise<Response> {
  try {
    const res = await fetch(directUrl, {
      method,
      headers: directHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    return res;
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      // CORS / network block → fallback
      return fetch(proxyPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyBody),
      });
    }
    throw err;
  }
}
```

---

## 8. SECURITY

### 8.1 Credentials Encryption

```typescript
// lib/crypto.ts
import CryptoJS from 'crypto-js';

// Key = NEXT_PUBLIC_ENCRYPT_SALT + user.uid
// KHÔNG dùng chỉ UID hoặc chỉ salt
const getKey = (uid: string) =>
  `${process.env.NEXT_PUBLIC_ENCRYPT_SALT}:${uid}`;

export const encrypt = (plain: string, uid: string): string =>
  CryptoJS.AES.encrypt(plain, getKey(uid)).toString();

export const decrypt = (cipher: string, uid: string): string =>
  CryptoJS.AES.decrypt(cipher, getKey(uid)).toString(CryptoJS.enc.Utf8);
```

### 8.2 Credentials Storage Rules

- ✅ Lưu encrypted trong Firebase: `/users/{uid}/settings/accounts/{accountId}`
- ❌ KHÔNG lưu trong `localStorage` / `sessionStorage` / URL params
- ✅ Giữ decrypted trong Zustand memory (React state) hoặc loading context
- ✅ Clear state khi user logout
- ✅ Hiển thị masked: `eyJhbG...****...xYz`, hỗ trợ eye icon toggling

### 8.3 Input Validation (Zod)

```typescript
// lib/validators.ts
import { z } from 'zod';

export const subdomainSchema = z
  .string()
  .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/, 'Invalid subdomain format')
  .max(63);

export const namespaceSchema = z.enum(['.dpdns.org', '.us.kg', '.qzz.io', '.xx.kg']);

export const credentialAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(50),
  dpdnsToken: z.string().min(1, 'DPDNS Token is required').trim(),
  cloudflareEmail: z.string().email('Invalid email address'),
  cloudflareApiKey: z.string().min(1, 'Cloudflare API Key is required').trim(),
  cloudflareAccountId: z.string().optional(),
});
```

### 8.4 Logger & API Diagnostics

Hệ thống cung cấp cơ chế ghi log chuẩn hóa cho các API giao tiếp với bên thứ ba (Cloudflare và DPDNS).

- **Biến môi trường:** `NEXT_PUBLIC_LOG_LEVEL` (giá trị: `debug`, `info`, `warn`, `error`, `none`).
- **An toàn bảo mật:** Tự động ẩn (mask) các thông tin nhạy cảm trong payload (như token, apiKey, Authorization headers) trước khi in ra log.
- **Console Styling:** Sử dụng màu sắc khác nhau cho từng caption dịch vụ khi chạy ở client (`[Cloudflare API]`, `[DPDNS API]`).
- **API Caller Integration:** Wrapper `callWithFallback` chịu trách nhiệm tự động ghi log thông tin Request và Response.

---

## 9. COMPONENT SPECIFICATIONS

### 9.1 Login Page (`/login`)

```
Layout: dark hero band (surface-dark background)
Center: logo + "Sign in with Google" pill button (button-primary)
Google button: height 56px (button-pill-cta size), icon + text
Không có form khác — Google OAuth only
```

### 9.2 Dashboard Page (`/`)

```
Layout: Sidebar (desktop/tablet) + main content area
Header: "Your Domains" title + "Register New Domain" button-primary pill
Domain list: asset-row style, sorted by created_at DESC
Empty state: Icon + "No domains yet" + CTA button
Realtime: Firebase onValue() listener
```

### 9.3 Domain Row (asset-row style)

```
[●status] [domain.name.tld]    [copy-icon nameservers]    [edit-icon] [delete-icon]
           namespace badge                                  
           created: date time
```

- Status dot: green = active, yellow = pending, red = error/pendingdelete
- Nameserver: click icon để copy vào clipboard
- Edit / Delete icons: Lucide `Pencil` / `Trash2`

### 9.4 Register Modal

```
Title: "Register New Domain"
Fields:
  - Subdomain input + namespace dropdown (.dpdns.org | .us.kg | .qzz.io | .xx.kg)
  - Auto-show slot_type warning cho paid namespaces
  - Preview: "myapp.dpdns.org"

Step Indicator (3 steps):
  ① Create Cloudflare Zone
  ② Extract Nameservers  
  ③ Register on DPDNS

Each step: ⏳ Processing | ✅ Done | ❌ Failed

Buttons: [Cancel] [Register →] (disabled khi đang xử lý)
```

### 9.5 StepIndicator Component

```tsx
interface Step {
  label: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  detail?: string; // e.g. "Zone ID: 023e105f..."
}
```

### 9.6 Settings Page (`/settings`)

```
Layout: feature-card style (white, rounded-xl, 32px padding)

Danh sách tài khoản (Accounts Dashboard):
  - Hiển thị danh sách accounts dạng card/row.
  - Mỗi hàng hiển thị: Account Name, Cloudflare Email, và các badge trạng thái connection (DPDNS / CF).
  - Có nút "Edit" và "Delete" cho từng account.
  - Nút "Add Account" mở form nhập thông tin tài khoản mới.

Form tài khoản (Account Form - Thêm/Sửa):
  - Trường: Account Friendly Name (text)
  - Trường: DPDNS Token (masked input + eye icon) + nút [Test DPDNS]
  - Trường: Cloudflare Email (text)
  - Trường: Cloudflare Global API Key (masked input + eye icon) + nút [Test Cloudflare]
  - Trường: Cloudflare Account ID (optional, tự động lấy khi test nếu trống)
  - Nút [Save] kiểm tra hợp lệ của cả 2 API trước khi mã hóa AES-256 và lưu vào database.
```

### 9.7 Confirm Delete Dialog

```
Title: "Delete Domain"
Body: "Are you sure you want to remove myapp.dpdns.org?"
Warning: "⚠️ Deleting from DPDNS will put it in pendingdelete status. DNS stops immediately, domain released after 7 days."

Chọn tài khoản thực thi (API Cleanup Account):
  - Dropdown chọn tài khoản dùng để gọi API delete (mặc định chọn tài khoản liên kết cũ).
  - Cảnh báo nếu tài khoản liên kết cũ bị thiếu/đã bị xóa, cho phép chọn tài khoản khác hoặc chọn "Delete from app only".
  - Lựa chọn: "Delete from app only" (chỉ xóa record trên Firebase).
  - Checkbox: "Also delete Cloudflare Zone" (chỉ hiển thị khi không chọn "Delete from app only", mặc định unchecked).

Buttons: [Cancel] [Delete] (button-semantic-down style: red)
```

---

## 10. CORE BUSINESS FLOW — Registration

```typescript
// Luồng đăng ký domain (RegisterModal logic)
async function registerDomain(subdomain: string, namespace: string, accountId: string) {
  // 1. Tìm tài khoản tương ứng đã được giải mã từ store
  const account = store.accounts.find(acc => acc.id === accountId);
  if (!account || !account.dpdns.token || !account.cloudflare.api_key) {
    throw new Error('Selected API account is invalid or missing credentials');
  }

  const { token: dpdnsToken } = account.dpdns;
  const { email: cloudflareEmail, api_key: cloudflareApiKey, account_id: cloudflareAccountId } = account.cloudflare;

  const fqdn = `${subdomain}${namespace}`;
  const slotType = getSlotType(namespace); // 'free' | 'paid'
  let cloudflareZoneId: string | null = null;

  // Step 1: Create Cloudflare Zone
  setStep(0, 'loading');
  try {
    const cfRes = await CloudflareService.createZone(fqdn, cloudflareAccountId, {
      email: cloudflareEmail,
      apiKey: cloudflareApiKey
    });
    cloudflareZoneId = cfRes.id;
    const nameservers = cfRes.name_servers; // ["anna.ns.cloudflare.com", ...]
    setStep(0, 'success');

    // Step 2: (Extract NS — instant, part of step 1 response)
    setStep(1, 'success');

    // Step 3: Register on DPDNS
    setStep(2, 'loading');
    await DPDNSService.registerDomain(fqdn, slotType, nameservers, dpdnsToken);
    setStep(2, 'success');

    // Save to Firebase
    await FirebaseService.saveDomain(uid, {
      name: subdomain,
      namespace,
      fqdn,
      cloudflare: { zone_id: cloudflareZoneId, nameservers },
      dpdns: { registered: true, registration_response: 'success' },
      status: 'active',
      notes: '',
      created_at: Date.now(),
      updated_at: Date.now(),
      credentialAccountId: accountId
    });
  } catch (err) {
    // Rollback: nếu DPDNS fail và đã tạo CF zone → xóa CF zone
    if (cloudflareZoneId) {
      try {
        logger.info('Cloudflare API', `Registration failed. Attempting to rollback Cloudflare zone ${cloudflareZoneId}...`);
        await CloudflareService.deleteZone(cloudflareZoneId, {
          email: cloudflareEmail,
          apiKey: cloudflareApiKey
        });
        logger.info('Cloudflare API', `Rollback successful: Zone ${cloudflareZoneId} deleted.`);
      } catch (rollbackError) {
        logger.error('Cloudflare API', `Rollback failed: Unable to delete zone ${cloudflareZoneId}`, rollbackError);
      }
    }
    setStep(currentStep, 'error');
    throw err;
  }
}

function getSlotType(namespace: string): string {
  if (namespace === '.dpdns.org' || namespace === '.qzz.io') return 'free';
  return 'paid'; // .us.kg, .xx.kg
}
```

---

## 11. ERROR HANDLING MATRIX

| Scenario | API | HTTP | Xử lý |
|----------|-----|------|-------|
| DPDNS token không hợp lệ | DPDNS | 401 | Toast "API Token không hợp lệ" + redirect Settings |
| Domain đã tồn tại | DPDNS | 400/409 | Inline error modal "Domain này đã được đăng ký" |
| slot_type sai namespace | DPDNS | 400 | Auto-detect + warning trước submit |
| Domain pendingdelete | DPDNS | — | Badge đỏ, tooltip "Release sau 7 ngày" |
| CF key sai | Cloudflare | 403 | Toast + redirect Settings |
| Zone đã tồn tại | Cloudflare | 400 | GET zone_id hiện có, tái sử dụng |
| Rate limit | Cloudflare | 429 | Auto-retry sau 5s, max 2 lần |
| CORS block | Any | TypeError | Silent fallback → `/api/proxy/*` |
| Timeout > 8s | Any | — | AbortSignal, hiển thị "Kết nối thất bại, thử lại" |
| Firebase key có ký tự đặc biệt | Firebase | Error | `toFirebaseKey()` trước mọi write |

---

## 12. FIREBASE SERVICE LAYER

```typescript
// services/firebase.service.ts (interface)

// ⚠️ Mọi function nhận key đã sanitize hoặc tự sanitize bên trong

export const FirebaseService = {
  // Lưu domain mới
  async saveDomain(uid: string, domain: DomainRecord): Promise<void> {
    const key = toFirebaseKey(domain.fqdn); // ⚠️ sanitize
    const ref = dbRef(db, `users/${uid}/domains/${key}`);
    await set(ref, domain);
  },

  // Lắng nghe realtime
  subscribeDomains(uid: string, callback: (domains: DomainRecord[]) => void): Unsubscribe {
    const ref = dbRef(db, `users/${uid}/domains`);
    return onValue(ref, (snapshot) => {
      const data = snapshot.val();
      const domains = data
        ? Object.entries(data).map(([key, val]) => ({
            ...(val as DomainRecord),
            _key: key, // lưu key để dùng cho update/delete
          }))
        : [];
      // Sort by created_at DESC
      domains.sort((a, b) => b.created_at - a.created_at);
      callback(domains);
    });
  },

  // Xóa domain
  async deleteDomain(uid: string, fqdn: string): Promise<void> {
    const key = toFirebaseKey(fqdn); // ⚠️ sanitize
    const ref = dbRef(db, `users/${uid}/domains/${key}`);
    await remove(ref);
  },

  // Cập nhật domain
  async updateDomain(uid: string, fqdn: string, updates: Partial<DomainRecord>): Promise<void> {
    const key = toFirebaseKey(fqdn); // ⚠️ sanitize
    const ref = dbRef(db, `users/${uid}/domains/${key}`);
    await update(ref, { ...updates, updated_at: Date.now() });
  },

  // Credential Accounts
  async saveCredentialAccount(uid: string, accountId: string, account: EncryptedCredentialAccount): Promise<void> {
    const ref = dbRef(db, `users/${uid}/settings/accounts/${accountId}`);
    await set(ref, account);
  },

  async deleteCredentialAccount(uid: string, accountId: string): Promise<void> {
    const ref = dbRef(db, `users/${uid}/settings/accounts/${accountId}`);
    await remove(ref);
  },
};
```

---

## 13. ZUSTAND STORE

```typescript
// stores/app.store.ts
interface AppStore {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Accounts (decrypted, in-memory only)
  accounts: DecryptedCredentialAccount[];
  setAccounts: (accounts: DecryptedCredentialAccount[]) => void;

  // Domains
  domains: DomainRecord[];
  setDomains: (domains: DomainRecord[]) => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}
```

---

## 14. TYPES

```typescript
// types/index.ts

export interface DomainRecord {
  name: string;
  namespace: string;
  fqdn: string;
  cloudflare: {
    zone_id: string;
    nameservers: string[];
  };
  dpdns: {
    registered: boolean;
    registration_response?: string;
  };
  status: 'active' | 'pending' | 'error' | 'deleted';
  notes?: string;
  created_at: number;
  updated_at: number;
  credentialAccountId?: string; // Linked account ID
  _key?: string; // Firebase key (sanitized), internal use only
}

export interface EncryptedCredentialAccount {
  id: string;
  name: string;
  dpdns: {
    token: string; // encrypted
    verified: boolean;
    verified_at: number;
  };
  cloudflare: {
    email: string; // plaintext
    api_key: string; // encrypted
    account_id: string; // plaintext
    verified: boolean;
    verified_at: number;
  };
  created_at: number;
  updated_at: number;
}

export interface DecryptedCredentialAccount {
  id: string;
  name: string;
  dpdns: {
    token: string; // decrypted
    verified: boolean;
    verified_at: number;
  };
  cloudflare: {
    email: string; // plaintext
    api_key: string; // decrypted
    account_id: string; // plaintext
    verified: boolean;
    verified_at: number;
  };
  created_at: number;
  updated_at: number;
}

export type Namespace = '.dpdns.org' | '.us.kg' | '.qzz.io' | '.xx.kg';
export type DomainStatus = 'active' | 'pending' | 'error' | 'deleted';
export type StepStatus = 'idle' | 'loading' | 'success' | 'error';
```

---

## 15. ENVIRONMENT VARIABLES

```bash
# .env.local

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Encryption salt (thêm vào uid khi derive AES key)
# Đặt giá trị random string dài ≥ 32 chars
NEXT_PUBLIC_ENCRYPT_SALT=

# Backend Secret Key cho các api route (e.g. /api/accounts)
BACKEND_API_SECRET_KEY=

# Danh sách email được phép đăng nhập ứng dụng (phân cách bởi dấu ; hoặc , hoặc |)
# Ví dụ: user1@example.com;user2@example.com,user3@example.com
# Nếu bỏ trống, tất cả mọi email đều được phép truy cập.
NEXT_PUBLIC_ALLOWED_EMAILS=

# (Optional) Firebase region — khuyến nghị asia-southeast1 cho VN users
# FIREBASE_REGION=asia-southeast1
```

---

## 16. MILESTONES

| Phase | Tên | Thời gian | Deliverables |
|-------|-----|-----------|--------------|
| Phase 0 | Foundation | Ngày 1–3 | Next.js setup, Firebase Auth, Google Sign-In, DB rules |
| Phase 1 | Core Registration | Ngày 4–8 | CredentialsForm, CloudflareService, DPDNSService, RegisterModal + StepIndicator, rollback |
| Phase 2 | Domain Management | Ngày 9–11 | Dashboard realtime list, DomainCard, EditModal, ConfirmDelete |
| Phase 3 | UX + Security | Ngày 12–13 | Credential masking, AES encryption, error states, responsive, mobile sidebar |
| Phase 4 | Test + Deploy | Ngày 14–15 | Firebase rules production, Vercel deploy, smoke test |

**Critical path:** Phase 1 (Services) → RegisterModal → Dashboard → Edit/Delete → Polish → Deploy

---

## 17. KNOWN RISKS & MITIGATIONS

| ID | Risk | Mitigation |
|----|------|-----------|
| R-01 | DPDNS API endpoint không chính thức | Đã xác nhận: `domain-api.digitalplat.org/api/v1` — xem Section 6 |
| R-03 | Cloudflare reject subdomain zone | Đã xác nhận hoạt động — OQ-03 resolved |
| R-07 | CORS block từ browser | Dual-path proxy strategy — xem Section 7 |
| R-FB1 | Firebase key chứa ký tự đặc biệt | `toFirebaseKey()` bắt buộc — xem Section 5.2 |
| R-05 | DigitalPlat limit 3 domain/account | Đếm domains hiện tại, hiện warning "X/3 domains used" |
| R-06 | Cloudflare Global API Key scope rộng | Hiện cảnh báo khi user nhập, roadmap API Token v2 |
| R-09 | DPDNS debounce | Client-side debounce 500ms trên mọi API call |

---

## 18. OPEN QUESTIONS (Đã giải quyết)

| # | Câu hỏi | Quyết định |
|---|---------|-----------|
| OQ-01 | DPDNS endpoint | ✅ `domain-api.digitalplat.org/api/v1` |
| OQ-02 | DPDNS auth | ✅ Bearer JWT Token |
| OQ-03 | CF subdomain zone | ✅ Hoạt động |
| OQ-04 | Single vs multi-user | ✅ Multi-user (scoped by Firebase uid) |
| OQ-06 | Xóa domain DPDNS API? | ✅ Có EP-DPDNS-04 DELETE — hiển thị 7-day warning |
| OQ-10 | Firebase region | 📌 Khuyến nghị `asia-southeast1` (Singapore) cho VN users |

**Còn mở:**
- OQ-05: Encryption key từ `uid + salt` — đủ cho MVP, upgrade Firebase Functions v2
- OQ-07: Domain availability check — thử đăng ký, handle 409 error
- OQ-08: Custom domain — Vercel default URL đủ cho MVP
- OQ-09: Rate limit DPDNS — debounce 500ms client-side

---

## 19. CHECKLIST IMPLEMENTATION

```
□ [ ] Firebase project tạo với region asia-southeast1
□ [ ] Google Sign-In enabled trong Firebase Auth
□ [ ] Firebase Security Rules deployed (Section 5.3)
□ [ ] .env.local điền đủ biến
□ [ ] toFirebaseKey / fromFirebaseKey implemented và test
□ [ ] AES encrypt/decrypt implemented và test
□ [ ] Dual-path proxy routes tạo (/api/proxy/dpdns, /api/proxy/cloudflare)
□ [ ] CloudflareService: createZone, deleteZone, verifyCredentials
□ [ ] DPDNSService: listDomains, registerDomain, updateNameservers, deleteDomain
□ [ ] FirebaseService: saveDomain, subscribeDomains, deleteDomain, updateDomain, credentials CRUD
□ [ ] Login page: dark hero + Google Sign-In pill
□ [ ] Sidebar: mobile drawer, tablet icon-only, desktop expanded
□ [ ] Dashboard: realtime list, empty state, Register button
□ [ ] DomainRow: status dot, copy NS, edit/delete icons
□ [ ] RegisterModal: form + StepIndicator + rollback
□ [ ] ConfirmDeleteDialog: 7-day DPDNS warning + CF zone checkbox
□ [ ] SettingsPage: masked inputs + Test Connection
□ [ ] All inputs: Zod validation
□ [ ] Error states: toast + inline errors
□ [ ] Responsive: mobile (375px) + tablet + desktop
□ [ ] Vercel deployment + env vars
□ [ ] PWA: webapp manifest.json + sw.js + PWARegistration client provider
```

---

*Agent: Đọc toàn bộ spec này trước khi bắt đầu viết bất kỳ dòng code nào. Section 5.2 (Firebase Key Sanitization), Section 7 (CORS Dual-Path) và Section 8.4 (Logger) là các yêu cầu kỹ thuật quan trọng.*
