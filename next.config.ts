import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No static export — we need API routes for Vercel serverless
  images: {
    unoptimized: true,
  },
  // Exclude server-only packages from client bundles
  serverExternalPackages: ['@libsql/client'],
  // Enable modern optimizations
  reactStrictMode: true,
  // Compress responses
  compress: true,
  // Optimize package imports — tree-shake large libraries
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      '@radix-ui/react-icons',
      'framer-motion',
    ],
  },
};

export default nextConfig;
