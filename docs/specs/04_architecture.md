# Section 4 — System Architecture
> **Updated:** Bỏ version pin trên tất cả thư viện (dùng latest). Thêm CORS Proxy layer vào kiến trúc.

---

## 4.1 Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                               │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js App (App Router)                      │  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │  │
│  │  │  UI Layer    │  │    Zustand   │  │  Next.js App Router  │   │  │
│  │  │  Components  │  │    Store     │  │  (pages + API routes)│   │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘   │  │
│  │         │                 │                                        │  │
│  │  ┌──────▼─────────────────▼──────────────────────────────────┐   │  │
│  │  │                   Service Layer                            │   │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │   │  │
│  │  │  │ dpdns.service│  │  cf.service  │  │firebase.svc   │   │   │  │
│  │  │  │(dual-path)   │  │ (dual-path)  │  │(Realtime DB)  │   │   │  │
│  │  │  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘   │   │  │
│  │  └─────────┼─────────────────┼──────────────────┼────────────┘   │  │
│  └────────────┼─────────────────┼──────────────────┼────────────────┘  │
│               │ [direct fetch]  │ [direct fetch]   │                    │
│               │ or CORS error ↓ │ or CORS error ↓  │                    │
└───────────────┼─────────────────┼──────────────────┼───────────────────┘
                │                 │                  │
┌───────────────▼─────────────────▼──────────────────┼───────────────────┐
│              Next.js API Routes  (Server-side proxy)│                   │
│                                                     │                   │
│  /api/proxy/dpdns         /api/proxy/cloudflare     │                   │
│  (no CORS, server fetch)  (no CORS, server fetch)   │                   │
└───────────────┬─────────────────┬──────────────────┼───────────────────┘
                │                 │                  │
     ┌──────────▼──┐   ┌──────────▼──┐   ┌──────────▼─────────────┐
     │  DigitalPlat│   │  Cloudflare │   │  Firebase Realtime DB  │
     │  Domain API │   │  API v4     │   │  (Google Cloud)        │
     │(domain-api. │   │             │   │                        │
     │digitalplat) │   │             │   │                        │
     └─────────────┘   └─────────────┘   └────────────────────────┘
```

---

## 4.2 Component Breakdown

### 4.2.1 UI Layer — Pages & Components

| Component | Mô tả |
|-----------|-------|
| `SettingsPage` | Trang cấu hình tài khoản API Credentials |
| `DashboardPage` | Trang chính: danh sách domain realtime + nút bấm mở modal đăng ký |
| `RegisterModal` | Modal đăng ký domain có dropdown chọn tài khoản và step indicator |
| `DomainCard` / `DomainRow` | Component 1 domain — hiển thị thông tin domain và badge email Cloudflare của tài khoản liên kết |
| `EditDomainModal` | Sửa nameserver + ghi chú |
| `ConfirmDeleteDialog` | Dialog xác nhận xoá, cho phép lựa chọn tài khoản để gọi API cleanup hoặc xóa record-only |
| `CredentialsForm` | Giao diện quản lý nhiều tài khoản, bao gồm cả list view và form thêm/sửa, hỗ trợ test kết nối độc lập |
| `StepIndicator` | Tiến trình visual 3 bước (Cloudflare Zone → Lấy NS → Đăng ký DPDNS) |
| `StatusBadge` | Badge pill trạng thái: `active` (xanh), `pending` (vàng), `error`/`deleted` (đỏ) |

### 4.2.2 Service Layer

| Service | File | Nhiệm vụ |
|---------|------|---------|
| `DPDNSService` | `services/dpdns.service.ts` | List, register, update NS, delete — dual-path |
| `CloudflareService` | `services/cloudflare.service.ts` | Create zone, get NS, delete zone — dual-path |
| `FirebaseService` | `services/firebase.service.ts` | CRUD domain records, CRUD accounts, realtime listener |
| `ApiCaller` | `services/api-caller.ts` | Dual-path fetch wrapper (direct → proxy fallback) |
| `CredentialsService` | `services/credentials.service.ts` | Đọc/ghi/mã hoá tài khoản và tự động di chuyển cấu hình cũ |

### 4.2.3 Next.js API Routes (CORS Proxy)

| Route | File | Proxy đến |
|-------|------|-----------|
| `POST /api/proxy/dpdns` | `app/api/proxy/dpdns/route.ts` | `domain-api.digitalplat.org` |
| `POST /api/proxy/cloudflare` | `app/api/proxy/cloudflare/route.ts` | `api.cloudflare.com` |

---

## 4.3 Data Flow — Luồng đăng ký domain

```
User bấm "Register Domain"
       │
       ▼
[1] Tải danh sách accounts từ Firebase (decrypt tokens)
       │
       ▼
[2] Người dùng nhập subdomain, chọn namespace và chọn một Account trong list
       │
       ▼
[3] CloudflareService.createZone(domain) sử dụng API Key của Account được chọn
    [dual-path: direct → proxy fallback]
    ├── Lỗi → STOP, hiển thị lỗi
    └── OK  → zone_id + name_servers[]
       │
       ▼
[4] DPDNSService.registerDomain(domain, slot_type, nameservers) sử dụng DPDNS Token của Account được chọn
    [dual-path: direct → proxy fallback]
    ├── Lỗi → CloudflareService.deleteZone(zone_id) [rollback]
    └── OK  → tiếp tục
       │
       ▼
[5] FirebaseService.saveDomain({ fqdn, zone_id, nameservers,
      slot_type, status: "active", created_at, updated_at, credentialAccountId })
       │
       ▼
