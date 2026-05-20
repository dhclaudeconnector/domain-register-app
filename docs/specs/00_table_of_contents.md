# Domain Register App — Project Specification

> **Mô tả ngắn:** Ứng dụng web quản lý domain miễn phí: đăng ký domain qua DigitalPlat DPDNS API, tự động thêm vào Cloudflare lấy nameserver, rồi cập nhật lại nameserver vào DPDNS. Dữ liệu lưu trữ trên Firebase Realtime Database. Hỗ trợ lưu API key trước, tạo/sửa/xoá domain, có timestamp đầy đủ.

---

## Table of Contents

| # | Section | Mô tả | Est. Pages |
|---|---------|-------|------------|
| 1 | Project Overview | Mục tiêu, phạm vi, stakeholder, luồng nghiệp vụ chính | 2 |
| 2 | Requirements | Functional requirements (FR-001…) + Non-functional (NFR-001…) | 3 |
| 3 | User Stories | Personas, stories "As a… I want… So that…", acceptance criteria | 2 |
| 4 | System Architecture | Kiến trúc tổng thể, data flow, tech stack, deployment | 3 |
| 5 | Data Model | Firebase schema, entities, relationships, field definitions | 2 |
| 6 | API / Interface Design | DPDNS API + Cloudflare API endpoints, UI screen flows | 4 |
| 7 | Security & Compliance | Bảo mật API key, xác thực, mã hoá dữ liệu nhạy cảm | 2 |
| 8 | Milestones & Timeline | Phases, deliverables, target dates, critical path | 1–2 |
| 9 | Risks & Mitigations | Risk register: likelihood, impact, mitigation | 1 |
| 10 | Open Questions | Các quyết định còn TBD, owner, deadline | 1 |
| 11 | Docker Deployment | Cấu trúc container Docker, build arguments và Compose | 1 |

---

## External APIs Referenced

| API | Base URL | Auth Method | Dùng để |
|-----|----------|-------------|---------|
| DigitalPlat Domain API | `https://dash.domain.digitalplat.org` | Bearer JWT Token | Đăng ký domain, cập nhật NS |
| Cloudflare API v4 | `https://api.cloudflare.com/client/v4` | X-Auth-Email + X-Auth-Key (Global API Key) | Tạo zone, lấy nameserver |
| Firebase Realtime Database | `https://<project>.firebaseio.com` | Firebase Admin SDK / REST | Lưu trữ toàn bộ dữ liệu |

---

## Spec Status

| # | Section | Status |
|---|---------|--------|
| 0 | Table of Contents | ✅ Complete |
| 1 | Project Overview | ✅ Complete |
| 2 | Requirements | ✅ Complete |
| 3 | User Stories | ✅ Complete |
| 4 | System Architecture | ✅ Complete |
| 5 | Data Model | ✅ Complete |
| 6 | API / Interface Design | ✅ Complete |
| 7 | Security & Compliance | ✅ Complete |
| 8 | Milestones & Timeline | ✅ Complete |
| 9 | Risks & Mitigations | ✅ Complete |
| 10 | Open Questions | ✅ Complete |
| 11 | Docker Deployment | ✅ Complete |

**Total estimated sections:** 11
**Status:** 11 / 11 sections complete
