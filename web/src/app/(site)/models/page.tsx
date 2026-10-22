import type { Metadata } from "next";
import { ModelExplorer } from "@/components/model-explorer";
import { getModels } from "@/lib/models";

export const metadata: Metadata = {
  title: "Danh sách mô hình",
  description: "Tất cả mô hình AI gọi được bằng một API key: giá vào, giá ra theo 1 triệu token, context và nhà cung cấp.",
};

export default async function ModelsPage() {
  const models = await getModels();
  return (
    <div className="container-x py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Mô hình</h1>
      <p className="mt-2 text-muted">
        {models.length} mô hình, giá tính bằng USD cho mỗi 1 triệu token. Dùng tên mô hình ở cột đầu trong trường <code className="font-mono">model</code> của request.
      </p>
      <ModelExplorer models={models} />
    </div>
  );
}
