/**
 * Breadcrumb Navigation Component
 *
 * Provides automatic breadcrumb generation from current route with:
 * - Automatic route detection and breadcrumb generation
 * - Clickable navigation links
 * - Current page highlighting
 * - Mobile-responsive with truncation
 * - Accessibility support (ARIA labels, keyboard navigation)
 */

"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { generateBreadcrumbs, getRouteConfig } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useLiteCopy } from "@/lib/lite-i18n";

export interface BreadcrumbProps {
  /**
   * Custom title override for the current page
   */
  currentTitle?: string;

  /**
   * Dynamic route parameters (e.g., { id: "123" })
   */
  dynamicParams?: Record<string, string>;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Maximum number of breadcrumbs to show on mobile
   */
  maxMobileItems?: number;

  /**
   * Whether to show icons in breadcrumbs
   */
  showIcons?: boolean;
}

export function Breadcrumb({
  currentTitle,
  dynamicParams,
  className,
  maxMobileItems = 2,
  showIcons = true,
}: BreadcrumbProps) {
  const pathname = usePathname();
  const { locale, t } = useLiteCopy();

  // Generate breadcrumbs using useMemo for performance
  const breadcrumbs = useMemo(() => {
    const crumbs = generateBreadcrumbs(pathname, dynamicParams);

    // Override current page title if provided
    if (currentTitle && crumbs.length > 0) {
      crumbs[crumbs.length - 1].title = currentTitle;
    }

    const titleOverrides: Record<string, string> = {
      Home: locale === "zh-CN" ? "首页" : "Home",
      Dashboard: t.nav.dashboard,
      Profile: locale === "zh-CN" ? "角色卡" : "Profile",
      Resumes: t.nav.resumes,
      Upload: t.nav.resumes,
      "Job Descriptions": t.nav.jobDescriptions,
      Applications: t.nav.applications,
      Search: t.nav.search,
      "Search Applications": locale === "zh-CN" ? "搜索申请" : "Search Applications",
      "Data Management": t.nav.dataManagement,
      Settings: t.nav.settings,
      Analytics: locale === "zh-CN" ? "分析" : "Analytics",
      Interviews: locale === "zh-CN" ? "面试" : "Interviews",
      "Match Analysis": locale === "zh-CN" ? "匹配分析" : "Match Analysis",
      "Application Details": locale === "zh-CN" ? "申请详情" : "Application Details",
    };

    return crumbs.map((crumb) => ({
      ...crumb,
      title: titleOverrides[crumb.title] ?? crumb.title,
    }));
  }, [pathname, dynamicParams, currentTitle, locale, t]);

  // Don't show breadcrumbs if there's only one item (home)
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={cn("w-full", className)}
    >
      <ol className="flex items-center space-x-1 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
            )}
            <li
              className={cn(
                "flex items-center space-x-1",
                crumb.isCurrent
                  ? "text-gray-900 font-medium"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {showIcons && crumb.icon && !crumb.isCurrent && (
                <crumb.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              )}
              {crumb.isCurrent ? (
                <span className="truncate" aria-current="page">
                  {crumb.title}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="truncate hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  aria-label={locale === "zh-CN" ? `前往${crumb.title}` : `Navigate to ${crumb.title}`}
                >
                  {crumb.title}
                </Link>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>

      {/* Mobile-specific truncated breadcrumbs */}
      <style jsx>{`
        @media (max-width: 640px) {
          ol {
            max-width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          li:not(:last-child):not(:first-child) {
            display: none;
          }
          li:first-child + li {
            display: flex;
          }
        }
      `}</style>
    </nav>
  );
}

/**
 * Simplified breadcrumb component for pages with complex layouts
 * Shows minimal breadcrumbs on mobile
 */
export function CompactBreadcrumb({
  currentTitle,
  dynamicParams,
  className,
}: Pick<BreadcrumbProps, "currentTitle" | "dynamicParams" | "className">) {
  const pathname = usePathname();
  const { locale, t } = useLiteCopy();

  const breadcrumbs = useMemo(() => {
    const crumbs = generateBreadcrumbs(pathname, dynamicParams);

    if (currentTitle && crumbs.length > 0) {
      crumbs[crumbs.length - 1].title = currentTitle;
    }

    const titleOverrides: Record<string, string> = {
      Home: locale === "zh-CN" ? "首页" : "Home",
      Dashboard: t.nav.dashboard,
      Profile: locale === "zh-CN" ? "角色卡" : "Profile",
      Resumes: t.nav.resumes,
      Upload: t.nav.resumes,
      "Job Descriptions": t.nav.jobDescriptions,
      Applications: t.nav.applications,
      Search: t.nav.search,
      "Data Management": t.nav.dataManagement,
      Settings: t.nav.settings,
    };

    return crumbs.map((crumb) => ({
      ...crumb,
      title: titleOverrides[crumb.title] ?? crumb.title,
    }));
  }, [pathname, dynamicParams, currentTitle, locale, t]);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  const firstCrumb = breadcrumbs[0];
  const lastCrumb = breadcrumbs[breadcrumbs.length - 1];

  return (
    <nav aria-label="Breadcrumb navigation" className={cn("w-full", className)}>
      <ol className="flex items-center space-x-2 text-sm">
        <li className="flex items-center space-x-1">
          <Link
            href={firstCrumb.path}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label={locale === "zh-CN" ? "前往首页" : "Navigate to home"}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{firstCrumb.title}</span>
          </Link>
        </li>
        <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
        <li className="text-gray-900 font-medium truncate">
          <span aria-current="page">{lastCrumb.title}</span>
        </li>
      </ol>
    </nav>
  );
}

/**
 * Breadcrumb component with custom separator
 */
export function BreadcrumbWithSeparator({
  separator,
  ...props
}: BreadcrumbProps & { separator?: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, t } = useLiteCopy();

  const breadcrumbs = useMemo(() => {
    const crumbs = generateBreadcrumbs(pathname, props.dynamicParams);

    if (props.currentTitle && crumbs.length > 0) {
      crumbs[crumbs.length - 1].title = props.currentTitle;
    }

    const titleOverrides: Record<string, string> = {
      Home: locale === "zh-CN" ? "首页" : "Home",
      Dashboard: t.nav.dashboard,
      Profile: locale === "zh-CN" ? "角色卡" : "Profile",
      Resumes: t.nav.resumes,
      Upload: t.nav.resumes,
      "Job Descriptions": t.nav.jobDescriptions,
      Applications: t.nav.applications,
      Search: t.nav.search,
      "Data Management": t.nav.dataManagement,
      Settings: t.nav.settings,
    };

    return crumbs.map((crumb) => ({
      ...crumb,
      title: titleOverrides[crumb.title] ?? crumb.title,
    }));
  }, [pathname, props.dynamicParams, props.currentTitle, locale, t]);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={cn("w-full", props.className)}
    >
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && (
              <li className="text-gray-400" aria-hidden="true">
                {separator || "/"}
              </li>
            )}
            <li
              className={cn(
                crumb.isCurrent
                  ? "text-gray-900 font-medium"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {crumb.isCurrent ? (
                <span className="truncate" aria-current="page">
                  {crumb.title}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="truncate hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label={locale === "zh-CN" ? `前往${crumb.title}` : `Navigate to ${crumb.title}`}
                >
                  {crumb.title}
                </Link>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Hook to get current breadcrumb data for custom implementations
 */
export function useBreadcrumbs(dynamicParams?: Record<string, string>) {
  const pathname = usePathname();

  return useMemo(() => {
    return generateBreadcrumbs(pathname, dynamicParams);
  }, [pathname, dynamicParams]);
}

/**
 * Hook to get current route configuration
 */
export function useRouteConfig() {
  const pathname = usePathname();

  return useMemo(() => {
    return getRouteConfig(pathname);
  }, [pathname]);
}

export default Breadcrumb;
