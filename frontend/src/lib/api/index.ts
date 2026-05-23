/**
 * API and networking barrel exports
 * Unified API client with enhanced error handling and CSRF protection
 */

// Unified API Client (merged from api-client.ts and api-client-v2.ts)
export {
  UnifiedAPIClient,
  apiClient,
  APIClient,
} from "../api/unified-client";

// Error handling utilities
export * from "../error-handler";

// CSRF protection utilities
export * from "../csrf";
