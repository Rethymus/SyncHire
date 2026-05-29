/**
 * Next.js Configuration - Lightweight Version
 *
 * Simplified configuration without i18n plugin for local-first operation.
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output mode: 'standalone' for Docker, 'export' for static/Electron/Capacitor
  output: process.env.NEXT_OUTPUT === "export" ? "export" : "standalone",

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Compression
  compress: true,

  // Production source maps (errors only)
  productionBrowserSourceMaps: false,

  // React strict mode
  reactStrictMode: true,

  // Environment variables (server-side)
  env: {
    NEXT_PUBLIC_APP_NAME: "SyncHire Lite",
    NEXT_PUBLIC_APP_VERSION: "1.0.0",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    NEXT_TELEMETRY_DISABLED: "1",
  },

  // Security headers configuration
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
