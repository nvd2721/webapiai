import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { THEME_SCRIPT } from "@/components/theme-toggle";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "vietnamese"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: một API key cho mọi mô hình AI`, template: `%s | ${site.name}` },
  description:
    "Gọi GPT, Claude, Gemini, DeepSeek, Qwen và nhiều mô hình khác bằng một API key tương thích OpenAI và Anthropic. Trả theo token, nạp bằng USDT hoặc Bitcoin.",
  openGraph: { siteName: site.name, type: "website", locale: "vi_VN" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${mono.variable} min-h-dvh font-sans antialiased`}>{children}</body>
    </html>
  );
}
