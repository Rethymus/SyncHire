/**
 * Capacitor Configuration
 *
 * Configuration for building the Android APK with embedded frontend.
 * The backend runs as a local service within the app.
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.synchire.app',
  appName: 'SyncHire',
  webDir: 'frontend/out',
  server: {
    // In production, the app loads from the bundled static files
    // In development, it can point to a local dev server
    url: process.env.CAPACITOR_DEV === 'true' ? 'http://localhost:3000' : undefined,
    cleartext: true, // Allow HTTP for local backend communication
  },
  android: {
    buildOptions: {
      keystorePath: undefined, // Will be set during CI/CD
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK', // Build APK instead of AAB
    },
    allowMixedContent: true, // Allow mixed content for local API calls
    backgroundColor: '#ffffff',
  },
  plugins: {
    // Configure any Capacitor plugins here
  },
};

export default config;
