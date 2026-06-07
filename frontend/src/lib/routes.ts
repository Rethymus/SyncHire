/**
 * Route Configuration for Breadcrumb Navigation and Active Section Highlighting
 *
 * Provides metadata for all routes in the application including titles, parents,
 * icons, and breadcrumb generation logic.
 */

import {
  Home,
  Briefcase,
  FileText,
  BarChart3,
  Settings,
  Search,
  Upload,
  TrendingUp,
  Users,
  Calendar,
  Database,
  Sparkles,
  CheckCircle,
  Target,
  FolderOpen,
  Bell,
} from "lucide-react";

export interface RouteConfig {
  path: string;
  title: string;
  parent?: string;
  icon?: any;
  description?: string;
  showInBreadcrumb?: boolean;
  adminOnly?: boolean;
}

export const routes: Record<string, RouteConfig> = {
  // Public routes
  "/": {
    path: "/",
    title: "Home",
    icon: Home,
    showInBreadcrumb: false,
  },
  "/login": {
    path: "/login",
    title: "Login",
    parent: "/",
    icon: Users,
  },
  "/signup": {
    path: "/signup",
    title: "Sign Up",
    parent: "/",
    icon: Users,
  },
  "/forgot-password": {
    path: "/forgot-password",
    title: "Forgot Password",
    parent: "/login",
    icon: Settings,
  },
  "/reset-password": {
    path: "/reset-password",
    title: "Reset Password",
    parent: "/login",
    icon: Settings,
  },

  // Main dashboard
  "/dashboard": {
    path: "/dashboard",
    title: "Dashboard",
    parent: "/",
    icon: Home,
    description: "Overview of your job applications",
  },

  // Resumes
  "/resumes": {
    path: "/resumes",
    title: "Resumes",
    parent: "/dashboard",
    icon: FileText,
    description: "Manage your resumes",
  },
  "/resumes/create": {
    path: "/resumes/create",
    title: "Create Resume",
    parent: "/resumes",
    icon: FileText,
  },
  "/resumes/[id]": {
    path: "/resumes/[id]",
    title: "Resume Details",
    parent: "/resumes",
    icon: FileText,
  },
  "/resumes/[id]/edit": {
    path: "/resumes/[id]/edit",
    title: "Edit Resume",
    parent: "/resumes/[id]",
    icon: FileText,
  },

  // Job Descriptions
  "/job-descriptions": {
    path: "/job-descriptions",
    title: "Job Descriptions",
    parent: "/dashboard",
    icon: Briefcase,
    description: "Manage job descriptions",
  },
  "/job-descriptions/create": {
    path: "/job-descriptions/create",
    title: "Add Job Description",
    parent: "/job-descriptions",
    icon: Briefcase,
  },
  "/job-descriptions/[id]": {
    path: "/job-descriptions/[id]",
    title: "Job Details",
    parent: "/job-descriptions",
    icon: Briefcase,
  },

  // Applications
  "/applications": {
    path: "/applications",
    title: "Applications",
    parent: "/dashboard",
    icon: BarChart3,
    description: "Track your job applications",
  },
  "/applications/create": {
    path: "/applications/create",
    title: "New Application",
    parent: "/applications",
    icon: BarChart3,
  },
  "/applications/detail": {
    path: "/applications/detail",
    title: "Application Details",
    parent: "/applications",
    icon: BarChart3,
  },
  "/applications/match": {
    path: "/applications/match",
    title: "Match Analysis",
    parent: "/applications",
    icon: Target,
  },
  "/applications/[id]": {
    path: "/applications/[id]",
    title: "Application Details",
    parent: "/applications",
    icon: BarChart3,
  },
  "/applications/[id]/edit": {
    path: "/applications/[id]/edit",
    title: "Edit Application",
    parent: "/applications/[id]",
    icon: BarChart3,
  },
  "/applications/[id]/match": {
    path: "/applications/[id]/match",
    title: "Match Analysis",
    parent: "/applications/[id]",
    icon: Target,
  },
  "/applications/analytics": {
    path: "/applications/analytics",
    title: "Application Analytics",
    parent: "/applications",
    icon: TrendingUp,
  },

  // Upload
  "/upload": {
    path: "/upload",
    title: "Upload",
    parent: "/dashboard",
    icon: Upload,
    description: "Upload resumes and job descriptions",
  },

  // Search
  "/search": {
    path: "/search",
    title: "Search",
    parent: "/dashboard",
    icon: Search,
    description: "Search resumes and applications",
  },
  "/search/applications": {
    path: "/search/applications",
    title: "Search Applications",
    parent: "/search",
    icon: Search,
  },

  // Analytics
  "/analytics": {
    path: "/analytics",
    title: "Analytics",
    parent: "/dashboard",
    icon: TrendingUp,
    description: "View detailed analytics",
  },

  // Data Management
  "/data": {
    path: "/data",
    title: "Data Management",
    parent: "/dashboard",
    icon: Database,
    description: "Export, import, and manage your data",
  },

  // Interviews
  "/interviews": {
    path: "/interviews",
    title: "Interviews",
    parent: "/dashboard",
    icon: Calendar,
    description: "Manage interview schedules",
  },
  "/interviews/[id]": {
    path: "/interviews/[id]",
    title: "Interview Details",
    parent: "/interviews",
    icon: Calendar,
  },
  "/interviews/[id]/edit": {
    path: "/interviews/[id]/edit",
    title: "Edit Interview",
    parent: "/interviews/[id]",
    icon: Calendar,
  },

  // Settings
  "/settings": {
    path: "/settings",
    title: "Settings",
    parent: "/",
    icon: Settings,
    description: "Manage your account settings",
  },
  "/settings/profile": {
    path: "/settings/profile",
    title: "Profile Settings",
    parent: "/settings",
    icon: Users,
  },
  "/settings/notifications": {
    path: "/settings/notifications",
    title: "Notification Settings",
    parent: "/settings",
    icon: Bell,
  },
  "/settings/security": {
    path: "/settings/security",
    title: "Security Settings",
    parent: "/settings",
    icon: CheckCircle,
  },
  "/settings/data": {
    path: "/settings/data",
    title: "Data & Privacy",
    parent: "/settings",
    icon: Database,
  },

  // Other pages
  "/about": {
    path: "/about",
    title: "About",
    parent: "/",
    icon: Sparkles,
  },
  "/pricing": {
    path: "/pricing",
    title: "Pricing",
    parent: "/",
    icon: TrendingUp,
  },
  "/help": {
    path: "/help",
    title: "Help",
    parent: "/",
    icon: CheckCircle,
  },
};

