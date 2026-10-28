# Bảo vệ dữ liệu cá nhân — BIM Logistics TMS

Tài liệu tuân thủ dành cho doanh nghiệp vận hành hệ thống (bên kiểm soát dữ liệu) và nhà cung cấp phần mềm (bên xử lý dữ liệu).
Phiên bản 1.0, ngày 29/10/2026.

> **Căn cứ pháp lý.** Luật Bảo vệ dữ liệu cá nhân (số 91/2025/QH15) và Nghị định 356/2025/NĐ-CP hướng dẫn thi hành
> có hiệu lực từ 01/01/2026, **thay thế Nghị định 13/2023/NĐ-CP**. Tài liệu này mô tả hiện trạng kỹ thuật của hệ thống
> và danh mục việc doanh nghiệp cần làm. Đây không phải ý kiến pháp lý. Thời hạn, biểu mẫu và trường hợp miễn trừ
> cần luật sư hoặc bộ phận pháp chế đối chiếu với văn bản gốc trước khi nộp hồ sơ.

## 1. Vai trò các bên

| Bên | Vai trò | Ví dụ |
|---|---|---|
| Doanh nghiệp sử dụng hệ thống (vd. Triền Võ Logistics) | Bên kiểm soát dữ liệu | Quyết định thu thập dữ liệu nhân viên, tài xế, khách hàng |
| Đơn vị cung cấp, vận hành phần mềm và máy chủ | Bên xử lý dữ liệu | Lưu trữ, sao lưu, bảo trì theo hợp đồng |

Khi bán hệ thống cho doanh nghiệp khác, hợp đồng cần có **điều khoản xử lý dữ liệu**: phạm vi, mục đích, biện pháp bảo vệ,
thời hạn lưu, việc trả lại hoặc xoá dữ liệu khi chấm dứt, và nghĩa vụ báo sự cố.

## 2. Danh mục dữ liệu cá nhân hệ thống xử lý

| Nhóm chủ thể | Dữ liệu | Mức độ | Nơi lưu | Mục đích |
|---|---|---|---|---|
| Nhân viên, tài xế | Họ tên, biệt danh, SĐT, Zalo, email, giới tính, ngày sinh, ảnh đại diện | Cơ bản | `personnel_employee`, `media/avatars` | Quản lý nhân sự, điều phối |
| Nhân viên, tài xế | Số CCCD (ngày cấp, nơi cấp), mã số thuế, số BHXH, địa chỉ thường trú và hiện tại, số bằng lái | Cơ bản, cần hạn chế truy cập | `personnel_employee` | Hợp đồng lao động, BHXH, thuế TNCN |
| Nhân viên, tài xế | Số tài khoản, ngân hàng, chi nhánh, người thụ hưởng; lương cơ bản, lương đóng BH, tạm ứng, bảng lương | **Nhạy cảm** (dữ liệu tài chính, ngân hàng) | `personnel_employee`, bảng lương, phiếu thu chi | Trả lương, tạm ứng, quyết toán |
| Nhân viên | Hợp đồng lao động, chữ ký điện tử | Cần hạn chế truy cập | `media/personnel/` | Hồ sơ lao động |
| Khách hàng, đối tác (cá nhân liên hệ) | Tên người liên hệ, SĐT, email, địa chỉ | Cơ bản | Danh mục khách hàng, đối tác | Báo giá, giao nhận, công nợ |
| Người nhận hàng | Tên, chữ ký trên biên bản giao nhận (POD), ảnh chứng từ | Cơ bản | `media/` chứng từ chuyến | Chứng minh giao hàng |
| Người dùng hệ thống | Tên đăng nhập, mật khẩu (băm PBKDF2), lịch sử thao tác, địa chỉ IP | Cơ bản | `auth_user`, `core_auditlog` | Bảo mật, truy vết |

Hệ thống **không** theo dõi vị trí GPS liên tục của tài xế và **không** lưu dữ liệu sức khoẻ, tôn giáo, sinh trắc học.

## 3. Biện pháp kỹ thuật đã triển khai

