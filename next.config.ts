import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  outputFileTracingIncludes: {
    "/*": ["./prisma/preview.db", "./prisma/dev.db", "./data/uploads/**/*"],
  },
};

export default nextConfig;
