# Section 3 — User Stories

---

## 3.1 Personas

### Persona 1 — Tuấn (Solo Developer)
- **Vai trò:** Freelancer, tự build side project
- **Kỹ năng:** Biết dùng API, quen Cloudflare, không muốn mất thời gian làm thủ công
- **Mục tiêu:** Đăng ký 1–3 domain miễn phí cho các project demo, staging environment
- **Pain point:** Phải vào 2 dashboard khác nhau, copy-paste nameserver thủ công, quên đã tạo domain nào

### Persona 2 — Linh (DevOps tại startup nhỏ)
- **Vai trò:** Quản lý infra cho team 5 người
- **Kỹ năng:** Thành thạo CLI và API automation
- **Mục tiêu:** Quản lý nhiều domain cho các môi trường dev/staging, theo dõi trạng thái từng domain
- **Pain point:** Không có audit trail, không biết ai tạo domain nào và lúc nào

### Persona 3 — Minh (Học sinh / Sinh viên)
- **Vai trò:** Học lập trình, build portfolio
- **Kỹ năng:** Biết cơ bản về web, mới làm quen DNS
- **Mục tiêu:** Có một domain miễn phí để deploy project cá nhân
- **Pain point:** Quy trình DNS phức tạp, dễ nhầm bước, không biết nameserver là gì

---

## 3.2 User Stories

---

### Epic 1 — Thiết lập nhiều tài khoản API Credentials

**US-001 — Quản lý danh sách tài khoản API Credentials**
> As a **Tuấn (developer)**,
> I want to **lưu và quản lý danh sách nhiều tài khoản (mỗi tài khoản gồm DPDNS và Cloudflare API)**,
> So that **tôi có thể dễ dàng quản lý domain cho các tổ chức, khách hàng hoặc tài khoản cá nhân khác nhau**.

**Acceptance Criteria:**
- [ ] Có giao diện hiển thị danh sách các tài khoản đang cấu hình.
- [ ] Mỗi tài khoản hiển thị: Friendly Name, Cloudflare Email và các badge trạng thái kết nối DPDNS / Cloudflare.
- [ ] Có thể bấm nút "Add Account" để mở form thêm mới.
- [ ] Có thể nhấn Edit hoặc Delete cho từng tài khoản riêng biệt.
- [ ] Tự động chuyển đổi dữ liệu từ thiết lập đơn cũ sang danh sách tài khoản (auto-migration).
- [ ] Cấu hình lưu vào Firebase Realtime Database dưới node `/users/{uid}/settings/accounts/{accountId}`.

---

**US-002 — Thêm mới và chỉnh sửa tài khoản API Credentials**
> As a **Tuấn (developer)**,
> I want to **nhập đầy đủ API credentials của DPDNS và Cloudflare trong cùng một form và kiểm tra kết nối**,
> So that **tôi biết chắc chắn cấu hình là chính xác trước khi lưu**.

**Acceptance Criteria:**
- [ ] Form gồm các trường: Friendly Name, DPDNS Token, Cloudflare Email, Account ID (tự động điền nếu trống), Cloudflare Global API Key.
- [ ] Cho phép test riêng biệt kết nối DPDNS (qua API list domains) và Cloudflare (qua user profile verification API).
- [ ] Hiển thị thông báo thành công hoặc lỗi cụ thể cho từng API.
- [ ] Khi lưu, thực hiện verify lại cả hai kết nối trước khi hoàn tất lưu thông tin (ở dạng mã hóa AES-256).

---

### Epic 2 — Đăng ký Domain

**US-010 — Đăng ký domain mới sử dụng tài khoản được chọn**
> As a **Tuấn (developer)**,
> I want to **chọn một tài khoản API phù hợp từ danh sách trước khi đăng ký domain**,
> So that **domain được quản lý đúng tài khoản Cloudflare và tài khoản DPDNS mà tôi mong muốn**.

