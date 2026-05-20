# Section 5 — Data Model

---

## 5.1 Firebase Realtime Database — Cấu trúc tổng thể

Firebase Realtime Database là NoSQL JSON tree. Toàn bộ dữ liệu của ứng dụng được tổ chức dưới root node của project.

```json
{
  "users": {
    "<uid>": {
      "settings": { ... },
      "domains": { ... }
    }
  }
}
```

> Mọi data đều scoped theo `uid` (Firebase Auth User ID) để tránh người dùng đọc/ghi data của nhau.

---

## 5.2 Node: `/users/{uid}/settings`

Lưu cấu hình danh sách tài khoản API credentials của người dùng.

```json
{
  "users": {
    "uid_abc123": {
      "settings": {
        "accounts": {
          "acc_default": {
            "id": "acc_default",
            "name": "Default Account",
            "dpdns": {
              "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              "verified": true,
              "verified_at": 1716192000000
            },
            "cloudflare": {
              "email": "user@example.com",
              "api_key": "c2547eb745079dac9320b638f5e225cf483cc5",
              "account_id": "01a7362d577a6c3019a474fd6f485823",
              "verified": true,
              "verified_at": 1716192000000
            },
            "created_at": 1716192000000,
            "updated_at": 1716192000000
          }
        },
        "updated_at": 1716192000000
      }
    }
  }
}
```

### Field Definitions — Account

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | `string` | ID duy nhất của tài khoản (tự sinh, ví dụ: `acc_xxxxx`) |
| `name` | `string` | Tên thân thiện của tài khoản (Friendly Account Name) |
| `dpdns.token` | `string` | Bearer DPDNS Token (được mã hóa AES-256) |
| `dpdns.verified` | `boolean` | Trạng thái xác thực thành công qua DPDNS API |
| `dpdns.verified_at` | `number` | Unix timestamp (ms) lần xác thực DPDNS gần nhất |
| `cloudflare.email` | `string` | Email đăng nhập Cloudflare |
| `cloudflare.api_key` | `string` | Global API Key của Cloudflare (được mã hóa AES-256) |
| `cloudflare.account_id` | `string` | Cloudflare Account ID (tự động phát hiện hoặc nhập thủ công) |
| `cloudflare.verified` | `boolean` | Trạng thái xác thực Cloudflare thành công |
| `cloudflare.verified_at` | `number` | Unix timestamp (ms) lần xác thực Cloudflare gần nhất |
| `created_at` | `number` | Unix timestamp (ms) khi tạo tài khoản |
| `updated_at` | `number` | Unix timestamp (ms) lần cập nhật tài khoản gần nhất |
| `settings.updated_at` | `number` | Lần cuối cập nhật settings tổng thể |


---

## 5.3 Node: `/users/{uid}/domains`

Lưu danh sách domain đã đăng ký.

```json
{
  "users": {
    "uid_abc123": {
      "domains": {
        "-NxDomainKey001": {
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
          "notes": "Domain cho project quản lý kho",
          "created_at": 1716192000000,
          "updated_at": 1716192000000,
          "credentialAccountId": "acc_default"
        }
      }
    }
  }
}
```

### Field Definitions — Domain Record

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `name` | `string` | ✅ | Subdomain name (không có namespace), e.g. `myapp` |
| `namespace` | `string` | ✅ | Namespace extension: `.dpdns.org`, `.us.kg`, `.qzz.io`, `.xx.kg` |
| `fqdn` | `string` | ✅ | Fully Qualified Domain Name: `myapp.dpdns.org` |
| `cloudflare.zone_id` | `string` | ✅ | Cloudflare Zone ID (32 hex chars) |
| `cloudflare.nameservers` | `string[]` | ✅ | Array 2 nameservers do Cloudflare cung cấp |
| `dpdns.registered` | `boolean` | ✅ | Đã đăng ký thành công trên DigitalPlat? |
| `dpdns.registration_response` | `string` | ❌ | Raw response hoặc status từ DPDNS API |
| `status` | `string` | ✅ | `active` \| `pending` \| `error` \| `deleted` |
| `notes` | `string` | ❌ | Ghi chú tùy chọn của người dùng |
| `created_at` | `number` | ✅ | Unix timestamp (ms) khi tạo |
| `updated_at` | `number` | ✅ | Unix timestamp (ms) lần sửa cuối |
| `credentialAccountId` | `string` | ❌ | ID của tài khoản API Credentials dùng để quản lý domain này (optional cho domain cũ) |


---

## 5.4 Domain Status State Machine

