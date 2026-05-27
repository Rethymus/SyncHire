/**
 * Enhanced Navigation Component with Active Section Highlighting
 *
 * Provides main navigation with:
 * - Active route detection and highlighting
 * - Visual indicators (border, background, icon)
 * - Smooth transitions
 * - Support for nested routes
 * - Mobile-responsive design
 */

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles, LogOut, Settings, ChevronDown } from "lucide-react";
import { memo } from "react";
import { useAppStore } from "@/lib/store";
import { clearAuthData } from "@/lib/auth";
import { NotificationCenter } from "@/components/notification-center";
import { LanguageSwitcher } from "@/components/language-switcher";
import { isRouteActive } from "@/lib/routes";
import { cn } from "@/lib/utils";

function NavigationComponent() {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Memoize nav links with active state
  const navLinksMemo = useMemo(() => [
    { name: t('home'), href: "/" },
    { name: t('about'), href: "#about" },
    { name: t('pricing'), href: "#pricing" },
    { name: t('help'), href: "#help" },
  ], [t]);

  // Memoize authenticated nav items with icons
  const authNavItems = useMemo(() => {
    return [
      {
        name: t('dashboard'),
        href: "/dashboard",
        icon: Sparkles,
      },
      {
        name: t('applications'),
        href: "/applications",
        icon: ChevronDown,
        children: [
          { name: "All Applications", href: "/applications" },
          { name: "Analytics", href: "/applications/analytics" },
        ],
      },
      {
        name: "Resumes",
        href: "/resumes",
      },
      {
        name: "Job Descriptions",
        href: "/job-descriptions",
      },
      {
        name: t('settings'),
        href: "/settings",
        icon: Settings,
      },
    ];
  }, [t]);

  // Handle menu close with useCallback
  const handleCloseMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  }, []);

  // Handle logout with useCallback
  const handleLogout = useCallback(() => {
    clearAuthData();
    logout();
    router.push('/login');
    setMobileMenuOpen(false);
  }, [logout, router]);

  // Handle dropdown toggle
  const handleDropdownToggle = useCallback((name: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(prev => prev === name ? null : name);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <a href="/" className="flex items-center gap-2 -m-1.5 p-1.5">
            <Sparkles className="h-8 w-8 text-blue-600" aria-hidden="true" />
            <span className="text-xl font-bold text-gray-900">SyncHire 知遇</span>
          </a>
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
              className={cn(
                "text-sm font-semibold leading-6 transition-colors relative",
                isRouteActive(link.href, pathname)
                  ? "text-blue-600"
                  : "text-gray-900 hover:text-blue-600"
              )}
            >
              {link.name}
              {isRouteActive(link.href, pathname) && (
                <span className="absolute bottom-[-8px] left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-700 self-center">
                {user?.fullName || user?.email}
              </span>
              <NotificationCenter />
              {authNavItems.map((item) => (
                <div key={item.name} className="relative">
                  {item.children ? (
                    <div className="relative">
                      <button
                        className={cn(
                          "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          isRouteActive(item.href, pathname) ? "text-blue-600" : "text-gray-700 hover:bg-gray-50"
                        )}
                        onClick={(e) => handleDropdownToggle(item.name, e)}
                      >
                        {item.name}
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {openDropdown === item.name && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                          {item.children.map((child) => (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={cn(
                                "block px-4 py-2 text-sm transition-colors",
                                isRouteActive(child.href, pathname)
                                  ? "bg-blue-50 text-blue-600"
                                  : "text-gray-700 hover:bg-gray-50"
                              )}
                              onClick={() => setOpenDropdown(null)}
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      asChild
                      className={cn(
                        "gap-2",
                        isRouteActive(item.href, pathname) && "text-blue-600"
                      )}
                    >
                      <a href={item.href}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        {item.name}
                      </a>
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <a href="/login">{t('login')}</a>
              </Button>
              <Button asChild>
                <a href="/signup">{t('signup')}</a>
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
              <a
                href="/"
                className="flex items-center gap-2 -m-1.5 p-1.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Sparkles className="h-8 w-8 text-blue-600" aria-hidden="true" />
                <span className="text-xl font-bold text-gray-900">SyncHire 知遇</span>
              </a>
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
                  {navLinksMemo.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={cn(
                        "-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600",
                        isRouteActive(link.href, pathname)
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-900 hover:bg-gray-50"
                      )}
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
                      {authNavItems.map((item) => (
                        <div key={item.name}>
                          {item.children ? (
                            <div>
                              <button
                                className={cn(
                                  "w-full flex items-center justify-start px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                  isRouteActive(item.href, pathname) && "text-blue-600 bg-blue-50"
                                )}
                                onClick={(e) => handleDropdownToggle(item.name, e)}
                              >
                                {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                                {item.name}
                                <ChevronDown className="h-4 w-4 ml-auto" />
                              </button>
                              {openDropdown === item.name && (
                                <div className="pl-4 space-y-1 mt-1">
                                  {item.children.map((child) => (
                                    <Link
                                      key={child.name}
                                      href={child.href}
                                      className={cn(
                                        "block px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600",
                                        isRouteActive(child.href, pathname)
                                          ? "bg-blue-50 text-blue-600"
                                          : "text-gray-700 hover:bg-gray-50"
                                      )}
                                      onClick={() => {
                                        setMobileMenuOpen(false);
                                        setOpenDropdown(null);
                                      }}
                                    >
                                      {child.name}
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start",
                                isRouteActive(item.href, pathname) && "text-blue-600 bg-blue-50"
                              )}
                              asChild
                            >
                              <a
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                                {item.name}
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" className="w-full" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('logout')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <a
                          href="/login"
                          onClick={() => setMobileMenuOpen(false)}
                          className="focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          {t('login')}
                        </a>
                      </Button>
                      <Button className="w-full" asChild>
                        <a
                          href="/signup"
                          onClick={() => setMobileMenuOpen(false)}
                          className="focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          {t('signup')}
                        </a>
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

export const NavigationEnhanced = memo(NavigationComponent);