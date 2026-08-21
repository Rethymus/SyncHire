/**
 * Root Layout - Lightweight Version
 *
 * Simplified layout without authentication providers or i18n routing
 * for local-first operation. Theme is managed by next-themes (class strategy).
 */

import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation-lite";
import { ToastProvider } from "@/components/ui/toast";
import { SearchProvider } from "@/contexts/search-context";
import { Providers } from "@/components/providers";
import { PagesModeNotice } from "@/components/pages-mode-notice";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "SyncHire Lite - Local Job Application Tool",
  description: "AI-powered local-first job application tool with complete privacy",
  keywords: ["job search", "resume", "application tracking", "AI", "local"],
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/manifest.webmanifest`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers>
            <SearchProvider>
              <ToastProvider>
                <Navigation />
              <PagesModeNotice />
                <div className="min-h-screen bg-muted/40 pb-16 md:pb-0">
                  {children}
                </div>
              <ServiceWorkerRegister />
              </ToastProvider>
            </SearchProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
