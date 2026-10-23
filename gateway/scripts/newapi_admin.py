#!/usr/bin/env python3
"""Cấu hình New API qua API quản trị, không cần bấm tay trong console.

Chỉ dùng thư viện chuẩn của Python 3.8+. Đọc NEWAPI_ADMIN_URL, NEWAPI_ADMIN_TOKEN,
NEWAPI_ADMIN_USER_ID và các biến tên miền từ .env (hoặc biến môi trường).

  python3 scripts/newapi_admin.py check                  # kiểm tra kết nối + quyền admin
  python3 scripts/newapi_admin.py options                # ghi config/settings.json + giá trị từ .env
  python3 scripts/newapi_admin.py pricing [--dry-run]    # ghi bảng giá từ config/pricing.csv
  python3 scripts/newapi_admin.py channels [--dry-run]   # thêm kênh từ config/channels.json (bỏ qua kênh trùng tên)
  python3 scripts/newapi_admin.py test-channels          # chạy kiểm tra toàn bộ kênh
  python3 scripts/newapi_admin.py credit USER_ID USD     # cộng tiền tay (khi hỗ trợ khách)
"""
import argparse
import csv
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUOTA_PER_USD = 500_000  # QuotaPerUnit mặc định của New API
# New API: ModelRatio 1 = $0.002 / 1K token = $2 / 1M token đầu vào.
USD_PER_1M_AT_RATIO_1 = 2.0


def load_env():
    env = {}
    path = ROOT / ".env"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    env.update({k: v for k, v in os.environ.items() if k.startswith(("NEWAPI_", "API_", "CONSOLE_", "PAY_", "WEB_", "BRAND_", "TRIAL_"))})
    return env


ENV = load_env()


class Api:
    def __init__(self):
        self.base = ENV.get("NEWAPI_ADMIN_URL", "http://127.0.0.1:3000").rstrip("/")
        self.token = ENV.get("NEWAPI_ADMIN_TOKEN", "")
        self.user_id = ENV.get("NEWAPI_ADMIN_USER_ID", "1")
        if not self.token:
            sys.exit("Thiếu NEWAPI_ADMIN_TOKEN trong .env (tạo trong console: Cài đặt cá nhân → system access token)")

    def call(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method)
        req.add_header("Authorization", self.token)
        req.add_header("New-Api-User", str(self.user_id))
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = json.loads(resp.read() or b"{}")
        except urllib.error.HTTPError as e:
            sys.exit(f"{method} {path} → HTTP {e.code}: {e.read()[:300].decode(errors='replace')}")
        except urllib.error.URLError as e:
            sys.exit(f"Không kết nối được {self.base}: {e.reason}")
        # New API trả HTTP 200 kèm success=false khi lỗi, nên phải kiểm tra trường này.
        if not payload.get("success", False):
            sys.exit(f"{method} {path} thất bại: {payload.get('message')}")
        return payload.get("data")

    def options(self):
        return {o["key"]: o["value"] for o in self.call("GET", "/api/option/") or []}

    def set_option(self, key, value):
        if isinstance(value, (dict, list)):
            value = json.dumps(value, ensure_ascii=False)
        self.call("PUT", "/api/option/", {"key": key, "value": value})


def cmd_check(api, _args):
    me = api.call("GET", "/api/user/self")
    role = me.get("role")
    print(f"OK: đăng nhập là {me.get('username')} (id {me.get('id')}, role {role})")
    if role is None or role < 100:
        print("Cảnh báo: cần tài khoản root (role 100) để ghi cài đặt hệ thống.")
    opts = api.options()
    print(f"QuotaPerUnit = {opts.get('QuotaPerUnit')} (website và dịch vụ nạp tiền giả định {QUOTA_PER_USD})")


def cmd_options(api, args):
    path = ROOT / "config" / "settings.json"
    if not path.exists():
        path = ROOT / "config" / "settings.example.json"
        print(f"Chưa có config/settings.json, dùng {path.name}")
    cfg = json.loads(path.read_text(encoding="utf-8"))
    values = dict(cfg.get("options", {}))
    if ENV.get("BRAND_NAME"):
        values["SystemName"] = ENV["BRAND_NAME"]
    if ENV.get("CONSOLE_DOMAIN"):
        values["ServerAddress"] = f"https://{ENV['CONSOLE_DOMAIN']}"
    if ENV.get("PAY_DOMAIN"):
        values["TopUpLink"] = f"https://{ENV['PAY_DOMAIN']}"
    if ENV.get("TRIAL_CREDIT_USD"):
        values["QuotaForNewUser"] = int(float(ENV["TRIAL_CREDIT_USD"]) * QUOTA_PER_USD)
    for key in ("GroupRatio", "UserUsableGroups"):
        if key in cfg:
            values[key] = cfg[key]
    for key, value in values.items():
        if args.dry_run:
            print(f"[dry-run] {key} = {value}")
        else:
            api.set_option(key, value)
            print(f"Đã đặt {key}")


def read_pricing():
    path = ROOT / "config" / "pricing.csv"
    if not path.exists():
        sys.exit("Chưa có config/pricing.csv (sao chép từ config/pricing.example.csv rồi sửa giá)")
    rows = []
    with path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("model", "").strip():
                rows.append(row)
    return rows


