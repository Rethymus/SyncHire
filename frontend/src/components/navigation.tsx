"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles, LogOut, Settings } from "lucide-react";
import { memo } from "react";
import { useAppStore } from "@/lib/store";
import { clearAuthData } from "@/lib/auth";
import { NotificationCenter } from "@/components/notification-center";

const navLinks = [
  { name: "首页", href: "/" },
  { name: "功能", href: "#features" },
  { name: "价格", href: "#pricing" },
  { name: "关于", href: "#about" },
] as const;

function NavigationComponent() {
  const router = useRouter();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Memoize nav links to prevent re-renders
  const navLinksMemo = useMemo(() => navLinks, []);

  // Handle menu close with useCallback
  const handleCloseMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // Handle logout with useCallback
  const handleLogout = useCallback(() => {
    clearAuthData();
    logout();
    router.push('/login');
    setMobileMenuOpen(false);
  }, [logout, router]);

  // Handle ESC key to close menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        handleCloseMenu();
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      // Focus close button when menu opens
      closeButtonRef.current?.focus();
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, handleCloseMenu]);

  // Focus trap implementation
  useEffect(() => {
    if (!mobileMenuOpen || !menuRef.current) return;

    const focusableElements = menuRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [mobileMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="flex items-center gap-2 -m-1.5 p-1.5">
            <Sparkles className="h-8 w-8 text-blue-600" aria-hidden="true" />
            <span className="text-xl font-bold text-gray-900">SyncHire 知遇</span>
          </Link>
        </div>

        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            onClick={() => setMobileMenuOpen(true)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label="打开主菜单"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="hidden lg:flex lg:gap-x-12">
          {navLinksMemo.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-700 self-center">
                {user?.fullName || user?.email}
              </span>
              <NotificationCenter />
              <Button variant="ghost" asChild>
                <Link href="/dashboard">仪表盘</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/analytics">数据分析</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  设置
                </Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                登出
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">登录</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">免费开始</Link>
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden" role="dialog" aria-modal="true" id="mobile-menu">
          <div
            className="fixed inset-0 z-50 bg-gray-900/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10"
          >
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center gap-2 -m-1.5 p-1.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Sparkles className="h-8 w-8 text-blue-600" aria-hidden="true" />
                <span className="text-xl font-bold text-gray-900">SyncHire 知遇</span>
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="关闭菜单"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <nav className="-my-6 divide-y divide-gray-500/10" aria-label="移动菜单">
                <div className="space-y-2 py-6">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
                <div className="py-6 space-y-2">
                  {isAuthenticated ? (
                    <>
                      <div className="px-3 py-2 text-sm text-gray-700">
                        {user?.fullName || user?.email}
                      </div>
                      <div className="px-3 py-2">
                        <NotificationCenter />
                      </div>
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className="focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          仪表盘
                        </Link>
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link
                          href="/analytics"
                          onClick={() => setMobileMenuOpen(false)}
                          className="focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          数据分析
                        </Link>
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link
                          href="/settings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          设置
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        登出
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link
                          href="/login"
                          onClick={() => setMobileMenuOpen(false)}
                          className="focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          登录
                        </Link>
                      </Button>
                      <Button className="w-full" asChild>
                        <Link
                          href="/signup"
                          onClick={() => setMobileMenuOpen(false)}
                          className="focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          免费开始
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export const Navigation = memo(NavigationComponent);