| Biện pháp | Chi tiết | Vị trí trong mã |
|---|---|---|
| Phân quyền theo vai trò | Bảng lương và báo cáo tài chính chỉ dành cho Kế toán và Ban Giám đốc. Hồ sơ, hợp đồng nhân sự chỉ dành cho bộ phận Nhân sự hoặc chính chủ. | `core/permissions.py`, `core/media_views.py` |
| Kiểm soát truy cập tệp | Tệp trong `/media/` đi qua kiểm tra quyền, không mở công khai (Nginx X-Accel) | `core/media_views.py` |
| Tách dữ liệu theo doanh nghiệp | Người dùng chỉ thấy dữ liệu công ty mình (`TENANT_ENFORCE`, bật mặc định) | `core/models.py` (`tenant_scope`), `core/tenant.py` |
| Link công khai không đoán được | Link tài xế và link tra cứu vận đơn dùng mã băm có khoá bí mật riêng (`HASHIDS_SALT` trong `.env`) và có thể thu hồi | `core/security.py` |
| Mã hoá đường truyền | HTTPS, HSTS, cookie `Secure` + `HttpOnly`, đăng nhập web bằng phiên (không lưu token trong trình duyệt) | `config/settings.py` |
| Chống tấn công trình duyệt | Content-Security-Policy, X-Frame-Options, `nosniff`, Referrer-Policy; toàn bộ thư viện tự host (không gửi IP người dùng tới CDN bên thứ ba) | `core/security_headers.py`, `static/vendor/` |
| Nhật ký kiểm toán | Ghi ai tạo, sửa, xoá dữ liệu nghiệp vụ, lúc nào, từ IP nào; không sửa được | `core/audit.py`, `AuditLog` |
| Xoá mềm | Chứng từ, dữ liệu nghiệp vụ không bị xoá cứng (phục vụ đối soát, kiểm toán) | `SoftDeleteModel` |
| Bí mật cấu hình | Mật khẩu CSDL, khoá ứng dụng chỉ nằm trong `.env` trên máy chủ (quyền 640), không có trong mã nguồn. Mật khẩu CSDL đã thay ngày 28/10/2026. | `scripts/deploy_vps.sh` |
| Sao lưu và diễn tập khôi phục | Sao lưu CSDL và media mỗi ngày, giữ 14 ngày. Diễn tập khôi phục tự động hằng tuần. | `scripts/backup_vps.sh`, `scripts/restore_drill.sh`, `.github/workflows/restore-drill.yml` |
| Giám sát | Kiểm tra trang, CSDL và hạn chứng chỉ SSL mỗi 15 phút. Lỗi sẽ gửi email. | `.github/workflows/uptime.yml` |
| Kiểm tra bảo mật liên tục | CI chạy: test, Bandit, Semgrep, pip-audit (lỗ hổng thư viện), gitleaks (lộ bí mật) | `.github/workflows/ci.yml` |

## 4. Việc doanh nghiệp (bên kiểm soát) cần làm

| # | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | Thông báo và lấy đồng ý của nhân viên, tài xế về việc xử lý dữ liệu: mẫu điều khoản trong hợp đồng lao động hoặc bản đồng ý riêng | Chưa làm | Ghi rõ mục đích (nhân sự, lương, BHXH, thuế, điều phối) và thời hạn lưu |
| 2 | Lập **hồ sơ đánh giá tác động xử lý dữ liệu cá nhân** và gửi Cục An ninh mạng và phòng, chống tội phạm sử dụng công nghệ cao (A05, Bộ Công an) | Chưa làm | Hệ thống xử lý dữ liệu tài chính và ngân hàng của nhân viên. Cần kiểm tra doanh nghiệp có thuộc diện miễn hoặc hoãn (doanh nghiệp nhỏ, khởi nghiệp) hay không. |
| 3 | Chỉ định người hoặc bộ phận phụ trách bảo vệ dữ liệu cá nhân | Chưa làm | Theo Nghị định 356/2025, nhân sự này cần đáp ứng điều kiện về trình độ và kinh nghiệm |
| 4 | Quy trình tiếp nhận yêu cầu của chủ thể dữ liệu: xem, sửa, xoá, rút đồng ý | Chưa làm | Có thời hạn trả lời (vd. cung cấp, chỉnh sửa trong khoảng 10–15 ngày; xoá trong 20–30 ngày, cần đối chiếu văn bản). Bộ phận Nhân sự xuất và sửa hồ sơ trên hệ thống. |
| 5 | Quy trình xử lý sự cố lộ lọt: phát hiện, khoanh vùng, thông báo cho cơ quan chức năng **trong 72 giờ** | Chưa làm | Xem mục 6 |
| 6 | Nếu máy chủ hoặc dịch vụ đặt ngoài Việt Nam: hồ sơ đánh giá tác động chuyển dữ liệu ra nước ngoài | Cần xác định | Cần xác nhận vị trí máy chủ VPS hiện tại và nơi lưu bản sao lưu |
| 7 | Rà soát định kỳ danh sách tài khoản và quyền truy cập (nhân viên đã nghỉ việc phải bị khoá) | Làm hằng quý | Trang Cài đặt → Vai trò & Phân quyền |
| 8 | Đổi mật khẩu tài khoản `admin`, bật mật khẩu mạnh cho mọi tài khoản quản trị | **Cần làm ngay** | Mật khẩu `admin` từng bị chia sẻ qua kênh chat |

