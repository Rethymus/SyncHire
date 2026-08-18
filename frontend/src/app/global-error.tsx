"use client";

/**
 * Global error boundary (Next.js convention).
 * Replaces the root layout entirely, so it must render its own <html>/<body>
 * and cannot rely on providers (theme, toast, i18n copy) being alive.
 * Styling stays inline for that reason.
 */

import { useEffect } from "react";
import { logger, LogCategory } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error(LogCategory.UI, "Global render error", error);
  }, [error]);

  const isZh =
    typeof navigator !== "undefined" &&
    (navigator.language || "").toLowerCase().startsWith("zh");

  return (
    <html lang={isZh ? "zh-CN" : "en"}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          backgroundColor: "#f9fafb",
          color: "#111827",
        }}
      >
        <div
          style={{
            maxWidth: "26rem",
            margin: "2rem 1rem",
            padding: "2rem",
            textAlign: "center",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "1rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              width: "4rem",
              height: "4rem",
              margin: "0 auto 1rem",
              borderRadius: "9999px",
              backgroundColor: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
            aria-hidden="true"
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>
            {isZh ? "SyncHire Lite 遇到错误" : "SyncHire Lite hit an error"}
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#4b5563",
              margin: "0 0 1.5rem",
            }}
          >
            {isZh
              ? "应用级错误中断了渲染。本地数据安全无损——可重试，或刷新页面返回仪表盘。"
              : "An application-level error interrupted rendering. Your local data is safe — retry, or reload to return to the dashboard."}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #d1d5db",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {isZh ? "重试" : "Try again"}
          </button>
        </div>
      </body>
    </html>
  );
}
