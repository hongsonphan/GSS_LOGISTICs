# Chính sách bảo mật

## Báo cáo lỗ hổng

Không mở Issue công khai cho lỗ hổng. Dùng **GitHub → Security → Report a vulnerability** (báo cáo riêng) hoặc liên hệ trực tiếp người quản trị dự án. Nêu: thành phần bị ảnh hưởng, các bước tái hiện, mức ảnh hưởng (đặc biệt: lộ dữ liệu giữa các công ty, lộ token/link công khai, sai số tiền).

Mục tiêu phản hồi: xác nhận trong 3 ngày làm việc; vá lỗi nghiêm trọng trong 14 ngày.

## Phạm vi

Mã nguồn trong repo này và hệ thống GSS TMS đang chạy. Ngoài phạm vi: tấn công từ chối dịch vụ, kỹ thuật xã hội, hạ tầng của bên thứ ba.

## Nguyên tắc

- Không đưa khoá SSH, secret, mật khẩu, domain máy chủ vào repo (`.gitignore`, hook `.githooks/pre-commit`, CI gitleaks cùng chặn).
- Cách ly dữ liệu giữa công ty bằng lọc ORM và PostgreSQL Row-Level Security; liên kết công khai dùng `public_id`/token.
- Chi tiết kỹ thuật: [docs/08-security.md](docs/08-security.md), [docs/16-data-security-dr.md](docs/16-data-security-dr.md).
