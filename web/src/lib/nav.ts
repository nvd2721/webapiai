// Navigation shared by the public header, the mobile menu and the console.

export type NavLink = { href: string; label: string; desc?: string };
export type NavItem = NavLink | { label: string; children: NavLink[] };

export const MAIN_NAV: NavItem[] = [
  { href: "/models", label: "Mô hình" },
  { href: "/compare", label: "So sánh" },
  {
    label: "Bảng giá",
    children: [
      { href: "/pricing", label: "Tổng quan", desc: "Cách tính tiền và chọn hình thức phù hợp" },
      { href: "/pricing?tab=payg", label: "Trả theo token", desc: "Giá từng mô hình theo 1 triệu token" },
      { href: "/pricing?tab=promotions", label: "Khuyến mãi", desc: "Mời bạn bè, ưu đãi nạp tiền" },
    ],
  },
  {
    label: "Nhà phát triển",
    children: [
      { href: "/docs", label: "Tài liệu", desc: "Bắt đầu nhanh, ví dụ code, mã lỗi" },
      { href: "/docs/claude-code", label: "Claude Code", desc: "Dùng Aura làm backend cho Claude Code" },
      { href: "/docs/cursor", label: "Cursor, Cline", desc: "Cấu hình trình soạn thảo" },
      { href: "/changelog", label: "Nhật ký thay đổi", desc: "Mô hình và tính năng mới" },
    ],
  },
  {
    label: "Về chúng tôi",
    children: [
      { href: "/about", label: "Giới thiệu", desc: "Sứ mệnh và cách chúng tôi làm việc" },
      { href: "/support", label: "Hỗ trợ", desc: "Telegram, Zalo, email" },
    ],
  },
];

export type ConsoleGroup = { label: string; items: (NavLink & { icon: string })[] };

export const CONSOLE_NAV: ConsoleGroup[] = [
  { label: "Studio", items: [{ href: "/console/chat", label: "Chat", icon: "chat" }] },
  {
    label: "Phân tích",
    items: [
      { href: "/console", label: "Tổng quan", icon: "overview" },
      { href: "/console/logs", label: "Nhật ký request", icon: "logs" },
      { href: "/console/usage", label: "Sử dụng và chi phí", icon: "usage" },
    ],
  },
  {
    label: "Quản lý",
    items: [
      { href: "/console/keys", label: "API key", icon: "keys" },
      { href: "/console/topup", label: "Nạp tiền", icon: "topup" },
      { href: "/console/billing", label: "Lịch sử nạp", icon: "billing" },
      { href: "/console/referral", label: "Mời bạn", icon: "referral" },
      { href: "/console/settings", label: "Cài đặt", icon: "settings" },
    ],
  },
];
