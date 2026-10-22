import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { ModelExplorer } from "@/components/model-explorer";
import { getModels } from "@/lib/models";
import { COINS, MAX_TOPUP } from "@/lib/payment";

export const metadata: Metadata = {
  title: "Bảng giá",
  description: "Trả trước theo token, không phí tháng. Nạp bằng USDT hoặc Bitcoin, 1 credit = 1 USD.",
};

export default async function PricingPage() {
  const models = await getModels();
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Trả bao nhiêu, dùng bấy nhiêu</h1>
        <p className="mt-4 text-lg text-muted">Nạp trước bằng USDT hoặc Bitcoin, trừ dần theo token. Không phí tháng, không hợp đồng.</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
        <div className="card p-7">
          <h2 className="font-semibold">Trả trước theo token</h2>
          <div className="mt-3 text-3xl font-semibold">
            1 credit = 1 USD
          </div>
          <ul className="mt-6 space-y-2.5 text-sm">
            {[
              "Dùng được mọi mô hình bằng một key",
              "Giá theo 1 triệu token, công khai cho từng mô hình",
              "Chỉ trừ tiền với request thành công",
              "Số dư không hết hạn",
              "Hạn mức chi tiêu riêng cho từng key",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" /> {t}
              </li>
            ))}
          </ul>
          <Link href="/register" className="btn-primary mt-7 w-full">
            Tạo tài khoản
          </Link>
        </div>
        <div className="card p-7">
          <h2 className="font-semibold">Cách nạp</h2>
          <ul className="mt-4 divide-y divide-border text-sm">
            {COINS.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">
                    {c.label} <span className="text-muted">· {c.network}</span>
                  </div>
                  <div className="text-xs text-muted">{c.note}</div>
                </div>
                <div className="text-right text-xs text-muted">từ {c.min} USD</div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Tối đa {MAX_TOPUP.toLocaleString("vi-VN")} USD mỗi lần. Credit được cộng theo số USD thực nhận sau khi giao dịch xác nhận.{" "}
            <Link href="/docs/topup" className="text-accent">
              Hướng dẫn nạp
            </Link>
          </p>
          <p className="mt-3 text-xs text-muted">
            Dùng nhiều hoặc muốn làm đại lý? Liên hệ để nhận giá riêng.
          </p>
        </div>
      </div>

      <h2 className="mt-20 text-2xl font-semibold tracking-tight">Giá từng mô hình</h2>
      <p className="mt-2 text-sm text-muted">USD cho mỗi 1 triệu token. Giá có thể thay đổi theo nhà cung cấp; giá áp dụng là giá tại thời điểm gửi request.</p>
      <ModelExplorer models={models} />
    </div>
  );
}