## 5. Thời hạn lưu trữ đề xuất

| Dữ liệu | Thời hạn | Lý do |
|---|---|---|
| Chứng từ kế toán, phiếu thu chi, bảng lương | Tối thiểu 10 năm | Luật Kế toán |
| Hồ sơ nhân sự, hợp đồng lao động | Trong thời gian làm việc, cộng thời gian theo quy định về lao động và BHXH | Giải quyết tranh chấp, chế độ |
| Nhật ký kiểm toán | 2 năm, có thể kéo dài | Truy vết sự cố |
| Bản sao lưu máy chủ | 14 ngày (cuộn vòng) | Khôi phục sự cố |

Hiện hệ thống chưa tự động xoá hoặc ẩn danh dữ liệu khi hết hạn. Đây là việc cần làm tiếp nếu doanh nghiệp yêu cầu.

## 6. Quy trình ứng phó sự cố lộ lọt dữ liệu

1. **Phát hiện.** Nguồn phát hiện có thể là cảnh báo giám sát, nhật ký truy cập Nginx, nhật ký kiểm toán hoặc báo cáo từ người dùng.
2. **Khoanh vùng (trong 4 giờ).** Thu hồi link công khai liên quan. Khoá tài khoản bị lộ. Đổi `SECRET_KEY` (buộc mọi người đăng nhập lại). Đổi mật khẩu CSDL. Đổi `HASHIDS_SALT` nếu link bị lộ (mọi link cũ sẽ mất hiệu lực).
3. **Đánh giá.** Xác định loại dữ liệu và số người bị ảnh hưởng dựa trên nhật ký kiểm toán và nhật ký truy cập.
4. **Thông báo (trong 72 giờ kể từ khi phát hiện).** Gửi Cục A05 theo biểu mẫu của Nghị định 356/2025. Thông báo cho người bị ảnh hưởng khi cần.
5. **Khắc phục và lưu hồ sơ.** Ghi lại nguyên nhân, biện pháp đã làm và bài học kinh nghiệm.

## 7. Lịch sử rà soát

| Ngày | Nội dung |
|---|---|
| 28/10/2026 | Rà nhật ký truy cập máy chủ (24/08–28/10/2026): không có truy cập trái phép vào `/media/personnel` (hợp đồng, chữ ký). Toàn bộ truy cập media đến từ IP nội bộ của công ty. Các lượt dò quét lỗ hổng đều không lấy được dữ liệu. Hạn chế: không còn nhật ký trước 24/08 và nhật ký truy cập trực tiếp cổng 8085 (cổng này từng mở công khai, nay đã đóng). |
| 28/10/2026 | Thay mật khẩu CSDL (mật khẩu cũ từng nằm trong lịch sử mã nguồn). Tạo `HASHIDS_SALT` riêng: link tra cứu và link tài xế cũ mất hiệu lực. |
| 29/10/2026 | Áp CSP, tự host thư viện giao diện, tách dữ liệu theo doanh nghiệp, giám sát hoạt động và diễn tập khôi phục tự động. |
