/**
 * Mobile bottom navigation — thumb-reach shortcuts for the four core
 * destinations, shown below md. "More" reuses the same slide-over sheet
 * as the top-bar hamburger (state owned by Navigation).
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiteCopy } from "@/lib/lite-i18n";
import { cn } from "@/lib/utils";
import { BarChart3, FileText, Home, Menu, Rss } from "lucide-react";

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { t } = useLiteCopy();

  const items = [
    { name: t.nav.dashboard, href: "/dashboard", icon: Home, current: /^\/dashboard/ },
    { name: t.nav.resumes, href: "/upload", icon: FileText, current: /^\/(upload|resumes)/ },
    { name: t.nav.jobFeed, href: "/job-feed", icon: Rss, current: /^\/job-feed/ },
    { name: t.nav.applications, href: "/applications", icon: BarChart3, current: /^\/applications/ },
  ];

  const linkClass = (isActive: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
      isActive
        ? "text-blue-700 dark:text-blue-300"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <nav
      aria-label={t.nav.menu}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.current.test(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={linkClass(isActive)}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.name}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t.nav.more}
        aria-haspopup="dialog"
        className={linkClass(false)}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span>{t.nav.more}</span>
      </button>
    </nav>
  );
}
