"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-background dark:to-background px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-100 rounded-full mb-6">
          <span className="text-5xl font-bold text-blue-600">404</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          页面未找到
        </h1>
        <p className="text-muted-foreground mb-8">
          抱歉，您访问的页面不存在或已被移除。
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
          >
            <Home className="h-4 w-4" />
            返回首页
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-input text-muted-foreground rounded-lg hover:bg-muted/40 transition-colors min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回上页
          </button>
        </div>
      </div>
    </div>
  );
}
