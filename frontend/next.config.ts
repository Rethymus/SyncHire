import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 输出模式 (Docker 部署需要)
  output: "standalone",

  // 图片优化
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // 压缩
  compress: true,

  // 生产环境源映射 (仅错误时)
  productionBrowserSourceMaps: false,

  // React 严格模式
  reactStrictMode: true,

  // 注意: SWC压缩在Next.js 16+中默认启用，无需配置

  // 环境变量 (服务端)
  env: {
    NEXT_PUBLIC_APP_NAME: "SyncHire 知遇",
    NEXT_PUBLIC_APP_VERSION: "1.0.0",
    NEXT_TELEMETRY_DISABLED: "1",
  },

  // 安全头部配置
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
