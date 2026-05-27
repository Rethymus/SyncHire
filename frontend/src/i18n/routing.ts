import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en-US', 'zh-CN'],

  // Used when no locale matches
  defaultLocale: 'zh-CN',

  // The `pathnames` object holds the mapping of internal route paths
  // to their localized versions
  localePrefix: {
    mode: 'as-needed',
    prefixes: {
      'en-US': '/en'
    }
  }
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);