[6] UI realtime update qua Firebase onValue()
```


---

## 4.4 Tech Stack

| Layer | Technology | Lý do chọn |
|-------|-----------|------------|
| **Frontend Framework** | **Next.js** (latest, App Router) | SSR + API Routes cho CORS proxy, tích hợp Firebase |
| **Language** | **TypeScript** (latest) | Type-safe API calls, Zod schema validation |
| **UI Library** | **Tailwind CSS** (latest) | Utility-first, Coinbase design system dễ implement |
| **Component Library** | **shadcn/ui** (latest) | Unstyled components, customize theo Coinbase tokens |
| **State Management** | **Zustand** (latest) | Nhẹ, đơn giản cho quy mô app này |
| **Database** | **Firebase Realtime Database** | Realtime sync, free tier Spark plan |
| **Authentication** | **Firebase Authentication** | Google Sign-In, bảo vệ data per-uid |
| **Form + Validation** | **react-hook-form + Zod** (latest) | Type-safe, DX tốt, tích hợp shadcn/ui |
| **Encryption** | **CryptoJS** (latest) | AES-256-GCM cho credentials trong Firebase |
| **Deployment** | **Vercel** (free tier) / **Docker** | Zero-config Next.js, edge functions / Multi-stage production container |
| **Icons** | **Lucide React** (latest) | Consistent icon set, tree-shakeable |

> **Nguyên tắc version:** Không pin cụ thể version trong `package.json`. Dùng `"next": "latest"`, `"typescript": "latest"`, v.v. Chỉ pin khi có breaking change được xác nhận.

---

## 4.5 Project Structure

```
domain-register-app/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx          # Login page — dark hero style
│   ├── (dashboard)/
│   │   ├── page.tsx                # Dashboard — domain list
│   │   └── settings/page.tsx       # Settings — credentials
│   ├── api/
│   │   └── proxy/
│   │       ├── dpdns/route.ts      # DPDNS CORS proxy
│   │       └── cloudflare/route.ts # Cloudflare CORS proxy
│   ├── globals.css                 # Coinbase design tokens (CSS vars)
│   └── layout.tsx                  # Root layout + Firebase provider
├── components/
│   ├── ui/                         # shadcn/ui base components
│   ├── domain/
│   │   ├── DomainRow.tsx
│   │   ├── RegisterModal.tsx
│   │   ├── EditDomainModal.tsx
│   │   ├── ConfirmDeleteDialog.tsx
│   │   └── StepIndicator.tsx
│   ├── credentials/
│   │   ├── CredentialsForm.tsx
│   │   └── MaskedInput.tsx
│   └── layout/
│       ├── TopNav.tsx
│       └── StatusBadge.tsx
├── services/
│   ├── api-caller.ts              # Dual-path fetch wrapper
│   ├── dpdns.service.ts
│   ├── cloudflare.service.ts
│   ├── firebase.service.ts
│   └── credentials.service.ts
├── stores/
│   └── app.store.ts               # Zustand global store
├── lib/
│   ├── firebase.ts                # Firebase SDK init
│   ├── crypto.ts                  # AES-256 encrypt/decrypt
│   └── validators.ts              # Zod schemas
├── types/
│   └── index.ts                   # Domain, Credentials, API types
└── .env.local                     # Firebase config vars
```

---

## 4.6 Deployment Architecture

Ứng dụng hỗ trợ hai cơ chế triển khai chính: Vercel (Cloud Serverless) và Docker (Container hóa).

### 4.6.1 Triển khai trên Vercel (Mặc định)

```
┌───────────────────────────────────────────────────────┐
│                    Vercel (Edge Network)              │
│                                                       │
│   Next.js App (Static + Edge Functions)               │
│   + API Routes: /api/proxy/* (Serverless)             │
│                                                       │
│   Environment Variables (Configured on Vercel Dashboard):│
│   NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY │
│   NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID │
│   NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL │
│   NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT (AES)│
└───────────────────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌───────────────────────────────────────────────────────┐
│              Firebase (Google Cloud)                  │
│  Authentication (Google Sign-In)                      │
│  Realtime Database (domains, credentials)             │
└───────────────────────────────────────────────────────┘
```

### 4.6.2 Triển khai trên Docker (Container)

Ứng dụng có thể được chạy dưới dạng một Docker Container độc lập sử dụng Multi-stage build để tối ưu hóa hiệu suất và giảm thiểu kích thước hình ảnh thông qua tính năng `standalone` của Next.js.

```
┌───────────────────────────────────────────────────────┐
│              Docker Container (Host Port 3000)        │
│                                                       │
│   Node.js (Alpine Base) Run environment               │
│   ├── public/ (Static resources)                      │
│   ├── .next/static/ (Compiled JS/CSS files)           │
│   └── server.js (Next.js standalone entry point)      │
│                                                       │
│   Build Arguments (Inlined at build-time):            │
│   NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY │
│   ... (all NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_* var)│
│                                                       │
│   Runtime Env (Loaded from .env.local on host):       │
│   PORT=3000                                           │
│   DPDNS_CLOUDFLARED_MANAGER_BACKEND_API_SECRET_KEY    │
└───────────────────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌───────────────────────────────────────────────────────┐
│              Firebase (Google Cloud)                  │
│  Authentication (Google Sign-In)                      │
│  Realtime Database (domains, credentials)             │
└───────────────────────────────────────────────────────┘
```