/**
 * Breadcrumb item interface
 */
export interface BreadcrumbItem {
  title: string;
  path: string;
  icon?: any;
  isCurrent: boolean;
}

/**
 * Generate breadcrumbs for a given path
 * Handles dynamic routes by replacing [id] with actual values
 */
export function generateBreadcrumbs(
  currentPath: string,
  dynamicParams?: Record<string, string>
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Handle dynamic routes by replacing parameters
  let normalizedPath = currentPath;
  if (dynamicParams) {
    Object.entries(dynamicParams).forEach(([key, value]) => {
      normalizedPath = normalizedPath.replace(`[${key}]`, value);
    });
  }

  // Build breadcrumb trail by walking up the route tree
  let currentRoute = routes[normalizedPath] || findMatchingRoute(normalizedPath);

  // If no exact match, try to find the closest parent
  if (!currentRoute) {
    const pathParts = normalizedPath.split('/').filter(Boolean);
    for (let i = pathParts.length; i > 0; i--) {
      const testPath = '/' + pathParts.slice(0, i).join('/');
      if (routes[testPath]) {
        currentRoute = routes[testPath];
        break;
      }
    }
  }

  // Walk up the parent chain
  let route: RouteConfig | undefined = currentRoute;
  const breadcrumbTrail: RouteConfig[] = [];

  while (route) {
    if (route.showInBreadcrumb !== false) {
      breadcrumbTrail.unshift(route);
    }
    route = route.parent ? routes[route.parent] : undefined;
  }

  // Convert to breadcrumb items
  breadcrumbTrail.forEach((crumb, index) => {
    breadcrumbs.push({
      title: crumb.title,
      path: crumb.path,
      icon: crumb.icon,
      isCurrent: index === breadcrumbTrail.length - 1,
    });
  });

  return breadcrumbs;
}

/**
 * Find a matching route for a dynamic path
 * Handles routes like /applications/123 -> /applications/[id]
 */
function findMatchingRoute(path: string): RouteConfig | undefined {
  const pathParts = path.split('/').filter(Boolean);

  // Try to match against dynamic routes
  for (const [routePath, routeConfig] of Object.entries(routes)) {
    if (routeConfig.path.includes('[')) {
      const routeParts = routeConfig.path.split('/').filter(Boolean);

      if (routeParts.length === pathParts.length) {
        let match = true;
        for (let i = 0; i < routeParts.length; i++) {
          // If the route part is not a parameter and doesn't match
          if (!routeParts[i].startsWith('[') && routeParts[i] !== pathParts[i]) {
            match = false;
            break;
          }
        }

        if (match) {
          return routeConfig;
        }
      }
    }
  }

  return undefined;
}

/**
 * Check if a route is active based on the current path
 * Handles partial matching for nested routes
 */
export function isRouteActive(routePath: string, currentPath: string): boolean {
  if (routePath === currentPath) {
    return true;
  }

  // Check if current path starts with route path (for nested routes)
  if (currentPath.startsWith(routePath + '/')) {
    return true;
  }

  // Handle dynamic routes
  if (routePath.includes('[')) {
    const routeParts = routePath.split('/').filter(Boolean);
    const pathParts = currentPath.split('/').filter(Boolean);

    if (routeParts.length === pathParts.length) {
      for (let i = 0; i < routeParts.length; i++) {
        if (!routeParts[i].startsWith('[') && routeParts[i] !== pathParts[i]) {
          return false;
        }
      }
      return true;
    }
  }

  return false;
}

/**
 * Get route configuration by path
 */
export function getRouteConfig(path: string): RouteConfig | undefined {
  return routes[path] || findMatchingRoute(path) || undefined;
}

/**
 * Get all routes for a specific parent (for navigation menus)
 */
export function getChildRoutes(parentPath: string): RouteConfig[] {
  return Object.values(routes).filter(
    route => route.parent === parentPath && route.showInBreadcrumb !== false
  );
}

/**
 * Get main navigation routes (top-level routes for navigation menu)
 */
export function getMainNavRoutes(): RouteConfig[] {
  return [
    routes["/dashboard"],
    routes["/resumes"],
    routes["/job-descriptions"],
    routes["/applications"],
    routes["/analytics"],
    routes["/settings"],
  ].filter(Boolean) as RouteConfig[];
}
