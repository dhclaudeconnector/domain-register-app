# Section 6 — API / Interface Design
> **Updated:** OQ-01, OQ-02 resolved — DPDNS API docs confirmed. OQ-03 resolved — Cloudflare zone creation với subdomain hoạt động. R-07 — CORS dual-path strategy áp dụng cho cả 2 API.

---

## 6.1 External APIs — DigitalPlat DPDNS

**Base URL:** `https://domain-api.digitalplat.org/api/v1`
**Auth:** `Authorization: Bearer dp_live_xxxxx` (hoặc `dp_test_xxxxx` cho dev)
**Content-Type:** `application/json`
**Response Envelope:** `{ "success": boolean, "data": {...}, "meta": {...} }`

> **Lưu ý slot_type:**
> - `.dpdns.org`, `.qzz.io` → dùng `slot_type: "free"`
> - `.us.kg`, `.xx.kg` → chỉ hỗ trợ `paid` hoặc `subscription`

---

### EP-DPDNS-01 — List Domains

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/v1/domains` |
| Auth | Bearer Token |

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "name": "myapp.dpdns.org",
      "status": "ok",
      "slot_type": "free",
      "lifecycle_type": "free",
      "expiry_date": "2027-04-08",
      "nameservers": ["anna.ns.cloudflare.com", "bob.ns.cloudflare.com"]
    }
  ],
  "meta": {}
}
```

---

### EP-DPDNS-02 — Register Domain

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/v1/domains` |
| Auth | Bearer Token |

**Request Body:**
```json
{
  "domain": "myapp.dpdns.org",
  "slot_type": "free",
  "nameservers": [
    "anna.ns.cloudflare.com",
    "bob.ns.cloudflare.com"
  ]
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "name": "myapp.dpdns.org",
    "status": "ok",
    "slot_type": "free",
    "lifecycle_type": "free"
  },
  "meta": {}
}
```

**slot_type mapping:**

| Namespace | slot_type |
|-----------|-----------|
| `.dpdns.org` | `"free"` |
| `.qzz.io` | `"free"` |
| `.us.kg` | `"paid"` hoặc `"subscription"` |
| `.xx.kg` | `"paid"` hoặc `"subscription"` |

---

### EP-DPDNS-03 — Update Nameservers

| Field | Value |
|-------|-------|
| Method | `PATCH` |
| Path | `/api/v1/domains/{domain}/nameservers` |
| Auth | Bearer Token |

**Request Body:**
```json
{
  "nameservers": [
    "ns1.newprovider.com",
    "ns2.newprovider.com"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "myapp.dpdns.org",
    "nameservers": ["ns1.newprovider.com", "ns2.newprovider.com"]
  },
  "meta": {}
}
```

---

### EP-DPDNS-04 — Delete Domain

| Field | Value |
|-------|-------|
| Method | `DELETE` |
| Path | `/api/v1/domains/{domain}` |
| Auth | Bearer Token |

**Response:**
```json
{
  "success": true,
  "data": {
    "domain": "myapp.dpdns.org",
    "status": "pendingdelete"
  },
  "meta": {}
}
```

> ⚠️ Delete đưa domain vào trạng thái `pendingdelete`. DNS tắt ngay lập tức, domain được release sau **7 ngày**. App phải hiển thị cảnh báo này cho user trước khi xác nhận.

---

## 6.2 External APIs — Cloudflare API v4

**Base URL:** `https://api.cloudflare.com/client/v4`
**Auth Headers:**
```
X-Auth-Email: user@example.com
X-Auth-Key: <Global API Key>
Content-Type: application/json
```

---

### EP-CF-01 — Verify Credentials

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/user` |

**Success Response:**
```json
{
  "success": true,
  "result": {
    "id": "7c5dae5552338874e5053f2534d2767a",
    "email": "user@example.com",
    "username": "myusername"
  }
}
```

---

### EP-CF-02 — Create Zone (thêm domain vào Cloudflare)

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/zones` |

**Request Body:**
```json
{
  "name": "myapp.dpdns.org",
  "account": { "id": "01a7362d577a6c3019a474fd6f485823" },
  "type": "full"
}
```

