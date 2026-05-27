import type { Metadata, Viewport } from "next";
import "../globals.css";
import { ErrorBoundaryWrapper } from "@/components/error-boundary-wrapper";
import { QueryClientProvider } from "@/lib/react-query-setup";
import { AuthProvider } from "@/components/auth/auth-provider";
import { SearchProvider } from "@/contexts/search-context";
import { ToastProvider } from "@/components/ui/toast";
import InterviewReminders from "@/components/interview-reminders";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

// 使用系统字体栈替代Google Fonts，避免网络依赖
// 优先使用: system-ui, SF Pro, Inter, 等现代无衬线字体
const fontStack = [
  "system-ui",
  "-apple-system",
  "BlinkMacSystemFont",
  '"Segoe UI"',
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  "sans-serif",
  '"Apple Color Emoji"',
  '"Segoe UI Emoji"',
  '"Segoe UI Symbol"',
].join(", ");

export const metadata: Metadata = {
  title: "SyncHire 知遇 - AI 求职助手，让每一次求职都是一场知遇之恩",
  description: "SyncHire 知遇用 AI 为您的求职之路赋能。智能匹配职位需求，自动优化简历内容，提高面试邀请率 3 倍。",
  keywords: ["求职", "简历", "AI", "面试", "找工作", "职业发展"],
  authors: [{ name: "SyncHire Team" }],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "SyncHire 知遇 - AI 求职助手",
    description: "让每一次求职都是一场知遇之恩",
    type: "website",
    locale: "zh_CN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} style={{ fontFamily: fontStack }}>
      <body className="antialiased">
        {/* Skip Navigation Link for Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-blue-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <NextIntlClientProvider messages={messages}>
          <QueryClientProvider>
            <AuthProvider>
              <SearchProvider>
                <ToastProvider>
                  <InterviewReminders />
                  <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
                </ToastProvider>
              </SearchProvider>
            </AuthProvider>
          </QueryClientProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
