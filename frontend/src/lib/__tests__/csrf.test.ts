/**
 * CSRF Protection Tests
 * Critical security tests for CSRF token management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCSRFToken,
  getCSRFTokenFromCookie,
  getCSRFTokenHeader,
  addCSRFHeaders,
  isCSRFTokenValid,
} from '../csrf';

// Mock document for SSR scenarios
const mockDocument = {
  querySelector: vi.fn(),
  cookie: '',
} as unknown as Document;

describe('CSRF Protection', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    (global as any).document = mockDocument;
  });

  afterEach(() => {
    delete (global as any).document;
  });

  describe('getCSRFToken', () => {
    it('should return token from meta tag', () => {
      const mockMeta = { content: 'test-token-123' };
      mockDocument.querySelector = vi.fn().mockReturnValue(mockMeta);

      const token = getCSRFToken();
      expect(token).toBe('test-token-123');
      expect(mockDocument.querySelector).toHaveBeenCalledWith('meta[name="csrf-token"]');
    });

    it('should return null when meta tag not found', () => {
      mockDocument.querySelector = vi.fn().mockReturnValue(null);

      const token = getCSRFToken();
      expect(token).toBeNull();
    });

    it('should return null in SSR environment', () => {
      delete (global as any).document;

      const token = getCSRFToken();
      expect(token).toBeNull();
    });
  });

  describe('getCSRFTokenFromCookie', () => {
    it('should extract token from cookie string', () => {
      mockDocument.cookie = 'csrf_token=cookie-token-456; other=value';

      const token = getCSRFTokenFromCookie();
      expect(token).toBe('cookie-token-456');
    });

    it('should handle cookie with leading/trailing spaces', () => {
      mockDocument.cookie = '  csrf_token=spaced-token  ; other=value';

      const token = getCSRFTokenFromCookie();
      expect(token).toBe('spaced-token');
    });

    it('should return null when token not found', () => {
      mockDocument.cookie = 'other=value';

      const token = getCSRFTokenFromCookie();
      expect(token).toBeNull();
    });

    it('should return null in SSR environment', () => {
      delete (global as any).document;

      const token = getCSRFTokenFromCookie();
      expect(token).toBeNull();
    });
  });

  describe('getCSRFTokenHeader', () => {
    it('should prefer meta tag over cookie', () => {
      const mockMeta = { content: 'meta-token' };
      mockDocument.querySelector = vi.fn().mockReturnValue(mockMeta);
      mockDocument.cookie = 'csrf_token=cookie-token';

      const token = getCSRFTokenHeader();
      expect(token).toBe('meta-token');
    });

    it('should fall back to cookie when meta tag missing', () => {
      mockDocument.querySelector = vi.fn().mockReturnValue(null);
      mockDocument.cookie = 'csrf_token=cookie-token';

      const token = getCSRFTokenHeader();
      expect(token).toBe('cookie-token');
    });

    it('should return null when neither source available', () => {
      mockDocument.querySelector = vi.fn().mockReturnValue(null);
      mockDocument.cookie = '';

      const token = getCSRFTokenHeader();
      expect(token).toBeNull();
    });
  });

  describe('addCSRFHeaders', () => {
    it('should add CSRF token to existing headers', () => {
      mockDocument.cookie = 'csrf_token=test-token';
      const existingHeaders = { 'Content-Type': 'application/json' };

      const result = addCSRFHeaders(existingHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'test-token',
      });
    });

    it('should not modify headers when token unavailable', () => {
      mockDocument.cookie = '';
      const existingHeaders = { 'Content-Type': 'application/json' };

      const result = addCSRFHeaders(existingHeaders);

      expect(result).toEqual(existingHeaders);
    });

    it('should handle empty headers object', () => {
      mockDocument.cookie = 'csrf_token=test-token';

      const result = addCSRFHeaders({});

      expect(result).toEqual({
        'X-CSRF-Token': 'test-token',
      });
    });
  });

  describe('isCSRFTokenValid', () => {
    it('should return true for valid token', () => {
      mockDocument.cookie = 'csrf_token=valid-token';

      const isValid = isCSRFTokenValid();
      expect(isValid).toBe(true);
    });

    it('should return false for null token', () => {
      mockDocument.cookie = '';

      const isValid = isCSRFTokenValid();
      expect(isValid).toBe(false);
    });

    it('should return false for empty string token', () => {
      mockDocument.cookie = 'csrf_token=';

      const isValid = isCSRFTokenValid();
      expect(isValid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed cookie strings', () => {
      mockDocument.cookie = 'csrf_token=; other=value';

      const token = getCSRFTokenFromCookie();
      expect(token).toBe('');
    });

    it('should handle multiple csrf tokens in cookie', () => {
      mockDocument.cookie = 'csrf_token=first; csrf_token=second';

      const token = getCSRFTokenFromCookie();
      // Should return the first match
      expect(token).toBe('first');
    });

    it('should handle XSS attempts in token value', () => {
      const xssPayload = '<script>alert("xss")</script>';
      const mockMeta = { content: xssPayload };
      mockDocument.querySelector = vi.fn().mockReturnValue(mockMeta);

      const token = getCSRFToken();
      // Token validation should happen at server level
      expect(token).toBe(xssPayload);
    });
  });
});