```
          ┌─────────┐
          │ PENDING │  ← Domain đang trong quá trình đăng ký
          └────┬────┘
               │  Cloudflare OK + DPDNS OK
               ▼
          ┌────────┐
          │ ACTIVE │  ← Domain đã đăng ký thành công, NS đã được set
          └────┬───┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
  ┌─────────┐      ┌─────────┐
  │  ERROR  │      │ DELETED │  ← Đã xoá khỏi danh sách quản lý
  └─────────┘      └─────────┘
  ↑ (Rollback hoặc API thất bại)
```

---

## 5.5 Firebase Security Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid || auth.uid === $uid",
        "settings": {
          "accounts": {
            ".read": "$uid === auth.uid",
            ".write": "$uid === auth.uid"
          }
        },
        "domains": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid",
          "$domainId": {
            ".validate": "newData.hasChildren(['name', 'namespace', 'fqdn', 'status', 'created_at'])"
          }
        },
        "diagnostic_assets": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    },
    "logs": {
      "$date": {
        ".read": "auth != null",
        ".write": "true"
      }
    }
  }
}
```

---

## 5.6 Node: `/users/{uid}/diagnostic_assets`

Lưu trữ thông tin Payload JSON đã chụp từ API Diagnostics Playground.

```json
{
  "users": {
    "uid_abc123": {
      "diagnostic_assets": {
        "tunnel": {
          "ast_xyz123": {
            "id": "ast_xyz123",
            "name": "Tunnel: Production Tunnel",
            "asset_type": "tunnel",
            "associated_account_id": "acc_default",
            "associated_account_name": "Default Account",
            "saved_at": 1716192000000,
            "data": {
              "id": "tunnel-uuid-goes-here",
              "name": "Production Tunnel",
              "created_at": "2026-05-19T10:00:00Z",
              "connections": []
            }
          }
        }
      }
    }
  }
}
```

---

## 5.7 Node: `/logs/{YYYY-MM-DD}` (Daily Logging)

Lưu trữ log hoạt động backend và quản lý tài khoản theo ngày.

```json
{
  "logs": {
    "2026-05-20": {
      "1716223400000": {
        "action": "CREATE_DPDNS_ACCOUNT",
        "status": "success",
        "timestamp": 1716223400000,
        "userId": "uid_abc123",
        "email": "user@example.com",
        "accountId": "acc_xyz789",
        "ip": "203.162.4.5",
        "message": "Account successfully created for service dpdns."
      }
    }
  }
}
```

---

## 5.8 Entity Relationship Overview

```
┌──────────────┐       1     1 ┌──────────────────┐
│    User      │───────────────│    Settings      │
│  (Firebase   │               │                  │
│   Auth UID)  │               └────────┬─────────┘
└──────┬───────┘                        │ 1
       │ 1                              │
       ├────────────────────────────────┼─────────────────┐
       │ N                              │ N               │ N
┌──────▼────────────────┐      ┌────────▼─────────┐ ┌─────▼──────────────┐
│     Domain Record     │      │  Creds Account   │ │  DiagnosticAsset   │
│  fqdn, namespace,     │      │   id, name,      │ │  id, name, data,   │
│  status, notes...     │      │  dpdns, cf...    │ │  asset_type...     │
│                       │      └────────┬─────────┘ └────────────────────┘
│  credentialAccountId ├───────────────┘
│  (fk)                 │ N (Linked Account)
└───────────────────────┘
```

---

## 5.9 Indexing & Query Patterns

Firebase Realtime Database không hỗ trợ query phức tạp. Các query patterns dự kiến:

| Query | Firebase Path | Method |
|-------|--------------|--------|
| Lấy tất cả domain của user | `/users/{uid}/domains` | `onValue()` |
| Lấy danh sách accounts | `/users/{uid}/settings/accounts` | `get()` / `onValue()` |
| Sửa/Thêm 1 account | `/users/{uid}/settings/accounts/{accountId}` | `set()` / `update()` |
| Xóa 1 account | `/users/{uid}/settings/accounts/{accountId}` | `remove()` |
| Sửa 1 domain | `/users/{uid}/domains/{domainId}` | `update()` |
| Xoá 1 domain | `/users/{uid}/domains/{domainId}` | `remove()` |
| Lấy diagnostic assets | `/users/{uid}/diagnostic_assets/{type}` | `get()` / `onValue()` |
| Xem logs theo ngày | `/logs/{YYYY-MM-DD}` | `get()` |
| Sắp xếp theo ngày tạo | `/users/{uid}/domains` + `orderByChild('created_at')` | `query()` |

> **Index cần thêm vào Firebase rules** để sort theo `created_at`:
> ```json
> "domains": { ".indexOn": ["created_at", "status"] }
> ```


