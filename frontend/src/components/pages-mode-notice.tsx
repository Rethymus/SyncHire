"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { isGithubPagesDeployment } from "@/lib/deployment-mode";

function isSyncHireApiRequest(input: RequestInfo | URL): boolean {
  const raw = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
  let url: URL;
  try {
    url = new URL(raw, window.location.href);
  } catch {
    return false;
  }

  if (!(url.pathname === "/api" || url.pathname.startsWith("/api/"))) return false;

  const knownOrigins = new Set([window.location.origin, "http://localhost:8000"]);
  try {
    knownOrigins.add(new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").origin);
  } catch {
    // The default local API origin above remains protected.
  }
  return knownOrigins.has(url.origin);
}

export function PagesModeNotice() {
  const pagesMode = isGithubPagesDeployment();

  useEffect(() => {
    if (!pagesMode) return;

    const originalFetch = window.fetch.bind(window);
    const blockedFetch: typeof window.fetch = (input, init) => {
      if (isSyncHireApiRequest(input)) {
        return Promise.reject(
          new Error("GitHub Pages 体验版没有 SyncHire 后端；此功能在 Pages 模式不可用。"),
        );
      }
      return originalFetch(input, init);
    };
    window.fetch = blockedFetch;

    return () => {
      if (window.fetch === blockedFetch) window.fetch = originalFetch;
    };
  }, [pagesMode]);

  if (!pagesMode) return null;

  return (
    <aside className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950" role="status">
      <div className="mx-auto flex max-w-7xl items-start gap-2">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Pages 体验版没有 SyncHire 后端，服务端功能会明确不可用且不会发起后端请求。API Key 只保留在当前标签页，并会直接发送给你确认的供应商；浏览器数据不是备份，请定期在
          <Link href="/data" className="mx-1 font-semibold underline underline-offset-2">数据管理</Link>
          导出。请仅在 HTTPS 页面并信任当前发布版本时使用密钥。
        </p>
      </div>
    </aside>
  );
}
