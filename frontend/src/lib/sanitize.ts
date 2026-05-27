/**
 * HTML Sanitization Utility
 *
 * Uses DOMPurify to prevent XSS attacks when rendering user-generated HTML content.
 *
 * Security Note: This utility must be used whenever setting innerHTML with user content.
 */

import DOMPurify from 'dompurify';

// Configure DOMPurify to sanitize unsafe URL protocols (client-side only)
if (typeof window !== 'undefined') {
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    // Block unsafe URL protocols in href and src attributes
    if (data.attrName === 'href' || data.attrName === 'src') {
      const value = data.attrValue?.toLowerCase().trim();
      if (value) {
        // Block javascript:, data:, vbscript:, and other unsafe protocols
        const unsafeProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:', 'chrome:', 'chrome-extension:'];
        if (unsafeProtocols.some(protocol => value.startsWith(protocol))) {
          // Remove the unsafe attribute
          data.attrValue = '';
          node.removeAttribute(data.attrName);
        }
      }
    }
  });
}

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param dirty - The unsanitized HTML string
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'class', 'id', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onkey'],
    ADD_ATTR: ['rel'], // Ensure rel attribute is allowed
  });
}

/**
 * Sanitize and render markdown HTML
 * @param markdown - The markdown HTML string
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeMarkdownHtml(markdown: string): string {
  return DOMPurify.sanitize(markdown, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'span', 'div', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'class', 'id', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onkey'],
    ADD_ATTR: ['rel'], // Add rel="noopener" to links
  });
}

/**
 * Sanitize search result highlights to prevent XSS attacks
 *
 * This function is specifically designed for search result highlights where we want
 * to allow basic highlighting tags but prevent any malicious content.
 *
 * Security Critical: Search results come from user-generated content and must be
 * sanitized before rendering to prevent XSS attacks.
 *
 * @param highlight - The unsanitized highlight HTML string
 * @returns Sanitized HTML safe for rendering in search results
 */
export function sanitizeHighlight(html: string): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['mark', 'strong', 'em'],
    ALLOWED_ATTR: ['class'], // Only allow class attribute for styling
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'a'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onkey', 'href', 'src'],
  });
}

export default DOMPurify;
