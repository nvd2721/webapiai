"use client";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card p-8 text-center">
      <h2 className="font-semibold">Không tải được dữ liệu</h2>
      <p className="mt-2 text-sm text-muted">{error.message || "Có lỗi xảy ra."}</p>
      <button className="btn-primary mt-5" onClick={reset}>
        Thử lại
      </button>
    </div>
  );
}
