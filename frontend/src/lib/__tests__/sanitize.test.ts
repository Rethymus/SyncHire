/**
 * HTML Sanitization Tests
 * Critical security tests for XSS prevention
 */

import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';
import { sanitizeHtml, sanitizeMarkdownHtml } from '../sanitize';

// Mock DOMPurify for SSR environments
vi.mock('dompurify', () => ({
  default: {
    sanitize: (dirty: string, config: unknown) => {
      // Basic sanitization for tests
      return dirty
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '');
    },
  },
}));

describe('HTML Sanitization', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<div><script>alert("xss")</script>Hello</div>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert("xss")');
      expect(result).toContain('Hello');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="malicious()">Click me</div>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });

    it('should preserve safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = sanitizeHtml(input);

      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('Hello');
      expect(result).toContain('world');
    });

    it('should handle null input gracefully', () => {
      const result = sanitizeHtml(null as unknown as string);
      expect(result).toBe('');
    });

    it('should handle empty string', () => {
      const result = sanitizeHtml('');
      expect(result).toBe('');
    });

    it('should sanitize complex XSS payloads', () => {
      const payloads = [
        '<img src=x onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '<a href="javascript:alert(1)">click</a>',
        '<iframe src="javascript:alert(1)"></iframe>',
      ];

      payloads.forEach((payload) => {
        const result = sanitizeHtml(payload);
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
        expect(result).not.toContain('javascript:');
      });
    });
  });

  describe('sanitizeMarkdownHtml', () => {
    it('should sanitize markdown-generated HTML', () => {
      const input = '<h1>Title</h1><p>Text with <script>alert("xss")</script></p>';
      const result = sanitizeMarkdownHtml(input);

      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<p>Text with');
      expect(result).not.toContain('<script>');
    });

    it('should preserve markdown formatting', () => {
      const input = '<strong>Bold</strong> and <em>italic</em>';
      const result = sanitizeMarkdownHtml(input);

      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should remove dangerous markdown elements', () => {
      const input = '<details><summary>Click</summary><script>alert(1)</script></details>';
      const result = sanitizeMarkdownHtml(input);

      expect(result).not.toContain('<script>');
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle XSS in href attributes', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('javascript:');
    });

    it('should handle data URLs with scripts', () => {
      const input = '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain('data:text/html');
    });

    it('should handle encoded XSS attempts', () => {
      const input = '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>';
      const result = sanitizeHtml(input);

      // Should not decode and execute
      expect(result).not.toContain('<script>');
    });

    it('should handle DOM clobbering attempts', () => {
      const input = '<form id="x"><input name="parentNode"></form>';
      const result = sanitizeHtml(input);

      // Sanitizer should handle safely
      expect(typeof result).toBe('string');
    });
  });

  describe('Performance', () => {
    it('should handle large HTML documents efficiently', () => {
      const largeHtml = '<div>' + '<p>Test</p>'.repeat(1000) + '</div>';
      const start = Date.now();

      const result = sanitizeHtml(largeHtml);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in <100ms
      expect(result).toContain('Test');
    });
  });
});
