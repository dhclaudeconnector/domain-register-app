# Section 2 — Requirements

---

## 2.1 Functional Requirements

### Module A — API Credentials Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Người dùng có thể thêm nhiều tài khoản API Credentials khác nhau. Mỗi tài khoản được đặt một tên thân thiện (Friendly Account Name). | MUST |
| FR-002 | Mỗi tài khoản bao gồm **DigitalPlat API Token** (Bearer), **Cloudflare Email**, **Cloudflare Account ID** (tự động phát hiện nếu bỏ trống) và **Global API Key**. | MUST |
| FR-003 | Các tài khoản API credentials được lưu vào Firebase Realtime Database dưới node `/settings/accounts/{accountId}`. | MUST |
| FR-004 | DPDNS API Token và Cloudflare Global API Key được hiển thị dạng masked (ẩn ký tự) và được mã hóa AES-256 trước khi lưu. | MUST |
| FR-005 | Người dùng có thể xem danh sách tài khoản, chỉnh sửa hoặc xóa bất kỳ cấu hình tài khoản nào. | MUST |
| FR-006 | Hệ thống kiểm tra tính hợp lệ của từng API độc lập (DPDNS Token, Cloudflare API Key) trước khi lưu. | SHOULD |
| FR-007 | Hệ thống tự động di chuyển (migrate) cấu hình đơn cũ tại `/settings/credentials` sang danh sách tài khoản mới với nhãn mặc định "Default Account". | MUST |

---

### Module B — Domain Registration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-010 | Người dùng nhập subdomain muốn đăng ký và chọn namespace (`.dpdns.org`, `.us.kg`, `.qzz.io`, `.xx.kg`). | MUST |
| FR-011 | Hệ thống kiểm tra domain có khả dụng (available) trước khi tiến hành đăng ký. | SHOULD |
| FR-012 | Hệ thống yêu cầu người dùng chọn tài khoản API Credentials để thực hiện đăng ký qua dropdown selector. | MUST |
| FR-013 | Hệ thống tự động gọi **Cloudflare API `POST /zones`** sử dụng credentials của tài khoản đã chọn để tạo zone mới. | MUST |
| FR-014 | Sau khi tạo zone thành công, hệ thống trích xuất `name_servers[]` từ response Cloudflare. | MUST |
| FR-015 | Hệ thống tự động gọi **DigitalPlat API** để đăng ký domain với nameservers và token tương ứng từ tài khoản đã chọn. | MUST |
| FR-016 | Toàn bộ quá trình hiển thị tiến trình từng bước (step indicator) cho người dùng. | MUST |
| FR-017 | Nếu bất kỳ bước nào thất bại, hệ thống hiển thị lỗi và rollback (xoá zone Cloudflare zone đã tạo nếu đăng ký DPDNS thất bại). | MUST |
| FR-018 | Record của domain sau khi đăng ký thành công sẽ lưu kèm ID của tài khoản liên kết (`credentialAccountId`). | MUST |

---

### Module C — Domain Listing, Filtering & Expiry Details

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-020 | Danh sách tất cả domain đã đăng ký được hiển thị realtime từ Firebase. | MUST |
| FR-021 | Mỗi domain entry hiển thị: tên domain, nameservers, Cloudflare zone_id, trạng thái, `created_at`, `updated_at`, `expiry_date` và thông tin tài khoản Cloudflare/DPDNS liên kết (Email). | MUST |
| FR-022 | Danh sách domain được sắp xếp theo `created_at` mới nhất lên đầu (mặc định). | SHOULD |
| FR-023 | Người dùng có thể xem chi tiết đầy đủ của một domain bằng cách click vào. | SHOULD |
| FR-024 | Thanh công cụ bộ lọc cho phép tìm kiếm nhanh domain theo FQDN, lọc theo tài khoản liên kết (Account) hoặc theo Namespace. | MUST |
| FR-025 | Hiển thị tuổi thọ domain (domain age). Nếu đã tạo được hơn 60 ngày, hiển thị huy hiệu (badge) cảnh báo `Renewable (60+ days)` cho mục đích gia hạn. | MUST |
| FR-026 | Cơ chế đồng bộ ngày hết hạn (`expiry_date`) định kỳ từ DPDNS API (hoặc bằng nút đồng bộ thủ công) để cập nhật thông tin trong Firebase. | MUST |

