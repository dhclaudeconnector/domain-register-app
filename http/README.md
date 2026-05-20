# HTTP request suite

Các file `.http` dùng biến trực tiếp từ `.env` / `.env.local` qua cú pháp `{{$dotenv VAR_NAME}}`, tương thích với VS Code REST Client và các HTTP client hỗ trợ dotenv tương tự.

## Cách chạy

1. Copy `.env.example` thành `.env.local` hoặc `.env`.
2. Điền các biến kiểm thử:
   - `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_APP_URL` — ví dụ `http://localhost:3000`
   - `DPDNS_CLOUDFLARED_MANAGER_DPDNS_TEST_TOKEN`, `DPDNS_CLOUDFLARED_MANAGER_DPDNS_TEST_DOMAIN`, `DPDNS_CLOUDFLARED_MANAGER_DPDNS_TEST_SLOT_TYPE`, `DPDNS_CLOUDFLARED_MANAGER_DPDNS_TEST_NS1`, `DPDNS_CLOUDFLARED_MANAGER_DPDNS_TEST_NS2`
   - `DPDNS_CLOUDFLARED_MANAGER_CLOUDFLARE_TEST_EMAIL`, `DPDNS_CLOUDFLARED_MANAGER_CLOUDFLARE_TEST_API_KEY`, `DPDNS_CLOUDFLARED_MANAGER_CLOUDFLARE_TEST_ACCOUNT_ID`, `DPDNS_CLOUDFLARED_MANAGER_CLOUDFLARE_TEST_ZONE_NAME`, `DPDNS_CLOUDFLARED_MANAGER_CLOUDFLARE_TEST_ZONE_ID`
3. Chạy `npm run dev` nếu muốn test proxy routes của Next.js.
4. Mở từng file `.http` và bấm `Send Request` trên request cần chạy.

## Lưu ý an toàn

Các request `DELETE` thật sự xóa domain/zone. DPDNS delete sẽ đưa domain vào `pendingdelete`, DNS dừng ngay và domain chỉ được release sau 7 ngày.
