#!/usr/bin/env bash
# Tạo một hóa đơn thử thay cho website: ./topup-test.sh <user_id> <usd> [coin]
set -euo pipefail
cd "$(dirname "$0")"
source .env
curl -sS -X POST http://localhost:8080/api/invoices \
  -H "Authorization: Bearer $PAYMENT_API_SECRET" -H 'content-type: application/json' \
  -d "{\"user_id\": ${1:?user_id}, \"amount_usd\": ${2:-10}, \"coin\": \"${3:-usdttrc20}\"}"
echo