**Success Response:**
```json
{
  "success": true,
  "result": {
    "id": "023e105f4ecef8ad9ca31a8372d0c353",
    "name": "myapp.dpdns.org",
    "name_servers": [
      "anna.ns.cloudflare.com",
      "bob.ns.cloudflare.com"
    ],
    "status": "pending"
  }
}
```

> ✅ **OQ-03 Resolved:** Cloudflare chấp nhận subdomain `.dpdns.org` làm zone. `name_servers[]` trong response này là giá trị truyền vào DPDNS.

---

### EP-CF-03 — Get Zone Details

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/zones/{zone_id}` |

---

### EP-CF-04 — Delete Zone (Rollback)

| Field | Value |
|-------|-------|
| Method | `DELETE` |
| Path | `/zones/{zone_id}` |

```json
{
  "success": true,
  "result": { "id": "023e105f4ecef8ad9ca31a8372d0c353" }
}
```

---

## 6.3 CORS Dual-Path Strategy

Cả DPDNS API và Cloudflare API đều có thể bị CORS block khi gọi từ browser. Hệ thống áp dụng **dual-path**: thử trực tiếp từ client trước, nếu lỗi CORS thì fallback xuống Next.js API Route.

```
Browser
   │
   ├─► [1] Direct fetch → DPDNS / Cloudflare API
   │         │
   │         ├── 200 OK ──────────────────────► Done ✅
   │         │
   │         └── CORS Error (TypeError: Failed to fetch)
   │                   │
   │                   ▼
   └─► [2] Fallback: fetch /api/proxy/dpdns  (Next.js Route)
                       │
                       │  Server-side fetch (no CORS)
                       ▼
               DPDNS / Cloudflare API ──► Response ──► Done ✅
