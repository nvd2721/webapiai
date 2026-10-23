import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Markdown pages are read from disk at request time.
  outputFileTracingIncludes: { "/**": ["./content/**/*"] },
  async redirects() {
    return [
      { source: "/dashboard/usage", destination: "/console/logs", permanent: true },
      { source: "/dashboard/:path*", destination: "/console/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
