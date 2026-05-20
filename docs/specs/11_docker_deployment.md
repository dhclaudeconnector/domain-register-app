# Section 11 — Docker Deployment

> **Updated:** Thêm cấu hình Docker hỗ trợ chạy local và production tối ưu bằng Next.js Standalone.

---

## 11.1 Tổng quan

Tài liệu này đặc tả quy trình và cách thức đóng gói ứng dụng **Domain Register App** dưới dạng Docker container. Để đảm bảo hiệu suất tốt nhất và tối ưu hóa dung lượng lưu trữ trên server, dự án sử dụng tính năng **Standalone Output** của Next.js kết hợp với **Multi-stage Docker Build**.

Mục tiêu thiết kế:
- Giảm dung lượng Docker image xuống mức tối thiểu (dưới 200MB thay vì ~1GB nếu dùng node_modules thông thường).
- Không chạy container bằng quyền root (sử dụng user hệ thống `nextjs` không có đặc quyền).
- Tách biệt rõ ràng giữa biến môi trường ở **Build-time** và **Runtime**.

---

## 11.2 Dockerfile Cấu trúc & Tối ưu hóa

Ứng dụng sử dụng một `Dockerfile` duy nhất với ba giai đoạn build (Multi-stage build):

### Stage 1: Cài đặt Dependencies (`deps`)
- Sử dụng base image `node:20-alpine`.
- Thêm thư viện `libc6-compat` (được Next.js khuyên dùng để tránh lỗi tương thích của Node/Native modules trên Alpine).
- Chạy `npm ci` để cài đặt dependencies một cách sạch sẽ, nhanh chóng dựa trên `package-lock.json`.

### Stage 2: Xây dựng ứng dụng (`builder`)
- Sao chép toàn bộ code dự án vào workspace.
- Khai báo các `ARG` để nhận các biến cấu hình từ bên ngoài.
- Thiết lập môi trường build `ENV` tương ứng cho các biến `NEXT_PUBLIC_*` để Next.js nhúng vào mã nguồn JS (inlining) trong quá trình biên dịch.
- Chạy lệnh `npm run build` để tạo thư mục standalone `.next/standalone`.

### Stage 3: Khởi chạy ứng dụng (`runner`)
- Chỉ sao chép những thành phần tối thiểu từ giai đoạn `builder`:
  - Thư mục tĩnh `public/` (để phục vụ file ảnh, favicon...).
  - Thư mục tĩnh đã biên dịch `.next/static/` (copy vào `.next/static/` của môi trường chạy).
  - Thư mục standalone `.next/standalone/` (được copy thẳng vào thư mục gốc `/app/`).
- Tạo group `nodejs` và user `nextjs` không có quyền sudo.
- Mở cổng `3000` và khởi chạy node server qua file `server.js` (do Next.js standalone tự động sinh ra).

---

## 11.3 Docker Compose Cấu hình

Tệp `docker-compose.yml` định nghĩa service `domain-register-app`:

- **Build context**: Thư mục hiện tại `.`.
- **Build arguments**: Được map trực tiếp với các biến môi trường của hệ thống host thông qua cú pháp `${VARIABLE_NAME}`. Docker Compose sẽ tự động phân giải các biến này từ file `.env` nằm cùng thư mục khi thực hiện build.
- **Ports**: Ánh xạ cổng `3000` của host tới cổng `3000` của container.
- **Env File**: Nạp tệp cấu hình `.env.local` ở runtime để container đọc các biến cấu hình server-side (ví dụ: `DPDNS_CLOUDFLARED_MANAGER_BACKEND_API_SECRET_KEY`).
- **Restart Policy**: Thiết lập `always` để tự động khởi động lại ứng dụng nếu xảy ra crash hoặc khi Docker daemon khởi động lại.

---

## 11.4 Quản lý Biến Môi Trường (Environment Variables)

### Build-time Variables
Vì Next.js là một Single Page Application (SPA), các biến có tiền tố `NEXT_PUBLIC_` phải được nạp vào client bundle tại thời điểm build. Nếu thiếu các biến này khi chạy `npm run build`, các tính năng gọi API, Firebase auth sẽ bị lỗi kết nối.

Các biến này bắt buộc phải khai báo dưới dạng `ARG` trong `Dockerfile` và được truyền vào khi build:
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_APP_ID`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ALLOWED_EMAILS`

### Runtime Variables
Các biến không chứa tiền tố `NEXT_PUBLIC_` (chạy hoàn toàn ở server-side) hoặc các cấu hình cổng chạy có thể được thay đổi động ở thời điểm chạy container:
- `PORT` (Mặc định: 3000)
- `HOSTNAME` (Mặc định: 0.0.0.0 để Docker binding hoạt động)
- `DPDNS_CLOUDFLARED_MANAGER_BACKEND_API_SECRET_KEY`

---

## 11.5 Hướng dẫn vận hành nhanh

### Chuẩn bị môi trường
1. Tạo file `.env.local` chứa các cấu hình kết nối Firebase và mã hóa:
   ```bash
   cp .env.example .env.local
   # Điền đầy đủ thông tin vào .env.local
   ```
2. Tạo bản sao `.env` (Docker Compose build sẽ sử dụng file này để truyền các Build arguments):
   ```bash
   cp .env.local .env
   ```

### Khởi chạy bằng Docker Compose
```bash
# Build và chạy ứng dụng
docker compose up --build -d

# Xem log hoạt động
docker compose logs -f

# Dừng ứng dụng
docker compose down
```

### Khởi chạy bằng Docker CLI trực tiếp
```bash
# Build Image
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

# Chạy Container
docker run -d -p 3000:3000 --env-file .env.local --name domain-register-app domain-register-app
```
