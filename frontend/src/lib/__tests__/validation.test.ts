/**
 * Validation Utilities Tests
 *
 * Test suite for input validation and sanitization functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeTextInput,
  validateEmail,
  validatePassword,
  validateFile,
  validateJobDescription,
  containsXSSPatterns,
  RateLimiter
} from '../validation';

describe('sanitizeTextInput', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeTextInput('<p>Hello</p>')).toBe('Hello');
    expect(sanitizeTextInput('<script>alert("XSS")</script>')).toBe('alert("XSS")');
  });

  it('should trim whitespace', () => {
    expect(sanitizeTextInput('  hello  ')).toBe('hello');
  });

  it('should throw error for non-string input', () => {
    expect(() => sanitizeTextInput(null as any)).toThrow();
    expect(() => sanitizeTextInput(undefined as any)).toThrow();
  });
});

describe('validateEmail', () => {
  it('should validate valid emails', () => {
    expect(validateEmail('test@example.com')).toEqual({
      valid: true,
      sanitized: 'test@example.com'
    });
    expect(validateEmail('  TEST@EXAMPLE.COM  ')).toEqual({
      valid: true,
      sanitized: 'test@example.com'
    });
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid').valid).toBe(false);
    expect(validateEmail('@example.com').valid).toBe(false);
    expect(validateEmail('test@').valid).toBe(false);
  });

  it('should return error messages', () => {
    expect(validateEmail('').error).toBeDefined();
    expect(validateEmail('invalid').error).toBeDefined();
  });
});

describe('validatePassword', () => {
  it('should validate strong passwords', () => {
    expect(validatePassword('Password1').valid).toBe(true);
    expect(validatePassword('MySecurePass123').valid).toBe(true);
  });

  it('should reject weak passwords', () => {
    expect(validatePassword('').valid).toBe(false);
    expect(validatePassword('short').valid).toBe(false);
    expect(validatePassword('nocaps123').valid).toBe(false);
    expect(validatePassword('NOLOWERCASE1').valid).toBe(false);
  });

  it('should calculate password strength', () => {
    expect(validatePassword('Password1').strength).toBe('weak');
    expect(validatePassword('Password1!').strength).toBe('medium');
    expect(validatePassword('MySecurePass123!').strength).toBe('strong');
  });
});

describe('validateFile', () => {
  it('should validate valid files', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    expect(validateFile(file).valid).toBe(true);
  });

  it('should reject oversized files', () => {
    const file = new File([new Array(6 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf'
    });
    expect(validateFile(file).valid).toBe(false);
  });

  it('should reject invalid file types', () => {
    const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
    expect(validateFile(file).valid).toBe(false);
  });

  it('should sanitize filenames', () => {
    const file = new File(['content'], 'test file.pdf', { type: 'application/pdf' });
    expect(validateFile(file).sanitizedFilename).toBe('test_file.pdf');
  });
});

describe('validateJobDescription', () => {
  it('should validate complete JD data', () => {
    const result = validateJobDescription({
      title: 'Software Engineer',
      company: 'Test Company',
      description: 'A great job opportunity',
      requirements: 'JavaScript\nReact\nTypeScript'
    });

    expect(result.valid).toBe(true);
    expect(result.sanitized.title).toBe('Software Engineer');
    expect(result.sanitized.requirements).toHaveLength(3);
  });

  it('should return errors for incomplete data', () => {
    const result = validateJobDescription({
      title: '',
      company: '',
      description: ''
    });

    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeDefined();
    expect(result.errors.company).toBeDefined();
    expect(result.errors.description).toBeDefined();
  });

  it('should sanitize description from XSS', () => {
    const result = validateJobDescription({
      title: 'Developer',
      company: 'TestCorp',
      description: '<script>alert("XSS")</script>Great job'
    });

    expect(result.sanitized.description).not.toContain('<script>');
    expect(result.sanitized.description).toContain('Great job');
  });
});

describe('containsXSSPatterns', () => {
  it('should detect common XSS patterns', () => {
    expect(containsXSSPatterns('<script>alert("XSS")</script>')).toBe(true);
    expect(containsXSSPatterns('javascript:alert("XSS")')).toBe(true);
    expect(containsXSSPatterns('<img src=x onerror="alert(1)">')).toBe(true);
    expect(containsXSSPatterns('<iframe src="evil.com">')).toBe(true);
  });

  it('should not flag safe content', () => {
    expect(containsXSSPatterns('Hello world')).toBe(false);
    expect(containsXSSPatterns('Check out example.com')).toBe(false);
  });
});

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(3, 1000);
  });

  it('should allow calls within limit', () => {
    expect(rateLimiter.canMakeCall()).toBe(true);
    expect(rateLimiter.canMakeCall()).toBe(true);
    expect(rateLimiter.canMakeCall()).toBe(true);
  });

  it('should block calls exceeding limit', () => {
    rateLimiter.canMakeCall();
    rateLimiter.canMakeCall();
    rateLimiter.canMakeCall();
    expect(rateLimiter.canMakeCall()).toBe(false);
  });

  it('should reset after time window', async () => {
    rateLimiter.canMakeCall();
    rateLimiter.canMakeCall();
    rateLimiter.canMakeCall();

    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(rateLimiter.canMakeCall()).toBe(true);
  });

  it('should provide time until next call', () => {
    rateLimiter.canMakeCall();
    rateLimiter.canMakeCall();
    rateLimiter.canMakeCall();

    const timeUntilNext = rateLimiter.getTimeUntilNextCall();
    expect(timeUntilNext).toBeGreaterThan(0);
    expect(timeUntilNext).toBeLessThanOrEqual(1000);
  });
});