---

### Module D — Domain Edit & Manual Import

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-030 | Người dùng có thể chỉnh sửa nameservers của domain đã đăng ký. | MUST |
| FR-031 | Khi nameserver được cập nhật, hệ thống gọi DigitalPlat API sử dụng API credentials của tài khoản đã chọn để cập nhật NS đồng thời. | MUST |
| FR-032 | Sau khi cập nhật thành công, `updated_at` trong Firebase được cập nhật. | MUST |
| FR-033 | Người dùng có thể thêm ghi chú (notes/description) cho từng domain. | COULD |
| FR-034 | Hỗ trợ thêm thủ công domain (Manual Import) không thông qua API đăng ký tự động. Cho phép điền subdomain, chọn namespace, tài khoản DPDNS và Cloudflare Zone ID (tùy chọn). | MUST |

---

### Module E — Domain Delete

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-040 | Người dùng có thể xoá domain khỏi danh sách quản lý của ứng dụng. | MUST |
| FR-041 | Trước khi xoá, hệ thống hiển thị confirmation dialog với tên domain để xác nhận. | MUST |
| FR-042 | Xoá domain sẽ thực hiện API cleanup (xoá DPDNS domain) dựa trên tài khoản liên kết đã lưu. | MUST |
| FR-043 | Hệ thống cung cấp tuỳ chọn đồng thời xoá Cloudflare zone khi xoá domain (checkbox opt-in). | COULD |
| FR-044 | Nếu tài khoản liên kết với domain đã bị xóa khỏi ứng dụng hoặc không có sẵn, dialog cho phép chọn một tài khoản hoạt động khác hoặc chọn "Delete từ app duy nhất" (Firebase record only) mà không gọi API. | MUST |

---

### Module F — API Diagnostics Playground & Saved Assets

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-050 | Trang Settings phân chia thành các Tab: Credentials Manager (quản lý tài khoản) và API Playground (chẩn đoán API). | MUST |
| FR-051 | API Playground cung cấp trình chạy API cho tất cả các API của DPDNS (list, profile, register) và Cloudflare (zones, dns records, tunnels) với form nhập tham số linh hoạt. | MUST |
| FR-052 | Cho phép xem phản hồi JSON của các API dưới định dạng đẹp mắt và cung cấp chức năng lưu trữ kết quả cấu hình (như danh sách Tunnel/DNS Records) làm Diagnostic Asset trong cơ sở dữ liệu Firebase để tra cứu ngoại tuyến. | MUST |

---

### Module G — Backend Account Manager API & Security

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-060 | Cung cấp API backend `POST /api/accounts` cho phép gọi từ ngoài vào để quản lý (thêm/cập nhật) tài khoản credentials. | MUST |
| FR-061 | API backend bắt buộc được xác thực bằng Header `Authorization: Bearer <DPDNS_CLOUDFLARED_MANAGER_BACKEND_API_SECRET_KEY>`, sử dụng khóa bí mật cấu hình qua biến môi trường. Nếu không khớp sẽ bị từ chối với mã lỗi 401 Unauthorized. | MUST |
| FR-062 | Cho phép thêm/cập nhật thông tin credentials theo từng service riêng lẻ (DPDNS hoặc Cloudflare) chỉ bằng cách truyền `email` định danh. | MUST |
| FR-063 | Logic kiểm tra: tìm tài khoản theo `email` trong danh sách accounts của user. Nếu tồn tại, cập nhật credentials của service tương ứng; nếu chưa tồn tại, tạo mới tài khoản với nhãn mặc định. | MUST |
| FR-064 | Ghi log hệ thống theo ngày (Daily Logging) vào node `/logs/{YYYY-MM-DD}/{timestamp}` đối với mọi hành động gọi API backend (thành công hoặc thất bại). | MUST |

