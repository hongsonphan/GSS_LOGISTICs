# HƯỚNG DẪN TRIỂN KHAI GITHUB VÀ SERVER VPS

Tài liệu này chuẩn hoá quy trình đưa dự án GSS Logistics từ máy phát triển cục bộ lên GitHub và triển khai lên máy chủ VPS (Production).

---

## 1. TỔNG QUAN KIẾN TRÚC VẬN HÀNH TRÊN VPS

Hệ thống được thiết kế chạy theo mô hình Containerized kết hợp Reverse Proxy ngoài host:
- **Nginx (Host OS):** Tiếp nhận traffic HTTPS (port 443/80), xử lý SSL Let's Encrypt, nén Gzip, phục vụ file tĩnh (`staticfiles/`), và bảo vệ file tải lên (`media/`) qua cơ chế `X-Accel-Redirect` (chỉ cho phép truy cập sau khi Django xác thực).
- **Docker Compose Stack:**
  - `web` (Port 8000 -> 127.0.0.1:8086): Django 5.x + Gunicorn, tự động migrate và collectstatic khi khởi động.
  - `db` (PostgreSQL 16 Alpine, Port 5436 nội bộ): Lưu trữ dữ liệu nghiệp vụ, hỗ trợ RLS.
  - `redis` (Redis 7 Alpine): Bộ nhớ đệm cache và phiên làm việc.
- **Tự động hoá:** Script `scripts/deploy_vps.sh` kiểm tra an toàn trên bản sao DB (`gss_preflight`), tự rollback nếu khởi động thất bại, và cài cronjob sao lưu lúc 2:00 sáng.

---

## 2. PHẦN A: ĐƯA DỰ ÁN LÊN GITHUB

### Bước A1: Kiểm tra an toàn bảo mật trước khi commit
Đảm bảo các file chứa mật khẩu, key, token tuyệt đối không lọt vào Git:
- Đã có `.gitignore` chặn `.env`, `*.sqlite3`, `staticfiles/`, `media/`, `*.pem`, `*.key`.
- Kiểm tra danh sách file trước khi commit:
  ```bash
  git status
  ```

### Bước A2: Commit các thay đổi cục bộ
```bash
git status --short                       # xem đúng file thuộc yêu cầu này
git add <từng file hoặc thư mục cần commit>   # KHÔNG dùng `git add .` / `git add -A` (dễ kéo theo khoá, .env, dữ liệu)
git commit -m "feat(gss): mô tả thay đổi"
```
Hook `.githooks/pre-commit` (bật bằng `git config core.hooksPath .githooks`) chặn commit nếu có `.env`, khoá SSH (`id_*`, `gss_deploy*`, `*.pem`), file dump/CSDL, hoặc nội dung chứa khoá riêng/token.

> **Repo GSS đã tồn tại** (`github.com/hongsonphan/GSS_LOGISTICs`, nhánh `master`, remote `origin`). Chỉ làm A3 khi dựng một repo hoàn toàn mới. Luồng chuẩn: push thường, tuần tự, **cấm `--force`**.

