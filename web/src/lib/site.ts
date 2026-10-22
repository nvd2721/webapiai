// Brand and public settings, read on the server at request time from env vars
// (not NEXT_PUBLIC_*, which Next would freeze at build time), so one image fits any domain.
export const site = {
  name: process.env.SITE_NAME || "Aura",
  tagline: "Một API key, gọi mọi mô hình AI. Nạp bằng USDT hoặc Bitcoin.",
  url: (
    process.env.SITE_URL ||
    (process.env.WEB_DOMAIN ? `https://${process.env.WEB_DOMAIN}` : "http://localhost:3000")
  ).replace(/\/$/, ""),
  // Public gateway host that customers send requests to (New API relay), without "/v1".
  apiBase: (process.env.API_BASE_URL || process.env.PUBLIC_API_BASE_URL || "https://api.example.com")
    .replace(/\/$/, "")
    .replace(/\/v1$/, ""),
  supportEmail: process.env.SUPPORT_EMAIL || "support@example.com",
  telegram: process.env.SUPPORT_TELEGRAM || "",
  zalo: process.env.SUPPORT_ZALO || "",
  companyName: process.env.COMPANY_NAME || "",
};

export const isDemo = !process.env.NEWAPI_URL;
