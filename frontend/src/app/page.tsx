/**
 * Root Page - Lightweight Version
 *
 * Simplified root page that redirects to dashboard.
 * No authentication required for local-first operation.
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to dashboard
  redirect('/dashboard');
}