### Bước A3: Tạo repository trên GitHub & liên kết Remote
1. Truy cập [GitHub](https://github.com/new), tạo một repository mới:
   - **Tên repo:** `GSS_LOGISTICs` (hoặc tên theo tổ chức).
   - **Chế độ:** **Private** (bắt buộc cho dự án doanh nghiệp).
   - **Không** tích chọn khởi tạo README, .gitignore hay license (vì dự án local đã có sẵn).
2. Thêm remote origin và push nhánh `master`:
   ```bash
   # Nếu dùng SSH (khuyên dùng):
   git remote add origin git@github.com:<TEN_TAI_KHOAN>/<TEN_REPO>.git
   
   # Hoặc nếu dùng HTTPS:
   git remote add origin https://github.com/<TEN_TAI_KHOAN>/<TEN_REPO>.git

   git branch -M master
   git push -u origin master
   ```

### Bước A4: Cấu hình GitHub Actions (CI/CD)
Dự án đã có sẵn workflow `.github/workflows/deploy.yml` để deploy qua SSH:
1. Vào GitHub repo: **Settings** -> **Secrets and variables** -> **Actions**.
2. Thêm **Repository secrets**:
   - `VPS_HOST`: Địa chỉ IP máy chủ VPS (ví dụ: `103.x.x.x`).
   - `VPS_USER`: Tên user SSH trên VPS (mặc định là `ubuntu`).
   - `VPS_SSH_KEY`: Toàn bộ nội dung khoá RIÊNG SSH **dành riêng cho GSS** (file nhiều dòng, dòng đầu và dòng cuối là cặp BEGIN/END của khoá OpenSSH; copy trọn cả file). Tạo bằng `ssh-keygen -t ed25519 -f ~/.ssh/gss_deploy`; khoá riêng giữ ở `~/.ssh/` của máy, **không bao giờ để trong thư mục repo**; chỉ khoá công khai (`.pub`) cài lên VPS.
   - `VPS_HOST_KEY` (khuyến nghị): dòng host key của VPS để workflow không tin máy lạ. Lấy: `ssh-keyscan -t ed25519 <IP_VPS>` rồi đối chiếu vân tay (`ssh-keygen -lf`) với bảng điều khiển nhà cung cấp, dán kết quả vào secret.
3. Settings -> **Environments** -> `production` -> bật **Required reviewers** (người duyệt trước khi chạy deploy).
4. Thêm **Repository variables**:
   - `SITE_URL`: Tên miền chính thức của hệ thống (ví dụ: `https://gss.yourdomain.com`).

---

## 3. PHẦN B: CHUẨN BỊ VÀ THIẾT LẬP MÁY CHỦ VPS

### Yêu cầu cấu hình VPS đề xuất:
- **Hệ điều hành:** Ubuntu 22.04 LTS hoặc Ubuntu 24.04 LTS (x86_64).
- **Phần cứng tối thiểu:** 2 vCPU, 2GB RAM (tốt nhất là 4GB RAM để build Docker nhanh), 20GB SSD trở lên.
- **Domain:** Đã trỏ bản ghi A từ nhà cung cấp tên miền về IP của VPS.

---

### Bước B1: Cập nhật hệ điều hành & cài đặt gói cơ bản trên VPS
Đăng nhập vào VPS qua SSH:
```bash
ssh ubuntu@<IP_VPS>
```
Cập nhật package và cài đặt các công cụ:
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git ufw nginx certbot python3-certbot-nginx
```

---

### Bước B2: Cài đặt Docker & Docker Compose
```bash
# Cài Docker Engine qua script chính thức
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cấp quyền cho user ubuntu chạy Docker không cần sudo
sudo usermod -aG docker ubuntu
newgrp docker

# Kiểm tra phiên bản
docker --version
docker compose version
```

---

### Bước B3: Cấu hình Firewall (UFW)
Mở các cổng cần thiết và kích hoạt tường lửa:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH (hoặc port SSH tuỳ chỉnh của VPS)
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
sudo ufw status
```

---

### Bước B4: Tạo SSH Key kết nối GitHub từ VPS (nếu clone private repo)
```bash
ssh-keygen -t ed25519 -C "deploy@gss-vps" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```
*Sao chép nội dung public key và thêm vào GitHub Repo: **Settings** -> **Deploy keys** (đặt tên "VPS Deploy Key").*

---

### Bước B5: Clone mã nguồn dự án về VPS
Thư mục triển khai chuẩn được script định nghĩa là `/home/ubuntu/GSS_LOGISTICS`:
```bash
cd /home/ubuntu
git clone git@github.com:<TEN_TAI_KHOAN>/<TEN_REPO>.git GSS_LOGISTICS
cd /home/ubuntu/GSS_LOGISTICS
```

---

### Bước B6: Cấu hình file môi trường `.env` trên VPS
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
nano .env
```
Cập nhật các biến quan trọng cho môi trường Production:
- `DEBUG=False`
- `SECRET_KEY=`: Sinh ngẫu nhiên bằng lệnh: `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`
- `ALLOWED_HOSTS=127.0.0.1,localhost,yourdomain.com` (thay yourdomain.com bằng tên miền thật)
- `CORS_ALLOWED_ORIGINS=https://yourdomain.com`
- `CSRF_TRUSTED_ORIGINS=https://yourdomain.com`
- `DB_PASSWORD=`: Đặt mật khẩu mạnh riêng cho PostgreSQL.
- `SECURE_SSL_REDIRECT=True`
- `SESSION_COOKIE_SECURE=True`
- `CSRF_COOKIE_SECURE=True`
- `SITE_URL=https://yourdomain.com`
- `DEFAULT_BUSINESS_MODEL=GSS_VENDOR_DEPOT_QR`

---

### Bước B7: Cấu hình Nginx & Chứng chỉ SSL HTTPS
1. Tạo chứng chỉ SSL Let's Encrypt cho tên miền:
   ```bash
   sudo certbot certonly --nginx -d yourdomain.com
   ```
2. Cấu hình Nginx Virtual Host:
   ```bash
   sudo cp scripts/nginx_gss_logistics.conf /etc/nginx/sites-available/gss_logistics.conf
   ```
   Chỉnh sửa file cấu hình vừa copy:
   ```bash
   sudo nano /etc/nginx/sites-available/gss_logistics.conf
   ```
   *Thay thế `gss-logistics.example.com` bằng tên miền thật của bạn (`yourdomain.com`).*
3. Kích hoạt site và kiểm tra:
   ```bash
   sudo ln -s /etc/nginx/sites-available/gss_logistics.conf /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

### Bước B8: Khởi chạy và kiểm tra hệ thống
Chạy script triển khai tự động chuẩn của dự án:
```bash
bash scripts/deploy_vps.sh
```
Script sẽ tự động:
1. Sinh các salt/token bảo mật còn thiếu.
2. Build Docker images (`web`, `db`, `redis`).
3. Chạy kiểm tra pre-flight test trên CSDL tạm.
4. Chạy `python manage.py migrate` và `collectstatic`.
5. Khởi động Gunicorn và kiểm tra endpoint `/healthz/`.
6. Cài đặt lịch sao lưu tự động (2:00 sáng) vào Crontab.

Sau đó, tạo tài khoản quản trị hệ thống:
```bash
docker compose exec web python manage.py createsuperuser
```
*(Tuỳ chọn: Nếu muốn nạp dữ liệu ban đầu cho công ty mới:)*
```bash
docker compose exec web python manage.py init_gss --name "TÊN DOANH NGHIỆP" --short "GSS"
```

---

## 4. QUY TRÌNH NÂNG CẤP / CẬP NHẬT MÃ MỚI (CI/CD SAU NÀY)

Khi có thay đổi mã nguồn mới:
- **Cách 1: Tự động qua GitHub Actions:**
  Vào tab **Actions** trên GitHub -> Chọn workflow **Deploy VPS** -> Nhấn **Run workflow**.
- **Cách 2: Chạy trực tiếp trên VPS:**
  ```bash
  cd /home/ubuntu/GSS_LOGISTICS
  git pull origin master
  bash scripts/deploy_vps.sh
  ```

---

## 5. BẢO VỆ GITHUB (làm một lần trên giao diện, người chủ repo thực hiện)

Mục tiêu: không ai (kể cả chính mình nhầm tay) ghi đè lịch sử, đẩy code chưa qua kiểm tra hoặc làm lộ bí mật.

1. **Tài khoản:** bật xác thực hai bước (2FA) cho mọi tài khoản có quyền ghi repo; dùng khoá bảo mật hoặc ứng dụng OTP.
2. **Settings -> Rules -> Rulesets** (hoặc Branches -> Branch protection) cho nhánh `master`:
   - Chặn **force push** và **xoá nhánh** (Block force pushes, Restrict deletions).
   - **Require status checks to pass**: chọn `test` và `secrets` (và `semgrep` nếu muốn chặn cả cảnh báo).
   - (Tuỳ chọn khi có thêm người) Require a pull request before merging.
3. **Settings -> Code security:** bật **Secret scanning** và **Push protection** (GitHub từ chối push có chứa token), **Dependabot alerts** và **Dependabot security updates**.
4. **Settings -> Actions -> General:** *Workflow permissions* = Read repository contents; chỉ cho phép action do GitHub và nhà phát hành đã xác minh.
5. **Settings -> Environments -> production:** Required reviewers (đã nêu ở A4); giới hạn *Deployment branches* = `master`.
6. **Luân chuyển khoá:** đổi `VPS_SSH_KEY` (tạo cặp mới, cài `.pub` mới, xoá `.pub` cũ khỏi `authorized_keys`) khi nghi ngờ lộ hoặc 6-12 tháng một lần.

## 6. LUỒNG CHUẨN local -> GitHub -> VPS

1. **Local:** sửa -> `python scripts/qa.py verify` (`--full` khi chạm lõi) xanh -> build file tự sinh -> `git add <đúng file>` -> commit (hook kiểm tra bí mật + file tự sinh).
2. **GitHub:** `git fetch origin` -> `git log origin/master..HEAD` -> `git push origin master` (không force). Đợi CI `test` và `secrets` xanh.
3. **VPS:** GitHub -> Actions -> **Deploy VPS** -> Run workflow (nhánh `master`). Workflow tự kiểm tra CI của đúng commit, deploy đúng commit đó bằng fast-forward, sao lưu, chạy thử migration trên bản sao, cập nhật, kiểm tra `/login/`, tự quay về nếu lỗi.
4. Không sửa tay trên VPS (workflow dừng nếu có file bị sửa). Không dùng lại `deploy.sh` / `update_all.sh` ở thư mục gốc (đã vô hiệu hoá).
