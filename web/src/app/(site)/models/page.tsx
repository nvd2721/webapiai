import type { Metadata } from "next";
import { Suspense } from "react";
import { ModelBrowser } from "@/components/model-browser";
import { getModels } from "@/lib/models";

export const metadata: Metadata = {
  title: "Mô hình",
  description: "Tất cả mô hình AI gọi được bằng một API key: giá theo 1 triệu token, context, khả năng và chuẩn API.",
};

export default async function ModelsPage() {
  const models = await getModels();
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        Mô hình <span className="text-muted">{models.length}</span>
      </h1>
      <p className="mt-2 text-muted">Một API key cho tất cả. Giá tính bằng USD cho mỗi 1 triệu token.</p>
      {models.length === 0 ? (
        <div className="card mt-8 p-10 text-center text-muted">Chưa tải được danh sách mô hình, vui lòng thử lại sau.</div>
      ) : (
        <Suspense>
          <ModelBrowser models={models} />
        </Suspense>
      )}
    </div>
  );
}
