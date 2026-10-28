# ---- Image chạy BIM Logistics (Django + Gunicorn) ----
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Thư viện hệ thống cần cho Pillow/PostgreSQL và lệnh curl cho healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install -r requirements.txt

COPY . /app/

# Chạy bằng user thường (không dùng root). UID mặc định 1000 = user ubuntu trên VPS,
# để thư mục media/ và staticfiles/ được mount từ máy chủ vẫn ghi được.
ARG APP_UID=1000
RUN useradd --uid ${APP_UID} --create-home --shell /usr/sbin/nologin app \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R app:app /app
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/healthz/ || exit 1

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "--access-logfile", "-"]
