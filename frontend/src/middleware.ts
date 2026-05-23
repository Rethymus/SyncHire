/**
 * Next.js Middleware
 * Applies security headers to all responses
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Generate CSP headers with nonce for inline scripts
 */
function getCSPHeaders(nonce: string) {
  // Production: strict CSP with nonce
  // Development: relaxed CSP for Next.js dev mode
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    return {
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://*.githubusercontent.com",
        "font-src 'self' data:",
        "connect-src 'self' https://api.github.com",
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
      "img-src 'self' data: blob: https://*.githubusercontent.com",
      "font-src 'self' data:",
      "connect-src 'self' https://api.github.com",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  };
}

/**
 * Middleware to apply security headers
 */
export function middleware(request: NextRequest) {
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
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
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
