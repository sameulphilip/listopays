import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      {
        source: "/payment/:path*",
        destination: "https://pay.listopays.com/payment/:path*",
      },
      {
        source: "/img/:path*",
        destination: "https://pay.listopays.com/img/:path*",
      },
    ];
  },
};

export default nextConfig;
