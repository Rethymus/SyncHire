"use client";

/**
 * Theme provider wrapper (next-themes).
 * Follows the shadcn/ui dark-mode recipe: class strategy + system default,
 * so Tailwind's `dark:` variant and the .dark CSS tokens in globals.css work.
 */

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
