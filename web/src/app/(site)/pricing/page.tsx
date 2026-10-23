import type { Metadata } from "next";
import Link from "next/link";
import { Check, Gift, Minus, Users } from "lucide-react";
import { ModelExplorer } from "@/components/model-explorer";
import { getModels } from "@/lib/models";
import { COINS, MAX_TOPUP } from "@/lib/payment";
import { formatUsd } from "@/lib/format";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Bảng giá",
  description: "Trả trước theo token, không phí tháng. Nạp bằng USDT hoặc Bitcoin, 1 credit = 1 USD.",
};

const TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "payg", label: "Trả theo token" },
  { id: "promotions", label: "Khuyến mãi" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const COMPARE: [string, string | boolean, string | boolean][] = [
  ["Mọi mô hình bằng một key", true, true],
  ["Giới hạn tốc độ", "Theo mặc định của hệ thống", "Thỏa thuận riêng"],
  ["Giá", "Giá công khai", "Chiết khấu theo sản lượng"],
  ["Nhật ký và thống kê từng request", true, true],
  ["Nhiều key, hạn mức từng key", true, true],
  ["Hỗ trợ", "Telegram, Zalo, email", "Kênh riêng, phản hồi ưu tiên"],
  ["Hóa đơn theo tháng", false, true],
];

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: raw } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === raw) ? (raw as Tab) : "overview";

  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Trả bao nhiêu, dùng bấy nhiêu</h1>
        <p className="mt-4 text-lg text-muted">Nạp trước bằng USDT hoặc Bitcoin, trừ dần theo token. Không phí tháng, không hợp đồng.</p>
        <div className="mt-8 inline-flex rounded-xl border border-border p-1 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.id === "overview" ? "/pricing" : `/pricing?tab=${t.id}`}
              scroll={false}
              className={`rounded-lg px-4 py-2 ${tab === t.id ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {tab === "overview" && <Overview />}
      {tab === "payg" && <Payg />}
      {tab === "promotions" && <Promotions />}
    </div>
  );
}

function Overview() {
  return (
    <>
      <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
        <div className="card border-fg p-7">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Trả theo token</h2>
            <span className="badge">Phổ biến</span>
          </div>
          <div className="mt-4 text-4xl font-semibold">1 credit = 1 USD</div>
          <p className="mt-2 text-sm text-muted">Cho cá nhân và nhóm nhỏ. Nạp từ 5 USD.</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {["Mọi mô hình bằng một key", "Giá theo 1 triệu token, công khai", "Chỉ trừ tiền khi request thành công", "Số dư không hết hạn", "Hạn mức chi tiêu cho từng key"].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0" /> {t}
              </li>
            ))}
          </ul>
          <Link href="/register" className="btn-primary mt-7 w-full">
            Bắt đầu miễn phí
          </Link>
        </div>
        <div className="card p-7">
          <h2 className="font-semibold">Doanh nghiệp, đại lý</h2>
          <div className="mt-4 text-4xl font-semibold">Liên hệ</div>
          <p className="mt-2 text-sm text-muted">Cho đội ngũ dùng nhiều hoặc muốn bán lại.</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {["Chiết khấu theo sản lượng", "Giới hạn tốc độ cao hơn", "Kênh hỗ trợ riêng", "Hóa đơn theo tháng"].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0" /> {t}
              </li>
            ))}
          </ul>
          <a href={site.telegram || `mailto:${site.supportEmail}`} className="btn-secondary mt-7 w-full">
            Liên hệ tư vấn
          </a>
        </div>
      </div>

      <div className="mx-auto mt-14 max-w-4xl">
        <h2 className="text-xl font-semibold">So sánh chi tiết</h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="table-x min-w-[560px]">
            <thead>
              <tr>
                <th />
                <th>Trả theo token</th>
                <th>Doanh nghiệp, đại lý</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([label, a, b]) => (
                <tr key={label}>
                  <td className="text-muted">{label}</td>
                  {[a, b].map((v, i) => (
                    <td key={i}>{v === true ? <Check className="size-4" /> : v === false ? <Minus className="size-4 text-muted" /> : v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-semibold">Nên chọn cách nào?</h3>
          <p className="mt-2 text-sm text-muted">
            Bắt đầu với trả theo token: nạp ít, dùng thử nhiều mô hình, theo dõi chi phí trong Console. Khi chi tiêu ổn định trên vài trăm USD mỗi tháng, liên hệ để
            nhận chiết khấu.
          </p>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold">Ước tính chi phí</h3>
          <p className="mt-2 text-sm text-muted">
            Chi phí = token vào × giá vào + token ra × giá ra, chia 1.000.000. Xem giá từng mô hình ở tab{" "}
            <Link href="/pricing?tab=payg" className="text-fg underline">
              Trả theo token
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}

async function Payg() {
  const models = await getModels();
  return (
    <>
      <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
        <div className="card p-6">
          <div className="text-sm text-muted">Tỷ lệ</div>
          <div className="mt-1 text-2xl font-semibold">1 credit = 1 USD</div>
          <p className="mt-2 text-sm text-muted">Không phí dịch vụ khi nạp. Giá mô hình đã gồm mọi chi phí.</p>
        </div>
        <div className="card p-6">
          <div className="text-sm text-muted">Nạp tiền</div>
          <ul className="mt-2 space-y-1 text-sm">
            {COINS.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>
                  {c.label} <span className="text-muted">{c.network.split(" ")[0]}</span>
                </span>
                <span className="text-muted">từ {c.min} USD</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Tối đa {formatUsd(MAX_TOPUP, { min: 0 })} mỗi lần.</p>
        </div>
        <div className="card p-6">
          <div className="text-sm text-muted">Giới hạn</div>
          <div className="mt-1 text-2xl font-semibold">Không giới hạn gói</div>
          <p className="mt-2 text-sm text-muted">Dùng bao nhiêu trả bấy nhiêu, chỉ áp giới hạn chống lạm dụng.</p>
        </div>
      </div>
      <h2 className="mt-16 text-2xl font-semibold tracking-tight">Giá từng mô hình</h2>
      <p className="mt-2 text-sm text-muted">USD cho mỗi 1 triệu token. Giá áp dụng là giá tại thời điểm gửi request.</p>
      <ModelExplorer models={models} />
    </>
  );
}

function Promotions() {
  const inviter = site.referralInviterUsd;
  const invitee = site.referralInviteeUsd;
  return (
    <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
      <div className="card p-7">
        <Users className="size-6" />
        <h2 className="mt-4 text-xl font-semibold">Mời bạn bè</h2>
        <p className="mt-2 text-sm text-muted">
          Gửi link mời trong Console cho bạn bè.{" "}
          {inviter > 0 || invitee > 0
            ? `Khi bạn bè đăng ký qua link của bạn, ${inviter > 0 ? `bạn nhận ${formatUsd(inviter)}` : ""}${inviter > 0 && invitee > 0 ? " và " : ""}${invitee > 0 ? `bạn bè nhận ${formatUsd(invitee)}` : ""} credit.`
            : "Bạn nhận thưởng credit khi bạn bè đăng ký qua link của bạn."}{" "}
          Thưởng mời được chuyển vào số dư bất cứ lúc nào.
        </p>
        <Link href="/console/referral" className="btn-primary mt-6">
          Lấy link mời
        </Link>
      </div>
      <div className="card p-7">
        <Gift className="size-6" />
        <h2 className="mt-4 text-xl font-semibold">Không phí nạp</h2>
        <p className="mt-2 text-sm text-muted">
          Nạp USDT hay Bitcoin đều không mất phí dịch vụ. Bạn chỉ trả phí mạng blockchain cho ví hoặc sàn gửi tiền. Mô hình miễn phí được gắn nhãn{" "}
          <span className="badge border-free/40 bg-free/10 text-free">Miễn phí</span> ở trang Mô hình.
        </p>
        <Link href="/models?deal=free" className="btn-secondary mt-6">
          Xem mô hình miễn phí
        </Link>
      </div>
    </div>
  );
}
