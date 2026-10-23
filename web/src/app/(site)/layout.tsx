import { AnnouncementBar } from "@/components/announcement-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isDemo, site } from "@/lib/site";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {isDemo && (
        <div className="bg-amber-500/15 py-1.5 text-center text-xs text-amber-700 dark:text-amber-300">
          Chế độ demo: dữ liệu giả lập, chưa nối New API. Đăng nhập thử bằng demo / demo1234.
        </div>
      )}
      <AnnouncementBar text={site.announcement} href={site.announcementHref} />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