**Acceptance Criteria:**
- [ ] Form đăng ký có trường dropdown chọn tài khoản (AccountId).
- [ ] Dropdown hiển thị: Tên tài khoản và Cloudflare email. Nếu chỉ có 1 tài khoản, tự động chọn tài khoản đó.
- [ ] Nếu chưa cấu hình tài khoản nào, modal hiển thị cảnh báo và chuyển hướng người dùng đến trang Settings.
- [ ] Hiển thị step indicator với 3 bước sử dụng API credentials của tài khoản đã chọn.
- [ ] Sau khi đăng ký thành công, lưu `credentialAccountId` vào domain record của Firebase.

---

**US-011 — Xem tiến trình đăng ký**
> As a **Minh (sinh viên)**,
> I want to **thấy rõ từng bước đang diễn ra trong quá trình đăng ký**,
> So that **tôi hiểu hệ thống đang làm gì và biết khi nào xong**.

**Acceptance Criteria:**
- [ ] Hiển thị 3 bước với icon trạng thái.
- [ ] Mỗi bước có mô tả ngắn bằng tiếng Việt.
- [ ] Sau khi hoàn thành toàn bộ: tự động đóng modal hoặc hiển thị summary thành công.

---

### Epic 3 — Xem & Quản lý Domain

**US-020 — Xem danh sách domain kèm thông tin tài khoản**
> As a **Linh (DevOps)**,
> I want to **thấy danh sách tất cả domain đã đăng ký cùng thông tin tài khoản Cloudflare quản lý nó**,
> So that **tôi biết chính xác domain nào được quản lý bởi tài khoản nào**.

**Acceptance Criteria:**
- [ ] Mỗi domain hiển thị thêm nhãn (badge) ghi email Cloudflare của tài khoản liên kết (`CF: user@email.com`).
- [ ] Dữ liệu cập nhật realtime (Firebase `onValue` listener).
- [ ] Có thể copy nhanh nameserver.

---

**US-030 — Sửa nameserver domain**
> As a **Linh (DevOps)**,
> I want to **cập nhật nameserver của domain đã đăng ký**,
> So that **tôi có thể chuyển domain sang DNS provider khác nếu cần**.

**Acceptance Criteria:**
- [ ] Có nút Edit trên mỗi domain row.
- [ ] Cập nhật nameservers đồng bộ lên DigitalPlat bằng tài khoản liên kết của domain.
- [ ] `updated_at` được cập nhật trong Firebase.

---

**US-040 — Xoá domain với tùy chọn API cleanup và fallback tài khoản**
> As a **Tuấn (developer)**,
> I want to **chọn cách thức xóa domain phù hợp kể cả khi tài khoản liên kết gốc đã bị xóa**,
> So that **tôi có thể dọn dẹp domain khỏi DPDNS/Cloudflare hoặc chỉ dọn dẹp record trong cơ sở dữ liệu**.

**Acceptance Criteria:**
- [ ] Dialog hiển thị tài khoản thực thi API cleanup (mặc định chọn tài khoản liên kết gốc).
- [ ] Nếu tài khoản liên kết gốc bị thiếu/bị xóa, dialog hiển thị cảnh báo và cho phép chọn tài khoản hoạt động khác để gọi API xóa domain.
- [ ] Cung cấp lựa chọn "Delete from app only" (chỉ xóa Firebase record, không gọi các API).
- [ ] Checkbox: "Also delete Cloudflare Zone" chỉ xuất hiện khi không chọn chế độ delete-only.
- [ ] Sau khi xóa, record Firebase được xóa và cập nhật danh sách realtime.


---

## 3.3 Story Map (Priority Matrix)

```
HIGH VALUE / LOW EFFORT (Do First)
  US-001  Lưu DigitalPlat Token
  US-002  Lưu Cloudflare Credentials
  US-010  Đăng ký domain mới (core flow)
  US-020  Xem danh sách domain

HIGH VALUE / HIGH EFFORT (Plan Carefully)
  US-011  Step indicator đăng ký
  US-030  Sửa nameserver

MEDIUM VALUE / LOW EFFORT (Quick Wins)
  US-040  Xoá domain

LOW VALUE / HIGH EFFORT (Backlog)
  US-033  Thêm ghi chú domain
  US-043  Xoá Cloudflare zone khi delete
```
