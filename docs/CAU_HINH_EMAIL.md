# Cấu hình email gửi đi (Gmail / Google Workspace)

Hệ thống dùng email cho 3 việc:
- gửi link **đặt lại mật khẩu** (trang đăng nhập › "Quên mật khẩu?", hoặc quản trị bấm "Gửi link đặt lại mật khẩu");
- báo **mật khẩu vừa được thay đổi**;
- cảnh báo **đăng nhập từ thiết bị / mạng mới**.

Khi chưa cấu hình, trang "Quên mật khẩu" báo người dùng liên hệ quản trị. Mọi tính năng khác vẫn chạy bình thường.

## 1. Tạo Mật khẩu ứng dụng (App Password)

Nên dùng một hộp thư riêng để gửi, ví dụ `noreply.trienvo@gmail.com` hoặc `noreply@<tên-miền-công-ty>`. Không nên dùng hộp thư cá nhân.

1. Đăng nhập hộp thư đó, mở https://myaccount.google.com/security.
2. Bật **Xác minh 2 bước** (bắt buộc, nếu chưa bật thì Google không cho tạo mật khẩu ứng dụng).
3. Mở https://myaccount.google.com/apppasswords, đặt tên `BIM Logistics`, bấm **Tạo**.
4. Google hiện một chuỗi 16 ký tự. Đây là mật khẩu ứng dụng; chuỗi này chỉ hiện một lần.

> Với Google Workspace, quản trị viên tên miền phải cho phép người dùng tạo mật khẩu ứng dụng (Admin console › Bảo mật › Xác minh 2 bước).

## 2. Khai báo trên máy chủ

Bạn tự sửa file `.env` trên VPS, **không gửi mật khẩu qua chat hoặc email**:

```
cd /home/ubuntu/BIM_LOGISTICS
nano .env
```

Thêm 2 dòng sau (thay bằng hộp thư và mật khẩu ứng dụng của bạn, viết liền, bỏ dấu cách):

```
EMAIL_HOST_USER=noreply.trienvo@gmail.com
EMAIL_HOST_PASSWORD=abcdefghijklmnop
```

Có thể thêm các dòng tuỳ chọn:

```
EMAIL_BRAND_NAME=Triền Võ Logistics
DEFAULT_FROM_EMAIL=Triền Võ Logistics <noreply.trienvo@gmail.com>
```

Lưu file, rồi khởi động lại ứng dụng:

```
sudo docker compose up -d --force-recreate web
```

## 3. Kiểm tra

1. Mở trang đăng nhập, bấm **Quên mật khẩu?** và nhập tên đăng nhập của bạn.
2. Kiểm tra hộp thư, kể cả mục Spam. Thư thường tới trong vòng 1 phút.

Nhân viên phải có email trong hồ sơ (Nhân sự › hồ sơ nhân viên, hoặc Hồ sơ cá nhân › Email) thì mới nhận được thư.

## Chính sách liên quan

- Link đặt lại mật khẩu chỉ dùng được một lần và hết hạn sau 1 giờ (`PASSWORD_RESET_TIMEOUT`).
- Mỗi địa chỉ IP được yêu cầu tối đa 5 lần mỗi giờ.
- Trang "Quên mật khẩu" trả lời giống nhau dù tài khoản có tồn tại hay không, để chống dò tài khoản.
- Đặt lại hoặc đổi mật khẩu sẽ đăng xuất mọi thiết bị khác, và hệ thống gửi email báo cho chủ tài khoản.
