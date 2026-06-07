/**
 * Navigation Component - Lightweight Version
 *
 * Simplified navigation without authentication links.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Briefcase,
  Search,
  Settings,
  Home,
  FolderOpen,
  BarChart3
} from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    current: /^\/dashboard/,
  },
  {
    name: "Resumes",
    href: "/upload",
    icon: FileText,
    current: /^\/(upload|resumes)/,
  },
  {
    name: "Job Descriptions",
    href: "/jd-input",
    icon: Briefcase,
    current: /^\/(jd-input|job-descriptions)/,
  },
  {
    name: "Applications",
    href: "/applications",
    icon: BarChart3,
    current: /^\/applications/,
  },
  {
    name: "Search",
    href: "/search",
    icon: Search,
    current: /^\/search/,
  },
  {
    name: "Data Management",
    href: "/data",
    icon: FolderOpen,
    current: /^\/data/,
  },
];

export function Navigation() {
  const pathname = usePathname();

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
          <div className="hidden md:flex items-center space-x-4">
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
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <Link
              href="/data"
              className="inline-flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
