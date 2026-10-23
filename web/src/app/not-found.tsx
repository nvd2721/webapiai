import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <div className="text-6xl font-semibold text-accent">404</div>
        <p className="mt-3 text-muted">Không tìm thấy trang bạn cần.</p>
        <Link href="/" className="btn-primary mt-6">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
