/**
 * Navigation Component - Lightweight Version
 *
 * Simplified navigation without authentication links.
 * Desktop: five primary destinations plus a "More" dropdown for secondary tools.
 * Mobile: hamburger opening a slide-over sheet (Radix Dialog, shadcn/ui Sheet pattern).
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLiteCopy, type LiteLocale } from "@/lib/lite-i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  FileText,
  Briefcase,
  Search,
  Settings,
  Home,
  FolderOpen,
  BarChart3,
  IdCard,
  Rss,
  Radar,
  SlidersHorizontal,
  Menu,
  ChevronDown,
} from "lucide-react";

const brandMarkSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/brand/synchire-mark.svg`;

interface NavItem {
  name: string;
  href: string;
  icon: typeof Home;
  current: RegExp;
}

function useNavItems() {
  const { locale, t } = useLiteCopy();

  const primary: NavItem[] = [
    {
      name: t.nav.dashboard,
      href: "/dashboard",
      icon: Home,
      current: /^\/dashboard/,
    },
    {
      name: t.nav.resumes,
      href: "/upload",
      icon: FileText,
      current: /^\/(upload|resumes)/,
    },
    {
      name: t.nav.jobDescriptions,
      href: "/jd-input",
      icon: Briefcase,
      current: /^\/(jd-input|job-descriptions)/,
    },
    {
      name: t.nav.jobFeed,
      href: "/job-feed",
      icon: Rss,
      current: /^\/job-feed/,
    },
    {
      name: t.nav.applications,
      href: "/applications",
      icon: BarChart3,
      current: /^\/applications/,
    },
  ];

  const secondary: NavItem[] = [
    {
      name: t.nav.sources,
      href: "/job-sources",
      icon: SlidersHorizontal,
      current: /^\/job-sources/,
    },
    {
      name: t.nav.radar,
      href: "/company-board",
      icon: Radar,
      current: /^\/company-board/,
    },
    {
      name: t.nav.profile,
      href: "/profile",
      icon: IdCard,
      current: /^\/profile/,
    },
    {
      name: t.nav.search,
      href: "/search",
      icon: Search,
      current: /^\/search/,
    },
    {
      name: t.nav.dataManagement,
      href: "/data",
      icon: FolderOpen,
      current: /^\/data/,
    },
    {
      name: t.nav.settings,
      href: "/settings",
      icon: Settings,
      current: /^\/settings/,
    },
  ];

  return { primary, secondary, locale, t };
}

function LocaleSwitch({
  locale,
  labels,
  onSelect,
  className,
}: {
  locale: LiteLocale;
  labels: { english: string; chinese: string };
  onSelect: (next: LiteLocale) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center rounded-md border border-gray-200 bg-gray-50 p-1",
        className
      )}
      role="group"
      aria-label="Language"
    >
      {([
        ["en-US", labels.english],
        ["zh-CN", labels.chinese],
      ] as const).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={cn(
            "min-w-11 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
            locale === value
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
          aria-pressed={locale === value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const { primary, secondary, locale, t } = useNavItems();
  const { setLocale } = useLiteCopy();
  const [mobileOpen, setMobileOpen] = useState(false);

  const switchLocale = (nextLocale: LiteLocale) => {
    setLocale(nextLocale);
  };

  const allItems = [...primary, ...secondary];
  const secondaryActive = secondary.some((item) => item.current.test(pathname));

  const renderNavLink = (item: NavItem, mobile = false) => {
    const Icon = item.icon;
    const isActive = item.current.test(pathname);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        onClick={mobile ? () => setMobileOpen(false) : undefined}
        className={cn(
          "flex items-center gap-2 rounded-md font-medium transition-colors",
          mobile
            ? "px-3 py-3 text-base"
            : "px-3 py-2 text-sm",
          isActive
            ? "bg-blue-50 text-blue-700"
            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <Icon className={cn(mobile ? "h-5 w-5" : "h-4 w-4")} aria-hidden="true" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2"
              aria-label="SyncHire Lite"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brandMarkSrc} alt="SyncHire" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900">
                SyncHire <span className="text-indigo-600">Lite</span>
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-1">
            {primary.map((item) => renderNavLink(item))}

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none",
                  secondaryActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500"
                )}
                aria-label={t.nav.more}
              >
                <span>{t.nav.more}</span>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {secondary.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.current.test(pathname);
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2",
                          isActive && "font-medium text-blue-700"
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span>{item.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <LocaleSwitch
              locale={locale}
              labels={{ english: t.nav.english, chinese: t.nav.chinese }}
              onSelect={switchLocale}
              className="ml-2"
            />
          </div>

          {/* Mobile menu */}
          <div className="flex items-center md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={t.nav.menu}
                aria-expanded={mobileOpen}
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
              <SheetContent side="left" className="flex w-80 flex-col p-0">
                <SheetHeader className="border-b border-gray-200 px-4 py-4">
                  <SheetTitle className="flex items-center space-x-2 text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={brandMarkSrc} alt="" className="h-7 w-7" />
                    <span>
                      SyncHire <span className="text-indigo-600">Lite</span>
                    </span>
                  </SheetTitle>
                  <SheetDescription className="text-left">
                    {t.nav.menu}
                  </SheetDescription>
                </SheetHeader>
                <nav aria-label={t.nav.menu} className="flex flex-col gap-1 p-3">
                  {allItems.map((item) => renderNavLink(item, true))}
                </nav>
                <div className="mt-auto border-t border-gray-200 px-4 py-4">
                  <LocaleSwitch
                    locale={locale}
                    labels={{ english: t.nav.english, chinese: t.nav.chinese }}
                    onSelect={switchLocale}
                    className="w-fit"
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
