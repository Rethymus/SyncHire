/**
 * Root Layout - Lightweight Version
 *
 * Simplified layout without authentication providers or i18n routing
 * for local-first operation.
 */

import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation-lite";
import { ToastProvider } from "@/components/ui/toast";
import { SearchProvider } from "@/contexts/search-context";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "SyncHire Lite - Local Job Application Tool",
  description: "AI-powered local job application tool with complete privacy",
  keywords: ["job search", "resume", "application tracking", "AI", "local"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <SearchProvider>
            <ToastProvider>

              <main className="min-h-screen bg-gray-50">
                {children}
              </main>
            </ToastProvider>
          </SearchProvider>
        </Providers>
      </body>
    </html>
  );
}