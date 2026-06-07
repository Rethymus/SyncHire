/**
 * Next.js Proxy - Configurable for both auth and lite modes
 *
 * Applies security headers and handles route redirects based on configuration.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Feature flags from environment
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true';

// Route configuration - can be extended without modifying core logic
const ROUTE_CONFIG = {
  // Routes to redirect to dashboard in lite mode
  redirectTargets: [
    "/",
    "/index.html",
    "/index",
  ],
  // Auth routes that only exist in auth mode
  authRoutes: [
    "/login",
    "/signup",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth",
  ],
  // Protected routes that require authentication
  protectedRoutes: [
    "/profile",
    "/settings",
    "/analytics",
  ],
  // Default redirect target
  defaultRedirect: "/dashboard",
};

/**
 * Generate CSP headers with nonce for inline scripts
 */
function getCSPHeaders(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    return {
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' http://localhost:* https://localhost:*",
        "frame-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    };
  }

  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'", // Required for Tailwind
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  };
}

/**
 * Check if route should be redirected based on mode
 */
function shouldRedirectRoute(pathname: string): string | null {
  // In lite mode, redirect auth routes to dashboard
  if (!ENABLE_AUTH) {
    if (ROUTE_CONFIG.authRoutes.some((route) => pathname.startsWith(route))) {
      return ROUTE_CONFIG.defaultRedirect;
    }
  }

  // Redirect root paths to dashboard
  if (ROUTE_CONFIG.redirectTargets.includes(pathname)) {
    return ROUTE_CONFIG.defaultRedirect;
  }

  return null;
}

/**
 * Proxy to apply security headers and handle route redirects
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route should be redirected
  const redirectTarget = shouldRedirectRoute(pathname);
  if (redirectTarget) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTarget;
    return NextResponse.redirect(url);
  }

  // Generate response with security headers
  const response = NextResponse.next();

  // Generate nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  response.headers.set("x-nonce", nonce);

  // Apply CSP headers
  const cspHeaders = getCSPHeaders(nonce);
  for (const [key, value] of Object.entries(cspHeaders)) {
    response.headers.set(key, value);
  }

  // Apply other security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");

  // Remove x-powered-by header
  response.headers.delete("x-powered-by");

  return response;
}

/**
 * Configure middleware to run on all paths
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
