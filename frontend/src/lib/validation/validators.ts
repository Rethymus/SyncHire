/**
 * 统一验证器
 * 消除跨多个文件的重复验证逻辑
 */

import { REGEX } from "@/lib/constants";

// XSS攻击模式检测
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // 事件处理器如 onclick=
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /<input/gi,
  /<button/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  /expression\s*\(/gi, // CSS expression
  /@import/gi,
];

/**
 * 邮箱验证器
 * 统一所有页面的邮箱验证逻辑
 */
export function validateEmail(
  email: string,
  options?: { required?: boolean; trim?: boolean }
): { valid: boolean; error?: string; sanitized?: string } {
  const { required = true, trim = true } = options || {};

  if (required && !email) {
    return { valid: false, error: "请输入邮箱" };
  }

  const sanitized = trim ? email.trim() : email;

  if (!REGEX.EMAIL.test(sanitized)) {
    return { valid: false, error: "请输入有效的邮箱地址", sanitized };
  }

  return { valid: true, sanitized };
}

/**
 * 密码验证器
 * 增强的密码策略（12字符+特殊字符）
 */
export function validatePassword(
  password: string,
  options?: { minLength?: number; requireSpecialChar?: boolean }
): { valid: boolean; error?: string; strength?: 'weak' | 'medium' | 'strong' } {
  const { minLength = 12, requireSpecialChar = true } = options || {};

  if (!password) {
    return { valid: false, error: "请输入密码" };
  }

  if (password.length < minLength) {
    return { valid: false, error: `密码至少需要${minLength}个字符`, strength: 'weak' };
  }

  if (!REGEX.PASSWORD.test(password)) {
    return { valid: false, error: "密码需包含大小写字母、数字和特殊字符", strength: 'weak' };
  }

  if (requireSpecialChar && !REGEX.SPECIAL_CHAR.test(password)) {
    return { valid: false, error: "密码需包含特殊字符(!@#$%^&*)", strength: 'weak' };
  }

  // 计算密码强度
  let strengthScore = 0;
  if (password.length >= 16) strengthScore++;
  if (/[!@#$%^&*]/.test(password)) strengthScore++;
  if (password.length >= 20) strengthScore++;

  const strength = strengthScore >= 2 ? 'strong' : strengthScore === 1 ? 'medium' : 'weak';
  return { valid: true, strength };
}

/**
 * 必填字段验证器
 */
export function validateRequired(value: string, fieldName?: string): { valid: boolean; error?: string } {
  if (!value || !value.trim()) {
    return { valid: false, error: `${fieldName || '此字段'}不能为空` };
  }
  return { valid: true };
}

/**
 * 最小长度验证器
 */
export function validateMinLength(value: string, min: number, fieldName?: string): { valid: boolean; error?: string } {
  if (value.length < min) {
    return { valid: false, error: `${fieldName || '此字段'}至少需要${min}个字符` };
  }
  return { valid: true };
}

/**
 * 字段验证器（错误清除）
 * 当用户开始输入时清除错误
 */
export function clearFieldError<T extends Record<string, string>>(
  fieldName: string,
  errors: T,
  setErrors: React.Dispatch<React.SetStateAction<T>>
): void {
  if (errors[fieldName]) {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }
}

/**
 * 检测字符串中的XSS攻击模式
 * @param input - 待检测的字符串
 * @returns 是否包含XSS攻击模式
 */
export function containsXSSPatterns(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * 验证职位描述输入
 * @param data - 职位描述数据
 * @returns 验证结果
 */
export function validateJobDescription(data: {
  title: string;
  company: string;
  description: string;
  requirements: string;
}): {
  valid: boolean;
  errors?: Record<string, string>;
  sanitized?: {
    title: string;
    company: string;
    description: string;
    requirements: string;
  };
} {
  const errors: Record<string, string> = {};
  const sanitized: { title: string; company: string; description: string; requirements: string } = {
    title: '',
    company: '',
    description: '',
    requirements: '',
  };

  // 验证并清理标题
  const titleResult = validateRequired(data.title.trim(), '职位名称');
  if (!titleResult.valid) {
    errors.title = titleResult.error || '职位名称不能为空';
  } else if (data.title.trim().length < 2) {
    errors.title = '职位名称至少需要2个字符';
  } else if (data.title.trim().length > 100) {
    errors.title = '职位名称不能超过100个字符';
  }
  sanitized.title = data.title.trim();

  // 验证并清理公司名称
  const companyResult = validateRequired(data.company.trim(), '公司名称');
  if (!companyResult.valid) {
    errors.company = companyResult.error || '公司名称不能为空';
  } else if (data.company.trim().length > 100) {
    errors.company = '公司名称不能超过100个字符';
  }
  sanitized.company = data.company.trim();

  // 验证并清理职位描述
  const descResult = validateRequired(data.description.trim(), '职位描述');
  if (!descResult.valid) {
    errors.description = descResult.error || '职位描述不能为空';
  } else if (data.description.trim().length < 20) {
    errors.description = '职位描述至少需要20个字符';
  } else if (data.description.trim().length > 10000) {
    errors.description = '职位描述不能超过10000个字符';
  }
  sanitized.description = data.description.trim();

  // 处理任职要求（可选字段）
  const requirements = data.requirements.trim();
  if (requirements && requirements.length > 5000) {
    errors.requirements = '任职要求不能超过5000个字符';
  }
  sanitized.requirements = requirements;

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, sanitized };
}
