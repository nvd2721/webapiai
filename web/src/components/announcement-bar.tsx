"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

// Thin promo strip above the header. Text comes from ANNOUNCEMENT; dismissal is remembered per text.
export function AnnouncementBar({ text, href }: { text: string; href?: string }) {
  const [hidden, setHidden] = useState(true);
  const key = `ann:${text}`;
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(key) === "1");
    } catch {
      setHidden(false);
    }
  }, [key]);
  if (hidden || !text) return null;
  return (
    <div className="relative bg-accent px-10 py-2 text-center text-xs text-accent-fg">
      {href ? (
        <Link href={href} className="hover:underline">
          {text} →
        </Link>
      ) : (
        text
      )}
      <button
        type="button"
        aria-label="Đóng"
        className="absolute top-1/2 right-3 -translate-y-1/2 opacity-70 hover:opacity-100"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(key, "1");
          } catch {}
        }}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
