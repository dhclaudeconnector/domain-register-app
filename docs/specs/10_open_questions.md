# Section 10 — Open Questions

---

Danh sách các câu hỏi chưa có quyết định cuối cùng, cần được giải quyết trước hoặc trong quá trình phát triển.

---

| # | Câu hỏi | Tác động | Owner | Deadline | Status |
|---|---------|---------|-------|----------|--------|
| OQ-01 | DPDNS API endpoint chính xác cho đăng ký domain là gì? (`/api/v1/domain/register` hay khác?) | Block Phase 1 hoàn toàn | Dev | Trước Ngày 4 | ⏳ Open |
| OQ-02 | DPDNS API dùng Bearer JWT hay session cookie? Cách lấy token từ tài khoản? | Ảnh hưởng toàn bộ auth flow | Dev | Trước Ngày 4 | ⏳ Open |
| OQ-03 | Cloudflare có cho phép tạo zone với subdomain `.dpdns.org` (e.g. `myapp.dpdns.org`) không? | Nếu không → phải redesign flow | Dev | Ngày 4 (test ngay) | ⏳ Open |
| OQ-04 | App sẽ single-user (1 account) hay multi-user? Firebase scoping theo `uid` đã được implement nhưng UI chưa rõ. | Ảnh hưởng Auth UX, settings page | Product Owner | Trước Ngày 1 | ⏳ Open |
| OQ-05 | Credentials mã hoá AES-256 phía client: encryption key có đủ an toàn khi derive từ `uid + salt`? Hay cần Firebase Functions proxy? | Security posture | Dev + Security | Ngày 12 | ⏳ Open |
| OQ-06 | Khi xoá domain khỏi Firebase, có nên gọi DPDNS API để release domain không (hoặc DigitalPlat không có API xoá domain)? | Ảnh hưởng FR-040, FR-043 | Dev | Ngày 11 | ⏳ Open |
| OQ-07 | DigitalPlat có API endpoint để check domain availability không? Hay chỉ biết sau khi cố đăng ký? | FR-011 có thể không implement được | Dev | Ngày 4 | ⏳ Open |
| OQ-08 | Custom domain cho app (e.g. `domains.mycompany.com`) hay dùng Vercel default URL là đủ? | Deployment config | Product Owner | Ngày 14 | ⏳ Open |
| OQ-09 | Có cần limit rate ở client khi gọi DPDNS API để tránh bị block IP không? Debounce bao nhiêu ms? | NFR reliability | Dev | Ngày 6 | ⏳ Open |
| OQ-10 | Firebase project nên ở region nào? (`us-central1` default hay `asia-southeast1` cho latency tốt hơn ở VN?) | Performance NFR-003 | Dev | Ngày 2 | ⏳ Open |

---

## Hướng giải quyết gợi ý

**OQ-01 & OQ-02 (DPDNS API discovery):**
- Bước 1: Đăng nhập `dash.domain.digitalplat.org` → mở DevTools → Network
- Bước 2: Đăng ký 1 domain test → capture tất cả XHR/Fetch requests
- Bước 3: Xem header `Authorization` → xác định token format
- Bước 4: Document lại trong file `docs/dpdns-api-findings.md` trước khi code

**OQ-03 (Cloudflare zone với subdomain):**
- Chạy test `curl` trực tiếp với một domain test (không ảnh hưởng production)
- Nếu thất bại: xem xét dùng Cloudflare DNS API với DigitalPlat NS thay vì tạo zone

**OQ-05 (Encryption strategy):**
- Short-term: Client-side AES với `uid + NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT` (chấp nhận được cho personal use)
- Long-term: Firebase Functions proxy để credentials không bao giờ ra client

**OQ-10 (Firebase region):**
- Chọn `asia-southeast1` (Singapore) nếu user chủ yếu ở Đông Nam Á để giảm latency ~50-100ms
