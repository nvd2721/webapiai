import Link from "next/link";
import { site } from "@/lib/site";

export const metadata = { title: "Giới thiệu" };

export default function AboutPage() {
  return (
    <div className="container-x max-w-3xl py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Về {site.name}</h1>
      <p className="mt-6 text-lg text-muted">
        {site.name} giúp lập trình viên và doanh nghiệp ở Việt Nam và châu Á dùng các mô hình AI hàng đầu thế giới mà không vướng thẻ thanh toán quốc tế hay phải quản lý
        hàng chục tài khoản.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {[
          ["Sứ mệnh", "Đưa AI tốt nhất tới tay mọi lập trình viên với chi phí minh bạch và cách thanh toán dễ dàng."],
          ["Cách chúng tôi làm", "Lấy mô hình từ nhà cung cấp chính thức, tính tiền theo token đúng như nhật ký, không phí ẩn."],
          ["Dữ liệu của bạn", "Không lưu nội dung prompt và câu trả lời. Chỉ lưu thông tin tính tiền."],
          ["Hỗ trợ", "Đội ngũ cùng múi giờ, trả lời bằng tiếng Việt qua Telegram, Zalo và email."],
        ].map(([t, d]) => (
          <div key={t} className="card p-6">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-2 text-sm text-muted">{d}</p>
          </div>
        ))}
      </div>
      <Link href="/support" className="btn-primary mt-10">
        Liên hệ chúng tôi
      </Link>
    </div>
  );
}
