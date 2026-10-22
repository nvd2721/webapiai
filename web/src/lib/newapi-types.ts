// Shapes returned by New API v0.13.x user endpoints (only the fields the website uses).

export type ApiEnvelope<T> = { success: boolean; message: string; data: T };

export type Page<T> = { page: number; page_size: number; total: number; items: T[] };

export type NewApiUser = {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: number;
  status: number;
  group: string;
  quota: number;
  used_quota: number;
  request_count: number;
  aff_code: string;
  aff_count: number;
  aff_quota: number;
};

export type LoginUser = Pick<NewApiUser, "id" | "username" | "display_name" | "role" | "status" | "group">;

// status: 1 enabled, 2 disabled, 3 expired, 4 exhausted
export type ApiToken = {
  id: number;
  user_id: number;
  key: string; // masked, e.g. "9Ty4**********jRLC" (no "sk-" prefix)
  status: number;
  name: string;
  created_time: number;
  accessed_time: number;
  expired_time: number; // -1 = never
  remain_quota: number;
  unlimited_quota: boolean;
  model_limits_enabled: boolean;
  model_limits: string; // comma separated
  allow_ips: string; // newline separated
  used_quota: number;
  group: string;
};

export type CreateTokenInput = {
  name: string;
  remain_quota: number;
  expired_time: number;
  unlimited_quota: boolean;
  model_limits_enabled: boolean;
  model_limits: string;
  allow_ips: string;
  group: string;
};

// type: 1 top-up, 2 consume, 3 manage, 4 system, 5 error, 6 refund
export type LogEntry = {
  id: number;
  created_at: number;
  type: number;
  content: string;
  token_name: string;
  model_name: string;
  quota: number;
  prompt_tokens: number;
  completion_tokens: number;
  use_time: number;
  is_stream: boolean;
  request_id?: string;
  other?: string;
};

export type LogStat = { quota: number; rpm: number; tpm: number };

// Hourly buckets from /api/data/self (flushed every few minutes by New API).
export type QuotaData = {
  model_name: string;
  created_at: number;
  count: number;
  quota: number;
  token_used: number;
};

export type PricingItem = {
  model_name: string;
  vendor_id?: number;
  quota_type: number; // 0 per token, 1 per call
  model_ratio: number;
  model_price: number;
  completion_ratio: number;
  cache_ratio?: number;
  enable_groups: string[];
  supported_endpoint_types?: string[];
};

export type Vendor = { id: number; name: string; icon?: string };

export type PricingResponse = {
  success: boolean;
  data: PricingItem[];
  group_ratio: Record<string, number>;
  usable_group: Record<string, string>;
  vendors?: Vendor[];
};
