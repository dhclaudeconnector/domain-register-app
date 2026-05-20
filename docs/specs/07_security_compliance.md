# Section 7 — Security & Compliance

---

## 7.1 Threat Model

| Threat | Mô tả | Mức độ |
|--------|-------|--------|
| T-01 | API credentials bị lộ qua client-side code hoặc network | 🔴 Critical |
| T-02 | Người dùng trái phép đọc/ghi data của user khác trên Firebase | 🔴 Critical |
| T-03 | Man-in-the-middle (MITM) khi gọi API bên ngoài | 🟠 High |
| T-04 | Injection qua tên domain (XSS, special chars) | 🟡 Medium |
| T-05 | Firebase Database Rules quá lỏng (world-readable) | 🔴 Critical |
| T-06 | Brute-force đăng nhập Firebase Auth | 🟡 Medium |

---

## 7.2 Authentication & Authorization

### 7.2.1 Firebase Authentication

- **Phương thức:** Google Sign-In (OAuth 2.0) qua Firebase Auth SDK
- **Session:** Firebase ID Token (JWT, tự động refresh sau 1 giờ)
- **Authorization:** Mọi Firebase Database read/write đều yêu cầu `auth.uid` hợp lệ (xem Security Rules ở Section 5)

```
User ──Google OAuth──► Firebase Auth ──► ID Token (JWT)
                                              │
                        Firebase DB Rules ────► Validate auth.uid
                        khớp với path $uid     (access granted/denied)
```

### 7.2.2 API Credentials Authorization Flow

```
1. User đăng nhập qua Firebase Auth → nhận Firebase ID Token
2. App đọc credentials từ Firebase DB (đã authenticated)
3. Credentials được giữ trong memory (React state / Zustand store)
4. Dùng credentials để gọi Cloudflare API và DPDNS API
5. Credentials KHÔNG bao giờ được persist vào localStorage
6. Khi user logout → state bị clear → credentials mất khỏi memory
```

---

## 7.3 Data Protection — API Credentials

### 7.3.1 Lưu trữ trong Firebase

| Phương án | Ưu điểm | Nhược điểm | Quyết định |
|-----------|---------|------------|------------|
| Plaintext trong Firebase DB | Đơn giản | Lộ nếu Firebase rules sai | ❌ Không dùng |
| Mã hoá AES-256 phía client trước khi lưu | Bảo mật cao, client-side | Cần quản lý encryption key | ✅ Recommended |
| Firebase Secret Manager | Tốt nhất | Cần server-side (Functions) | 🔶 Optional upgrade |

**Phương án chọn:** Mã hoá AES-256-GCM phía client, key được derive từ Firebase UID + một salt cố định trong `.env`.

```typescript
// Pseudo-code
import CryptoJS from 'crypto-js';

const ENCRYPT_KEY = process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT + user.uid;

// Encrypt trước khi lưu Firebase
const encrypted = CryptoJS.AES.encrypt(plainToken, ENCRYPT_KEY).toString();

// Decrypt khi đọc từ Firebase
const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPT_KEY).toString(CryptoJS.enc.Utf8);
```

### 7.3.2 Hiển thị trên UI

- Credentials luôn hiển thị dạng **masked**: `eyJhbG...****...cCI6`
- Có nút **"Reveal"** cần click để xem toàn bộ (tự ẩn lại sau 10 giây)
- **Không copy-paste** credentials vào URL params hay query strings

---

## 7.4 HTTPS & Transport Security

| Kết nối | Protocol | Certificate |
|---------|----------|-------------|
| Browser → Vercel (app) | HTTPS/TLS 1.3 | Auto-managed (Vercel) |
| Browser → Cloudflare API | HTTPS/TLS 1.3 | Cloudflare cert |
| Browser → DPDNS API | HTTPS/TLS 1.2+ | DigitalPlat cert |
| Browser → Firebase DB | HTTPS + WSS | Google cert |

- Tất cả HTTP calls được enforce HTTPS trong code (không dùng `http://`)
- HSTS header được bật tự động trên Vercel

---

## 7.5 Input Validation & Sanitization

| Input | Validation Rule |
|-------|----------------|
| Subdomain name | Regex: `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`, tối đa 63 ký tự |
| Namespace | Chỉ cho phép giá trị trong whitelist: `.dpdns.org`, `.us.kg`, `.qzz.io`, `.xx.kg` |
| DPDNS Token | Non-empty, trim whitespace, không cho chứa ký tự newline |
| Cloudflare Email | Validate RFC 5322 email format |
| Cloudflare API Key | Non-empty, length 37 chars (Cloudflare Global API Key format) |
| Notes field | Max 500 chars, HTML-escaped trước khi lưu |

- Tất cả validation dùng **Zod schema** để đảm bảo type-safe
- Server-side (Firebase Rules) validate thêm ở tầng DB (schema `.validate`)

---

## 7.6 Firebase Security Rules — Best Practices

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        "domains": {
          "$domainId": {
            ".validate": "newData.hasChildren(['fqdn', 'status', 'created_at'])
              && newData.child('fqdn').isString()
              && newData.child('status').val().matches(/^(active|pending|error|deleted)$/)
              && newData.child('created_at').isNumber()"
          }
        }
      }
    }
  }
}
```

**Nguyên tắc chính:**
- Default deny tất cả (`".read": false, ".write": false` tại root)
- Whitelist từng path cần thiết
- Validate schema data tại tầng DB

---

## 7.7 Compliance Checklist

| Item | Status | Ghi chú |
|------|--------|---------|
| HTTPS enforced cho mọi API call | ✅ | Vercel + all external APIs |
| Không lưu credentials trong localStorage/sessionStorage | ✅ | Dùng Firebase + memory only |
| Firebase Auth bắt buộc trước khi access data | ✅ | Rules enforce |
| Credentials masked trên UI | ✅ | Reveal button |
| Input validation chặt chẽ cho domain name | ✅ | Zod + whitelist |
| Firebase Security Rules không world-readable | ✅ | `$uid === auth.uid` |
| Không log credentials vào console ở production | ✅ | `process.env.NODE_ENV === 'development'` guard |
| Xác nhận 2 bước trước khi xoá domain | ✅ | Confirmation dialog |

---

## 7.8 Rủi ro tồn dư (Residual Risks)

| Risk | Mức độ còn lại | Giải thích |
|------|---------------|------------|
| Cloudflare Global API Key scope rộng | 🟡 Medium | Key có thể làm mọi thứ trên account. Khuyến khích dùng API Token thay thế trong future version. |
| DPDNS API không có rate limiting rõ ràng | 🟡 Medium | Có thể bị block nếu spam request. App cần debounce ở phía client. |
| Client-side encryption key từ UID | 🟡 Medium | Nếu attacker có UID + salt thì decrypt được. Future: dùng Firebase Functions để làm proxy. |
