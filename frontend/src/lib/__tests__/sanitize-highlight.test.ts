/**
 * Test suite for sanitizeHighlight function
 *
 * Security Critical: These tests verify that XSS payloads are properly sanitized
 * in search result highlights while preserving legitimate highlighting markup.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHighlight } from '../sanitize';

describe('sanitizeHighlight', () => {
  describe('XSS Prevention', () => {
    it('should strip script tags', () => {
      const malicious = '<script>alert("XSS")</script>highlighted text';
      const sanitized = sanitizeHighlight(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('highlighted text');
    });

    it('should strip event handlers', () => {
      const malicious = '<mark onclick="alert("XSS")">text</mark>';
      const sanitized = sanitizeHighlight(malicious);
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('alert');
    });

    it('should strip javascript: URLs', () => {
      const malicious = '<a href="javascript:alert("XSS")">link</a> text';
      const sanitized = sanitizeHighlight(malicious);
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('href');
    });

    it('should strip iframe tags', () => {
      const malicious = '<iframe src="evil.com"></iframe>highlighted text';
      const sanitized = sanitizeHighlight(malicious);
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('src=');
      expect(sanitized).toContain('highlighted text');
    });

    it('should strip style tags', () => {
      const malicious = '<style>body{display:none}</style>text';
      const sanitized = sanitizeHighlight(malicious);
      expect(sanitized).not.toContain('<style>');
      expect(sanitized).not.toContain('display:');
    });

    it('should strip img tags with onerror', () => {
      const malicious = '<img src=x onerror="alert("XSS")">text';
      const sanitized = sanitizeHighlight(malicious);
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('onerror');
    });
  });

  describe('Allowed Tags Preservation', () => {
    it('should preserve mark tags', () => {
      const input = '<mark class="bg-yellow-200">highlighted</mark> text';
      const sanitized = sanitizeHighlight(input);
      expect(sanitized).toContain('</mark>');
      expect(sanitized).toContain('highlighted');
    });

    it('should preserve strong tags', () => {
      const input = '<strong>bold text</strong> normal';
      const sanitized = sanitizeHighlight(input);
      expect(sanitized).toContain('</strong>');
      expect(sanitized).toContain('bold text');
    });

    it('should preserve em tags', () => {
      const input = '<em>italic text</em> normal';
      const sanitized = sanitizeHighlight(input);
      expect(sanitized).toContain('</em>');
      expect(sanitized).toContain('italic text');
    });

    it('should allow class attribute for styling', () => {
      const input = '<mark class="bg-yellow-200 rounded">text</mark>';
      const sanitized = sanitizeHighlight(input);
      expect(sanitized).toContain('class=');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeHighlight('')).toBe('');
    });

    it('should handle null input', () => {
      expect(sanitizeHighlight(null as any)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(sanitizeHighlight(undefined as any)).toBe('');
    });

    it('should handle mixed valid and invalid tags', () => {
      const input = '<mark>valid</mark><script>invalid</script><strong>also valid</strong>';
      const sanitized = sanitizeHighlight(input);
      expect(sanitized).toContain('<mark>valid</mark>');
      expect(sanitized).toContain('<strong>also valid</strong>');
      expect(sanitized).not.toContain('<script>');
    });

    it('should handle nested tags', () => {
      const input = '<mark><strong>bold highlight</strong></mark>';
      const sanitized = sanitizeHighlight(input);
      expect(sanitized).toContain('</mark>');
      expect(sanitized).toContain('</strong>');
      expect(sanitized).toContain('bold highlight');
    });

    it('should strip dangerous attributes from allowed tags', () => {
      const input = '<mark onclick="evil()">text</mark>';
      const sanitized = sanitizeHighlight(input);
      expect(sanitized).toContain('</mark>');
      expect(sanitized).not.toContain('onclick');
    });
  });

  describe('Real-world Search Highlights', () => {
    it('should handle typical search result highlights', () => {
      const input = '<mark class="bg-yellow-200">React</mark> developer with experience in <mark class="bg-yellow-200">TypeScript</mark>';
      const sanitized = sanitizeHighlight(input);
      expect(sanitized).toContain('React');
      expect(sanitized).toContain('TypeScript');
      expect(sanitized).toContain('<mark');
      expect(sanitized).not.toContain('script');
    });

    it('should handle multiple highlights', () => {
      const input = 'Experience with <mark>Python</mark>, <mark>JavaScript</mark>, and <mark>Go</mark>';
      const sanitized = sanitizeHighlight(input);
      expect(sanitized).toContain('<mark>Python</mark>');
      expect(sanitized).toContain('<mark>JavaScript</mark>');
      expect(sanitized).toContain('<mark>Go</mark>');
    });
  });
});
