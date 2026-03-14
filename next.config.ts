import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No static export — we need API routes for Vercel serverless
  images: {
    unoptimized: true,
  },
  // Exclude server-only packages from client bundles
  serverExternalPackages: ['@libsql/client'],
};

export default nextConfig;
