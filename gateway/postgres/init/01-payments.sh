#!/bin/sh
# Chạy MỘT LẦN khi volume PostgreSQL còn trống: tạo role + database riêng
# cho dịch vụ nạp tiền, tách khỏi database của New API.
# Volume đã có dữ liệu thì chạy tay: xem README, mục "Tạo DB payments thủ công".
set -eu

if [ -z "${PAYMENTS_DB_PASSWORD:-}" ]; then
  echo "PAYMENTS_DB_PASSWORD trống, bỏ qua tạo DB payments" >&2
  exit 0
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v pw="$PAYMENTS_DB_PASSWORD" <<'SQL'
CREATE ROLE payments LOGIN PASSWORD :'pw';
CREATE DATABASE payments OWNER payments;
REVOKE ALL ON DATABASE payments FROM PUBLIC;
REVOKE CONNECT ON DATABASE newapi FROM PUBLIC;
SQL
