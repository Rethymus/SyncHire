/**
 * Capacitor Configuration
 *
 * Configuration for building the Android APK with embedded frontend.
 * Production builds load bundled static files and keep cloud/backend access optional.
 */

import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.CAPACITOR_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'com.synchire.app',
  appName: 'SyncHire',
  webDir: 'frontend/out',
  server: {
    // In production, the app loads from the bundled static files
    // In development, it can point to a local dev server
    url: isDev ? 'http://localhost:3000' : undefined,
    cleartext: isDev,
  },
  android: {
    buildOptions: {
      keystorePath: undefined, // Will be set during CI/CD
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK', // Build APK instead of AAB
    },
    allowMixedContent: isDev,
    backgroundColor: '#ffffff',
  },
  plugins: {
    // Configure any Capacitor plugins here
  },
};

export default config;
