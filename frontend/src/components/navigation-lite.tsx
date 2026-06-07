/**
 * Navigation Component - Lightweight Version
 *
 * Simplified navigation without authentication links.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiteCopy, type LiteLocale } from "@/lib/lite-i18n";
import {
  FileText,
  Briefcase,
  Search,
  Settings,
  Home,
  FolderOpen,
  BarChart3
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLiteCopy();

  const navItems = [
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
      name: t.nav.applications,
      href: "/applications",
      icon: BarChart3,
      current: /^\/applications/,
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
  ];

  const switchLocale = (nextLocale: LiteLocale) => {
    setLocale(nextLocale);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Briefcase className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                SyncHire <span className="text-blue-600">Lite</span>
              </span>
            </Link>
          </div>

          {/* Navigation links */}
          <div className="hidden md:flex items-center space-x-3">
            {navItems.map((item) => {
              const isActive = item.current.test(pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <div className="ml-1 flex items-center rounded-md border border-gray-200 bg-gray-50 p-1">
              {([
                ["en-US", t.nav.english],
                ["zh-CN", t.nav.chinese],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchLocale(value)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    locale === value
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  aria-pressed={locale === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <Link
              href="/data"
              className="inline-flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">{t.nav.settings}</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
