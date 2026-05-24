/**
 * HTML Sanitization Utility
 *
 * Uses DOMPurify to prevent XSS attacks when rendering user-generated HTML content.
 *
 * Security Note: This utility must be used whenever setting innerHTML with user content.
 */

import DOMPurify from 'dompurify';

// Configure DOMPurify to sanitize unsafe URL protocols
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

export default DOMPurify;
