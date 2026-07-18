/**
 * Next.js Configuration - Lightweight Version
 *
 * Local-first configuration with optional static export for native shells.
 */

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isStaticExport = process.env.NEXT_OUTPUT === "export";
const isGithubPages = process.env.NEXT_PUBLIC_DEPLOYMENT_TARGET === "github-pages";
const pagesBasePath = isGithubPages ? (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "") : "";
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Output mode: 'standalone' for Docker, 'export' for static/Electron/Capacitor
  output: isStaticExport ? "export" : "standalone",
  basePath: pagesBasePath || undefined,

  // Static shell builds do not have a Next.js server, so route.ts API handlers are ignored.
  pageExtensions: isStaticExport ? ["tsx", "jsx"] : ["ts", "tsx", "js", "jsx"],

  // Exported HTML works best with directory-style routes in native shells.
  trailingSlash: isStaticExport,

  // Image optimization
  images: {
    unoptimized: isStaticExport,
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
    NEXT_PUBLIC_DEPLOYMENT_TARGET: process.env.NEXT_PUBLIC_DEPLOYMENT_TARGET || "standard",
    NEXT_PUBLIC_BASE_PATH: pagesBasePath,
    NEXT_TELEMETRY_DISABLED: "1",
  },

  ...(isStaticExport
    ? {}
    : {
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
      }),
};

export default withNextIntl(nextConfig);
