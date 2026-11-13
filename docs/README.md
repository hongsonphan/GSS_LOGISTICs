# TÀI LIỆU GSS TMS – MỤC LỤC

> **Hệ thống:** GSS TMS (Green Solutions Smart) · dự án GSS-TMS-2026
> **Quy tắc làm việc của AI/lập trình viên:** [`../CLAUDE.md`](../CLAUDE.md) (đọc trước) · **Nhật ký thay đổi:** [`CHANGELOG.md`](CHANGELOG.md)
> Tên file theo quy ước `NN-chu-de.md`: NN là số thứ tự liên tục (01, 02…), chủ đề viết tiếng Anh, chữ thường, nối bằng gạch ngang. Mỗi chủ đề **một file duy nhất**; không tạo bản sao.

## Bản đồ tài liệu

| Nhóm | File | Nội dung | Tình trạng |
|---|---|---|---|
| **Nghiệp vụ** | [`01-spec-brd.md`](01-spec-brd.md) | Đặc tả nghiệp vụ và lộ trình giai đoạn của GSS (nguồn yêu cầu gốc) | Hiện hành |
| | [`02-operational-workflow.md`](02-operational-workflow.md) | Quy trình điều vận, máy trạng thái chuyến, vòng đời chi phí | Kế thừa BIM, cần rà lại |
| | [`03-features.md`](03-features.md) | Danh mục tính năng đã lập trình (tài liệu sống; ghi việc xong vào đây) | Kế thừa BIM, đang rà soát |
| | [`04-user-guide.md`](04-user-guide.md) | Sổ tay người dùng; nguồn của trang `/helps` (chạy `scripts/build_help_page.py`) | Kế thừa BIM, cần rà lại |
| **Kỹ thuật** | [`05-architecture.md`](05-architecture.md) | Kiến trúc tổng quan (C4), cấu trúc thư mục, bất biến kiến trúc, hạ tầng và email | Kế thừa, cần rà lại |
| | [`06-database.md`](06-database.md) | Sơ đồ dữ liệu hiện hành (phần A) + danh mục bảng kế thừa (phụ lục B) | A hiện hành, B cần rà lại |
| | [`07-api-reference.md`](07-api-reference.md) | Hợp đồng REST API | Kế thừa, cần rà lại |
| | [`08-security.md`](08-security.md) | Chuẩn an ninh và bảo vệ dữ liệu cá nhân | Kế thừa, cần rà lại |
| | [`09-coding-standards.md`](09-coding-standards.md) | Quy chuẩn lập trình và kiến trúc mã | Kế thừa, cần rà lại |
| | [`10-ui-ux-guidelines.md`](10-ui-ux-guidelines.md) | Nguyên tắc giao diện; mục 12 là quy định riêng của GSS (ưu tiên hơn khi mâu thuẫn) | Hiện hành |
| **Vận hành** | [`11-runbook.md`](11-runbook.md) | Chạy local, triển khai, sao lưu, giới hạn đã biết | Hiện hành |
| | [`15-deployment-guide.md`](15-deployment-guide.md) | Hướng dẫn chi tiết đưa dự án lên GitHub & triển khai VPS | Hiện hành |
| **Kế hoạch** | [`12-backlog.md`](12-backlog.md) | Việc tồn đọng và câu hỏi chờ quyết (Team Leader đọc đầu mỗi phiên) | Hiện hành |
| | [`13-architecture-decisions.md`](13-architecture-decisions.md) | Quyết định kiến trúc đã chốt, phân tích tái cấu trúc (đọc §0 trước) và ADR kế thừa | Một phần đã đổi sau GĐ0 |
| **Đội AI** | [`14-ai-team.md`](14-ai-team.md) | Sơ đồ đội AI, quy trình phối hợp, nguyên tắc hành vi | Hiện hành |
| **Rules** | [`.agents/rules/backend-rules.md`](../.agents/rules/backend-rules.md) | Bộ quy tắc lập trình Backend tách biệt (chuẩn bị cho Skill) | Hiện hành |
| | [`.agents/rules/uiux-rules.md`](../.agents/rules/uiux-rules.md) | Bộ quy tắc thiết kế & kiểm thử UI/UX tách biệt (chuẩn bị cho Skill) | Hiện hành |
| **archive/** | [`archive/`](archive/) | Báo cáo và kế hoạch đã hoàn tất, chỉ để tra cứu | Không sửa nữa |

Bất biến kiến trúc (không xóa cứng, máy trạng thái tập trung, số liệu tài chính khớp tuyệt đối…) ghi ở [`05-architecture.md`](05-architecture.md) và [`../CLAUDE.md`](../CLAUDE.md).

## Quy ước khi thêm hoặc sửa tài liệu

1. Chủ đề đã có file thì sửa file đó, không tạo file mới trùng chủ đề.
2. File mới lấy số kế tiếp, tên chữ thường kiểu `NN-chu-de.md`; cập nhật bảng trên trong cùng lần sửa. Xóa file thì đánh số lại cho liên tục.
3. Việc đã xong ghi vào `03-features.md` và `CHANGELOG.md`; việc chưa xong ghi vào `12-backlog.md`; báo cáo/kế hoạch đã hoàn tất chuyển vào `archive/`.
4. Đổi tên file thì sửa mọi tham chiếu (`CLAUDE.md`, `.claude/`, `scripts/`, mã nguồn) và chạy `python scripts/qa.py audit` để kiểm tra link.
5. Tài liệu kế thừa từ BIM không còn đúng với GSS thì xóa hoặc viết lại, không để nguyên cho người sau đọc nhầm (đã xóa lộ trình báo cáo BIM cũ; các ADR còn đúng được chuyển vào `13-architecture-decisions.md`).
