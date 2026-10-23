import { Gift, UserPlus, Wallet } from "lucide-react";
import { AffTransferForm } from "@/components/aff-transfer-form";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { authed, requireSession } from "@/lib/auth";
import { formatNumber, formatUsd, quotaToUsd } from "@/lib/format";
import { getAffCode, getSelf } from "@/lib/newapi";
import { site } from "@/lib/site";

export const metadata = { title: "Giới thiệu bạn bè" };

export default async function ReferralPage() {
  const session = await requireSession();
  const [user, code] = await authed(() => Promise.all([getSelf(session), getAffCode(session).catch(() => "")]));
  const affCode = code || user.aff_code;
  const link = `${site.url}/register?aff=${encodeURIComponent(affCode)}`;
  const available = quotaToUsd(user.aff_quota || 0);

  const stats = [
    { icon: UserPlus, label: "Bạn bè đã mời", value: formatNumber(user.aff_count || 0) },
    { icon: Wallet, label: "Thưởng chờ chuyển", value: formatUsd(available) },
    { icon: Gift, label: "Tổng thưởng đã nhận", value: formatUsd(quotaToUsd(user.aff_history_quota || 0)) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Giới thiệu bạn bè" desc="Mời bạn bè dùng Aura và nhận credit thưởng." refresh="/console/referral" />

      <div className="card p-5">
        <h2 className="font-semibold">Link giới thiệu của bạn</h2>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm">
          <span className="truncate">{link}</span>
          <CopyButton value={link} />
        </div>
        <p className="mt-2 text-sm text-muted">
          Mã giới thiệu: <code className="font-mono">{affCode}</code>
        </p>
        {(site.referralInviterUsd > 0 || site.referralInviteeUsd > 0) && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {site.referralInviterUsd > 0 && <li>Bạn nhận {formatUsd(site.referralInviterUsd)} cho mỗi người đăng ký qua link.</li>}
            {site.referralInviteeUsd > 0 && <li>Người được mời nhận {formatUsd(site.referralInviteeUsd)} khi tạo tài khoản.</li>}
          </ul>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 text-xs text-muted">
              <s.icon className="size-3.5" /> {s.label}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">Chuyển thưởng vào số dư</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Thưởng giới thiệu được giữ riêng. Chuyển sang số dư để dùng gọi API.</p>
        <AffTransferForm available={available} />
      </div>
    </div>
  );
}
