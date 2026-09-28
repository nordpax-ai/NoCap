import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "bcryptjs", "nodemailer", "@netlify/blobs", "@netlify/database"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
  async redirects() {
    return [{ source: "/admin/outbox", destination: "/area/admin/outbox", permanent: false }];
  },
};

export default nextConfig;
