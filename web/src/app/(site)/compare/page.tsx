import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "@/components/compare-view";
import { getModels } from "@/lib/models";

export const metadata: Metadata = {
  title: "So sánh mô hình",
  description: "Đặt các mô hình AI cạnh nhau: giá, context, khả năng và chuẩn API.",
};

export default async function ComparePage() {
  const models = await getModels();
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-semibold tracking-tight">So sánh mô hình</h1>
      <p className="mt-2 text-muted">Chọn tối đa 4 mô hình để xem giá, context và khả năng cạnh nhau.</p>
      <Suspense>
        <CompareView models={models} />
      </Suspense>
    </div>
  );
}
