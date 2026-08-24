import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  compress: true,
  reactStrictMode: true,
};

export default nextConfig;
