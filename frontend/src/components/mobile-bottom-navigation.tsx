"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, FileText, Search, User, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";

const navItems = [
  {
    name: "首页",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "申请",
    href: "/applications",
    icon: Briefcase,
  },
  {
    name: "简历",
    href: "/search/resumes",
    icon: FileText,
  },
  {
    name: "职位",
    href: "/search/jds",
    icon: Search,
  },
  {
    name: "我的",
    href: "/settings",
    icon: User,
  },
];

function MobileBottomNavigationComponent() {
  const pathname = usePathname();

  // Hide on login/signup pages and desktop
  if (pathname?.includes("/login") || pathname?.includes("/signup")) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom"
      aria-label="移动端主导航"
    >
      <div className="flex items-center justify-around h-16 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 min-h-[44px] transition-colors",
                isActive
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon className="h-6 w-6" aria-hidden="true" />
                {isActive && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                )}
              </div>
              <span className="text-xs mt-1 font-medium">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export const MobileBottomNavigation = memo(MobileBottomNavigationComponent);