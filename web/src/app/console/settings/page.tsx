import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { authed, requireSession } from "@/lib/auth";
import { getSelf } from "@/lib/newapi";
import { site } from "@/lib/site";

export const metadata = { title: "Cài đặt" };

export default async function SettingsPage() {
  const session = await requireSession();
  const user = await authed(() => getSelf(session));
  const rows = [
    ["ID người dùng", String(user.id)],
    ["Tên đăng nhập", user.username],
    ["Email", user.email || "Chưa có"],
    ["Nhóm", user.group],
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" desc="Thông tin tài khoản, tên hiển thị và mật khẩu." />
      <div className="card p-5">
        <h2 className="font-semibold">Tài khoản</h2>
        <dl className="mt-3 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Hồ sơ và mật khẩu</h2>
        <SettingsForm displayName={user.display_name || ""} />
      </div>
      <div className="card p-5 text-sm">
        <h2 className="font-semibold">Cần hỗ trợ?</h2>
        <p className="mt-1 text-muted">
          Để đổi email hoặc xóa tài khoản, liên hệ {site.supportEmail ? <a className="font-medium underline" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> : "bộ phận hỗ trợ"}.
        </p>
      </div>
    </div>
  );
}
