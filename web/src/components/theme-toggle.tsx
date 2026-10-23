"use client";

import { Moon, Sun } from "lucide-react";

// The initial class is set by THEME_SCRIPT before paint; this only flips it.
export function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Đổi giao diện sáng/tối"
      title="Sáng / tối"
      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bg-soft hover:text-fg"
      onClick={() => {
        const dark = document.documentElement.classList.toggle("dark");
        try {
          localStorage.setItem("theme", dark ? "dark" : "light");
        } catch {}
      }}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </button>
  );
}

export const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
