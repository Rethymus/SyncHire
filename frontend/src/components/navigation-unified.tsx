/**
 * Unified Navigation Component - Works in both authenticated and lite modes
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
  BarChart3,
  LogOut,
  User,
} from "lucide-react";

// Feature flag for lite mode
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  current: RegExp;
  authRequired?: boolean;
  showInLite?: boolean;
}

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    current: /^\/dashboard/,
    showInLite: true,
  },
  {
    name: "Resumes",
    href: "/resumes",
    icon: FileText,
    current: /^\/resumes/,
    showInLite: true,
  },
  {
    name: "Job Descriptions",
    href: "/job-descriptions",
    icon: Briefcase,
    current: /^\/job-descriptions/,
    showInLite: true,
  },
  {
    name: "Applications",
    href: "/applications",
    icon: BarChart3,
    current: /^\/applications/,
    showInLite: true,
  },
  {
    name: "Search",
    href: "/search",
    icon: Search,
    current: /^\/search/,
    showInLite: true,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    current: /^\/analytics/,
    authRequired: true,
    showInLite: false,
  },
  {
    name: "Data Management",
    href: "/data",
    icon: FolderOpen,
    current: /^\/data/,
    showInLite: true,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    current: /^\/settings/,
    showInLite: true,
  },
];

export function Navigation() {
  const pathname = usePathname();

  // Filter nav items based on mode
  const visibleNavItems = navItems.filter((item) => {
    if (ENABLE_AUTH) {
      return true; // Show all items in auth mode
    }
    return item.showInLite ?? false; // Only show items marked for lite mode
  });

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Briefcase className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                SyncHire
                {!ENABLE_AUTH && (
                  <span className="text-blue-600"> Lite</span>
                )}
              </span>
            </Link>
          </div>

          {/* Navigation links */}
          <div className="hidden md:flex items-center space-x-4">
            {visibleNavItems.map((item) => {
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

          {/* User menu (only in auth mode) */}
          {ENABLE_AUTH && (
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/profile"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              <Link
                href="/logout"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <Link
              href="/settings"
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