---

### Module H — Login Whitelist & Access Control

| ID | Requirement | Priority |
|-------|-------------|----------|
| FR-070 | Hỗ trợ cấu hình danh sách email được phép đăng nhập ứng dụng thông qua biến môi trường `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ALLOWED_EMAILS`. | MUST |
| FR-071 | Danh sách email trong cấu hình có thể được phân tách bằng các ký tự `;` hoặc `,` hoặc `|`. | MUST |
| FR-072 | Nếu biến môi trường `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ALLOWED_EMAILS` bỏ trống hoặc không được cấu hình, hệ thống mặc định cho phép mọi email đều có thể đăng nhập. | MUST |
| FR-073 | Khi người dùng thực hiện đăng nhập bằng Google Sign-In hoặc khi ứng dụng tải lại phiên cũ (session), hệ thống phải kiểm tra xem email của người dùng có thuộc danh sách được cho phép hay không. | MUST |
| FR-074 | Nếu email của người dùng không được phép truy cập, hệ thống lập tức từ chối, hiển thị thông báo lỗi rõ ràng cho người dùng, tự động đăng xuất tài khoản Firebase và xóa dữ liệu cục bộ để đảm bảo an toàn. | MUST |

---


## 2.2 Non-Functional Requirements

### Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Thời gian hoàn thành luồng đăng ký domain (Cloudflare + DPDNS) kể từ khi bấm "Register". | ≤ 15 giây |
| NFR-002 | Firebase Realtime Database cập nhật danh sách domain sau khi tạo/sửa/xoá. | ≤ 2 giây |
| NFR-003 | Thời gian tải trang đầu tiên (First Contentful Paint). | ≤ 3 giây |

### Security

| ID | Requirement | Ghi chú |
|----|-------------|---------|
| NFR-010 | API credentials (Token, API Key) không được lưu dưới dạng plaintext trong client-side storage (localStorage, sessionStorage). | Xem Section 7 |
| NFR-011 | Firebase Database Rules phải yêu cầu xác thực (authenticated) trước khi đọc/ghi. | Firebase Auth required |
| NFR-012 | Mọi giao tiếp với API (DPDNS, Cloudflare, Firebase) phải qua HTTPS. | Enforced by default |
| NFR-013 | API credentials trong Firebase được lưu dưới dạng mã hoá hoặc dùng Firebase Secret Manager. | Xem Section 7 |

### Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-020 | Hệ thống xử lý lỗi API timeout (DPDNS hoặc Cloudflare không phản hồi) và hiển thị thông báo lỗi thay vì crash. | 100% lỗi được bắt |
| NFR-021 | Retry logic: nếu Cloudflare API thất bại lần đầu do network, tự động retry tối đa 2 lần. | 2 retries |
| NFR-022 | Firebase offline persistence được bật để ứng dụng vẫn hiển thị dữ liệu khi mất kết nối tạm thời. | Enabled |

### Usability

| ID | Requirement | Ghi chú |
|----|-------------|---------|
| NFR-030 | Giao diện responsive, hoạt động trên desktop và mobile (≥ 375px width). | Mobile-friendly |
| NFR-031 | Mọi action có thể gây mất dữ liệu (delete) phải có bước xác nhận rõ ràng. | UX safety |
| NFR-032 | Trạng thái loading/processing phải hiển thị rõ ràng trong quá trình gọi API. | Spinner / progress |

### Maintainability

| ID | Requirement | Ghi chú |
|----|-------------|---------|
| NFR-040 | Code tách biệt rõ ràng giữa: UI layer, API service layer, Firebase service layer. | Clean architecture |
| NFR-041 | API endpoints và base URLs được cấu hình qua environment variables (`.env`), không hardcode. | 12-factor app |
| NFR-042 | Tất cả API calls được log (request/response summary) vào browser console ở development mode. | Debug friendly |