```

### Next.js API Route — DPDNS Proxy

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

### Next.js API Route — Cloudflare Proxy

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

### Client-side Dual-Path Wrapper

```typescript
// services/api-caller.ts
async function callWithFallback(
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
    // TypeError = CORS / network block → fallback to proxy
    if (err instanceof TypeError) {
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

## 6.4 UI Screen Flow

```
┌─────────────────────────────────────────────────────────────┐
│  App Flow (Coinbase Design System)                          │
│                                                              │
│  [Login Page]  — dark hero band, Google Sign-in pill CTA   │
│       │                                                      │
│       ▼                                                      │
│  [Dashboard]   — white canvas, domain list realtime         │
│       │                                                      │
│       ├── [Settings Page]  — credentials form               │
│       │   ┌────────────────────────────────────────┐        │
│       │   │  feature-card (rounded-xl, 32px pad)   │        │
│       │   │  DPDNS Token  [pill input masked] [👁] │        │
│       │   │  CF Email     [text input]              │        │
│       │   │  CF API Key   [pill input masked] [👁] │        │
│       │   │  [Save & Test →]  ← button-primary pill│        │
│       │   └────────────────────────────────────────┘        │
│       │                                                      │
│       └── [Domain List]  — asset-row style                  │
│           ┌────────────────────────────────────────┐        │
│           │  myapp.dpdns.org    ●ok   [✏️] [🗑️]  │        │
│           │  anna.ns.cloudflare.com  [copy]         │        │
│           │  Created: 2024-05-20  10:00             │        │
│           ├────────────────────────────────────────┤        │
│           │  blog.us.kg         ●ok   [✏️] [🗑️]  │        │
│           └────────────────────────────────────────┘        │
│                                                              │
│  [Register Modal]  — product-ui-card-dark style             │
│  ┌──────────────────────────────────────────────┐           │
│  │  Register New Domain                         │           │
│  │  Subdomain  [___________]  .[ dpdns.org ▼ ] │           │
│  │  slot_type auto-detected từ namespace        │           │
│  │                                              │           │
│  │  ── Step Indicator ──────────────────────── │           │
│  │  ① 🔵 Create Cloudflare Zone    ✅           │           │
│  │  ② 🔵 Extract Nameservers       ✅           │           │
│  │  ③ ⏳ Register on DPDNS...                   │           │
│  │                                              │           │
│  │  [Cancel]          [Register →]              │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 6.5 API Error Handling Matrix

| Scenario | API | HTTP | Xử lý |
|----------|-----|------|-------|
| Token DPDNS không hợp lệ | DPDNS | 401 | Toast "API Token không hợp lệ" + redirect Settings |
| Domain đã tồn tại | DPDNS | 400/409 | Inline error trong modal "Domain này đã được đăng ký" |
| slot_type không hợp lệ cho namespace | DPDNS | 400 | Tự động detect + hiển thị warning trước khi submit |
| Domain `pendingdelete` | DPDNS | — | Badge status đỏ, tooltip "Sẽ được release sau 7 ngày" |
| CF key sai | Cloudflare | 403 | Toast + redirect Settings |
| Zone đã tồn tại | Cloudflare | 400 | GET zone_id hiện có thay vì tạo mới |
| Rate limit | Cloudflare | 429 | Auto-retry sau 5 giây, tối đa 2 lần |
| CORS block | Bất kỳ | TypeError | Silent fallback sang `/api/proxy/*` |
| Timeout > 8 giây | Bất kỳ | — | AbortSignal, hiển thị "Kết nối thất bại, thử lại" |

---

## 6.5 Internal APIs — Backend Account Management

### EP-ACCOUNTS-01 — Add / Update Account

Cung cấp API để công cụ bên thứ ba hoặc backend tích hợp có thể thêm hoặc cập nhật tài khoản API Credentials cho người dùng.

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/accounts` |
| Auth | Bearer Token (Cấu hình qua `BACKEND_API_SECRET_KEY`) |
| Content-Type | `application/json` |

**Headers:**
```http
Authorization: Bearer <BACKEND_API_SECRET_KEY>
Content-Type: application/json
```

**Request Body (DPDNS Account):**
```json
{
  "userId": "firebase-user-uid-12345",
  "service": "dpdns",
  "name": "My DPDNS Account",
  "email": "cloudflare-email@example.com",
  "token": "dpdns-token-here"
}
```

**Request Body (Cloudflare Account):**
```json
{
  "userId": "firebase-user-uid-12345",
  "service": "cloudflare",
  "name": "My Cloudflare Account",
  "email": "cloudflare-email@example.com",
  "apiKey": "cloudflare-api-key-here",
  "accountId": "cloudflare-account-id-here"
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "accountId": "acc_xyz789",
  "action": "created" // hoặc "updated"
}
```

**Error Response `400` / `401` / `500`:**
```json
{
  "error": "Error message details here."
}
```

---

## 6.6 Sequence Diagram — Luồng đầy đủ (với CORS fallback)

```
User     App (Client)     Next.js API Route     Cloudflare     DPDNS
 │            │                  │                  │            │
 │─Register──►│                  │                  │            │
 │            │──direct fetch────────────────────►  │            │
 │            │  POST /zones                         │            │
 │            │◄──200 OK / CORS Error────────────── │            │
 │            │  (if CORS: retry via proxy)          │            │
 │            │──POST /api/proxy/cloudflare─────►   │            │
 │            │                  │──POST /zones────►│            │
 │            │                  │◄─zone_id + NS───│            │
 │            │◄─zone_id + NS────│                  │            │
 │  Step1 ✅  │                  │                  │            │
 │            │──direct fetch────────────────────────────────►  │
 │            │  POST /api/v1/domains                            │
 │            │◄──200 OK / CORS Error───────────────────────── │
 │            │  (if CORS: retry via proxy)                      │
 │            │──POST /api/proxy/dpdns──────────►               │
 │            │                  │──POST /api/v1/domains──────►│
 │            │                  │◄─success──────────────────── │
 │            │◄─success─────────│                               │
 │  Step3 ✅  │                  │                               │
 │            │──save to Firebase─────────────────────────────►  │
 │            │◄─saved──────────────────────────────────────── │
 │ Domain appears in list (realtime)                             │
```
