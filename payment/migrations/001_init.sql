-- Hóa đơn nạp tiền. id cũng là order_id gửi sang NOWPayments.
CREATE TABLE IF NOT EXISTS invoices (
  id              uuid PRIMARY KEY,
  user_id         integer       NOT NULL,
  amount_usd      numeric(12,2) NOT NULL CHECK (amount_usd > 0),
  coin            text          NOT NULL,
  status          text          NOT NULL,
  np_invoice_id   text,
  invoice_url     text,
  last_payment_id text,
  pay_amount      numeric(30,12),
  actually_paid   numeric(30,12),
  pay_currency    text,
  review_note     text,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_user_created_idx ON invoices (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_np_invoice_idx ON invoices (np_invoice_id) WHERE np_invoice_id IS NOT NULL;

-- Mỗi lần cộng tiền vào New API. idem_key là khóa chống cộng trùng:
--   np:<payment_id>   cộng tự động khi NOWPayments báo finished
--   manual:<invoice>  admin cộng tay (ví dụ khách trả thiếu)
-- state: pending -> processing -> done | failed (chắc chắn chưa cộng, sẽ thử lại)
--        | unknown (không rõ đã cộng chưa, admin phải kiểm tra, KHÔNG tự thử lại)
CREATE TABLE IF NOT EXISTS credits (
  id              bigserial PRIMARY KEY,
  idem_key        text          NOT NULL UNIQUE,
  invoice_id      uuid          NOT NULL REFERENCES invoices(id),
  user_id         integer       NOT NULL,
  amount_usd      numeric(12,2) NOT NULL CHECK (amount_usd > 0),
  quota           bigint        NOT NULL CHECK (quota > 0),
  state           text          NOT NULL DEFAULT 'pending',
  attempts        integer       NOT NULL DEFAULT 0,
  last_error      text,
  next_attempt_at timestamptz   NOT NULL DEFAULT now(),
  note            text,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  done_at         timestamptz
);
CREATE INDEX IF NOT EXISTS credits_invoice_idx ON credits (invoice_id);
CREATE INDEX IF NOT EXISTS credits_state_idx ON credits (state, next_attempt_at);

-- Nhật ký mọi IPN đã qua kiểm tra chữ ký, để đối soát.
CREATE TABLE IF NOT EXISTS ipn_events (
  id          bigserial PRIMARY KEY,
  invoice_id  uuid,
  payment_id  text,
  status      text,
  payload     jsonb       NOT NULL,
  outcome     text        NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ipn_events_invoice_idx ON ipn_events (invoice_id);
