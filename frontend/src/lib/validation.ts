/**
 * Input Validation Utilities
 *
 * Provides comprehensive validation for user inputs across the application.
 * All validation functions are designed to be secure and prevent common attacks.
 */

/**
 * Sanitize and validate text input to prevent XSS
 */
export function sanitizeTextInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('请输入有效的文本内容');
  }

  // Remove any HTML tags
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate and sanitize email address
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
  if (typeof email !== 'string') {
    return { valid: false, sanitized: '', error: 'Email must be a string' };
  }

  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!sanitized) {
    return { valid: false, sanitized: '', error: '请输入邮箱' };
  }

  if (!emailRegex.test(sanitized)) {
    return { valid: false, sanitized, error: '请输入有效的邮箱地址' };
  }

  return { valid: true, sanitized };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  error?: string;
} {
  if (typeof password !== 'string') {
    return { valid: false, strength: 'weak', error: '密码必须是字符串' };
  }

  if (!password) {
    return { valid: false, strength: 'weak', error: '请输入密码' };
  }

  if (password.length < 8) {
    return { valid: false, strength: 'weak', error: '密码至少8个字符' };
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { valid: false, strength: 'weak', error: '密码需包含大小写字母和数字' };
  }

  // Calculate strength
  let strengthScore = 0;
  if (password.length >= 12) strengthScore++;
  if (/[!@#$%^&*]/.test(password)) strengthScore++;
  if (password.length >= 16) strengthScore++;

  const strength = strengthScore >= 2 ? 'strong' : strengthScore === 1 ? 'medium' : 'weak';

  return { valid: true, strength };
}

/**
 * Validate file upload
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
}

export function validateFile(file: File, maxSize: number = 5 * 1024 * 1024): FileValidationResult {
  if (!file) {
    return { valid: false, error: '文件不存在' };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `文件大小超过限制 (${Math.round(maxSize / 1024 / 1024)}MB)`
    };
  }

  // Check file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: '不支持的文件类型' };
  }

  // Sanitize filename
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  return { valid: true, sanitizedFilename };
}

/**
 * Validate job description input
 */
export interface JDValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: {
    title: string;
    company: string;
    description: string;
    requirements: string[];
  };
}

export function validateJobDescription(data: {
  title?: string;
  company?: string;
  description?: string;
  requirements?: string;
}): JDValidationResult {
  const errors: Record<string, string> = {};
  const sanitized = {
    title: '',
    company: '',
    description: '',
    requirements: [] as string[]
  };

  // Validate title
  if (!data.title?.trim()) {
    errors.title = '请输入职位名称';
  } else if (data.title.trim().length < 2) {
    errors.title = '职位名称至少2个字符';
  } else {
    sanitized.title = sanitizeTextInput(data.title);
  }

  // Validate company
  if (!data.company?.trim()) {
    errors.company = '请输入公司名称';
  } else {
    sanitized.company = sanitizeTextInput(data.company);
  }

  // Validate description
  if (!data.description?.trim()) {
    errors.description = '请输入职位描述';
  } else if (data.description.length > 10000) {
    errors.description = '职位描述不能超过10000个字符';
  } else {
    sanitized.description = sanitizeTextInput(data.description);
  }

  // Process requirements
  if (data.requirements) {
    sanitized.requirements = data.requirements
      .split('\n')
      .map(r => sanitizeTextInput(r))
      .filter(r => r.length > 0);
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}

/**
 * Detect potential XSS patterns
 */
export function containsXSSPatterns(input: string): boolean {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /onclick=/i,
    /onmouseover=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Rate limiting for API calls
 */
export class RateLimiter {
  private calls: number[] = [];
  private readonly maxCalls: number;
  private readonly windowMs: number;

  constructor(maxCalls: number = 10, windowMs: number = 60000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  canMakeCall(): boolean {
    const now = Date.now();
    // Remove calls outside the window
    this.calls = this.calls.filter(time => now - time < this.windowMs);

    if (this.calls.length < this.maxCalls) {
      this.calls.push(now);
      return true;
    }

    return false;
  }

  reset(): void {
    this.calls = [];
  }

  getTimeUntilNextCall(): number {
    if (this.calls.length < this.maxCalls) {
      return 0;
    }

    const oldestCall = this.calls[0];
    return Math.max(0, this.windowMs - (Date.now() - oldestCall));
  }
}