def num(v):
    v = (v or "").strip()
    return float(v) if v else None


def cmd_pricing(api, args):
    rows = read_pricing()
    opts = api.options() if not args.dry_run else {}
    model_ratio = json.loads(opts.get("ModelRatio") or "{}")
    completion_ratio = json.loads(opts.get("CompletionRatio") or "{}")
    cache_ratio = json.loads(opts.get("CacheRatio") or "{}")
    model_price = json.loads(opts.get("ModelPrice") or "{}")

    print(f"{'model':32} {'bán vào/1M':>11} {'bán ra/1M':>10} {'lượt':>8}")
    for r in rows:
        name = r["model"].strip()
        markup = 1 + (num(r.get("markup_pct")) or 0) / 100
        per_req = num(r.get("per_request_usd"))
        if per_req is not None:
            price = round(per_req * markup, 6)
            model_price[name] = price
            model_ratio.pop(name, None)
            print(f"{name:32} {'':>11} {'':>10} {price:>8}")
            continue
        cin, cout, ccache = num(r.get("cost_input_per_1m")), num(r.get("cost_output_per_1m")), num(r.get("cost_cache_read_per_1m"))
        if not cin:
            sys.exit(f"{name}: thiếu cost_input_per_1m hoặc per_request_usd")
        sale_in = cin * markup
        model_ratio[name] = round(sale_in / USD_PER_1M_AT_RATIO_1, 6)
        model_price.pop(name, None)
        if cout is not None:
            completion_ratio[name] = round(cout / cin, 6)
        if ccache is not None:
            cache_ratio[name] = round(ccache / cin, 6)
        sale_out = (cout or cin) * markup
        print(f"{name:32} {sale_in:>11.4f} {sale_out:>10.4f} {'':>8}")

    if args.dry_run:
        print("[dry-run] chưa ghi gì vào New API")
        return
    api.set_option("ModelRatio", model_ratio)
    api.set_option("CompletionRatio", completion_ratio)
    api.set_option("CacheRatio", cache_ratio)
    api.set_option("ModelPrice", model_price)
    print(f"Đã ghi giá cho {len(rows)} model. Kiểm tra tại https://{ENV.get('CONSOLE_DOMAIN', 'console')}/pricing")


def cmd_channels(api, args):
    path = ROOT / "config" / "channels.json"
    if not path.exists():
        sys.exit("Chưa có config/channels.json (sao chép từ config/channels.example.json rồi điền key)")
    channels = json.loads(path.read_text(encoding="utf-8"))["channels"]
    for ch in channels:
        name = ch["name"]
        if "REPLACE_ME" in ch.get("key", ""):
            print(f"Bỏ qua {name}: key còn là REPLACE_ME")
            continue
        found = api.call("GET", f"/api/channel/search?keyword={urllib.request.quote(name)}&page_size=100")
        items = found.get("items", []) if isinstance(found, dict) else (found or [])
        if any(c.get("name") == name for c in items):
            print(f"Bỏ qua {name}: đã có kênh cùng tên (sửa trong console)")
            continue
        body = {
            "name": name,
            "type": int(ch["type"]),
            "key": ch["key"],
            "models": ch["models"],
            "group": ch.get("group", "default"),
            "priority": int(ch.get("priority", 0)),
            "weight": int(ch.get("weight", 0)),
            "status": 1,
            "auto_ban": 1,
        }
        for opt in ("base_url", "test_model", "tag", "remark"):
            if ch.get(opt):
                body[opt] = ch[opt]
        if ch.get("model_mapping"):
            body["model_mapping"] = json.dumps(ch["model_mapping"], ensure_ascii=False)
        if args.dry_run:
            print(f"[dry-run] thêm {name} (type {body['type']}, models {body['models']})")
            continue
        api.call("POST", "/api/channel/", {"mode": "single", "channel": body})
        print(f"Đã thêm kênh {name}")


def cmd_test_channels(api, _args):
    api.call("GET", "/api/channel/test")
    print("Đã bắt đầu kiểm tra mọi kênh; xem kết quả ở trang Kênh trong console.")


def cmd_credit(api, args):
    quota = int(round(args.usd * QUOTA_PER_USD))
    api.call("POST", "/api/user/manage", {"id": args.user_id, "action": "add_quota", "mode": "add", "value": quota})
    print(f"Đã cộng ${args.usd} ({quota} quota) cho user {args.user_id}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check")
    for name in ("options", "pricing", "channels"):
        sp = sub.add_parser(name)
        sp.add_argument("--dry-run", action="store_true")
    sub.add_parser("test-channels")
    sp = sub.add_parser("credit")
    sp.add_argument("user_id", type=int)
    sp.add_argument("usd", type=float)
    args = p.parse_args()

    if args.cmd == "pricing" and args.dry_run:
        return cmd_pricing(None, args)
    if args.cmd == "options" and args.dry_run:
        return cmd_options(None, args)
    api = Api()
    {
        "check": cmd_check,
        "options": cmd_options,
        "pricing": cmd_pricing,
        "channels": cmd_channels,
        "test-channels": cmd_test_channels,
        "credit": cmd_credit,
    }[args.cmd](api, args)


if __name__ == "__main__":
    main()
