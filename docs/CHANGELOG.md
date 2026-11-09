# Nhật ký thay đổi – GSS TMS

Repo khởi tạo ngày 09/11/2026 từ mã nguồn GSS_LOGISTICs (master `1d7884c`), không mang lịch sử git cũ.
Nhật ký của hệ thống trước đó không chuyển sang repo này.

## 2026-11-09 – GĐ0: copy, gọt, chốt mô hình (đặc tả §7.2)

- Repo mới, quét gitleaks trước commit đầu, tạo mới bí mật.
- Bỏ phân hệ lương, hợp đồng lao động, chấm công, thuế TNCN; giữ danh bạ nhân viên.
- Bỏ lớp quyền Legacy*, lệnh chuyển đổi cũ, thư viện hashids; thêm mã công khai UUIDv7 (`public_id`).
- Bỏ cổng tài xế cũ `/driver/` (tài xế dùng trang QR lệnh `/q/<token>/`), các lệnh dữ liệu mẫu/đồng bộ của hệ thống cũ.
- Xoá dấu vết TVL trong mã, test, giao diện; đổi mã loại chi phí `TVL_COST`/`TVL_OBH` thành `COMPANY_COST`/`COMPANY_OBH`.
