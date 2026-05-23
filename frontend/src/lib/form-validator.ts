/**
 * 统一表单验证系统
 * 补充现有的 validation.ts
 */

export interface ValidationRule {
  validate: (value: string, data?: Record<string, string>) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * 表单验证器类
 */
export class FormValidator {
  private rules: Map<string, ValidationRule[]> = new Map();

  /**
   * 添加字段验证规则
   */
  addRule(fieldName: string, ...rules: ValidationRule[]): this {
    const existing = this.rules.get(fieldName) || [];
    this.rules.set(fieldName, [...existing, ...rules]);
    return this;
  }

  /**
   * 验证单个字段
   */
  validateField(fieldName: string, value: string, data?: Record<string, string>): string | null {
    const fieldRules = this.rules.get(fieldName);
    if (!fieldRules) return null;

    for (const rule of fieldRules) {
      if (!rule.validate(value, data)) {
        return rule.message;
      }
    }

    return null;
  }

  /**
   * 验证整个表单
   */
  validateForm(data: Record<string, string>): ValidationResult {
    const errors: Record<string, string> = {};
    let isValid = true;

    for (const [fieldName, rules] of this.rules.entries()) {
      const value = data[fieldName] || "";
      for (const rule of rules) {
        if (!rule.validate(value, data)) {
          errors[fieldName] = rule.message;
          isValid = false;
          break; // 遇到第一个错误就停止
        }
      }
    }

    return { isValid, errors };
  }

  /**
   * 清除所有规则
   */
  clear(): void {
    this.rules.clear();
  }

  /**
   * 移除字段的验证规则
   */
  removeField(fieldName: string): void {
    this.rules.delete(fieldName);
  }
}

/**
 * 常用表单配置工厂
 */
export const FormValidatorFactory = {
  login: () => {
    const validator = new FormValidator();
    const { required } = ValidationRules;

    validator
      .addRule("email", required("邮箱"), {
        validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "请输入有效的邮箱地址"
      })
      .addRule("password", required("密码"));
    return validator;
  },

  signup: () => {
    const validator = new FormValidator();

    validator
      .addRule("email", {
        validate: (value: string) => value.trim().length > 0,
        message: "邮箱不能为空"
      })
      .addRule("email", {
        validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "请输入有效的邮箱地址"
      })
      .addRule("password", {
        validate: (v) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v),
        message: "密码至少8位，需包含大小写字母和数字"
      })
      .addRule("name", {
        validate: (value: string) => value.trim().length >= 2,
        message: "姓名至少需要2个字符"
      })
      .addRule("confirmPassword", {
        validate: (v, data) => v === data?.password,
        message: "两次输入的密码不一致"
      });
    return validator;
  },

  resume: () => {
    const validator = new FormValidator();

    validator
      .addRule("title", {
        validate: (value: string) => value.trim().length >= 2,
        message: "简历名称至少需要2个字符"
      })
      .addRule("name", {
        validate: (value: string) => value.trim().length >= 2,
        message: "姓名至少需要2个字符"
      })
      .addRule("phone", {
        validate: (value: string) => /^1[3-9]\d{9}$/.test(value.replace(/\s/g, "")),
        message: "请输入有效的手机号码"
      })
      .addRule("email", {
        validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "请输入有效的邮箱地址"
      });
    return validator;
  },

  jd: () => {
    const validator = new FormValidator();

    validator
      .addRule("title", {
        validate: (value: string) => value.trim().length >= 2,
        message: "职位名称至少需要2个字符"
      })
      .addRule("company", {
        validate: (value: string) => value.trim().length >= 2,
        message: "公司名称至少需要2个字符"
      })
      .addRule("description", {
        validate: (value: string) => value.trim().length >= 10,
        message: "职位描述至少需要10个字符"
      });
    return validator;
  },
};

/**
 * 常用验证规则
 */
export const ValidationRules = {
  required: (fieldName = "此字段"): ValidationRule => ({
    validate: (value: string) => value.trim().length > 0,
    message: `${fieldName}不能为空`,
  }),

  // 修正为直接返回ValidationRule对象，不需要再调用
  requiredDirect: (fieldName = "此字段"): ValidationRule => ({
    validate: (value: string) => value.trim().length > 0,
    message: `${fieldName}不能为空`,
  }),

  minLengthDirect: (min: number, fieldName = "此字段"): ValidationRule => ({
    validate: (value: string) => value.length >= min,
    message: `${fieldName}至少需要${min}个字符`,
  }),

  minLength: (min: number, fieldName = "此字段"): ValidationRule => ({
    validate: (value: string) => value.length >= min,
    message: `${fieldName}至少需要${min}个字符`,
  }),

  maxLength: (max: number, fieldName = "此字段"): ValidationRule => ({
    validate: (value: string) => value.length <= max,
    message: `${fieldName}不能超过${max}个字符`,
  }),

  email: (): ValidationRule => ({
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: "请输入有效的邮箱地址",
  }),

  phone: (): ValidationRule => ({
    validate: (value: string) => /^1[3-9]\d{9}$/.test(value.replace(/\s/g, "")),
    message: "请输入有效的手机号码",
  }),

  password: (): ValidationRule => ({
    validate: (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value),
    message: "密码至少8位，需包含大小写字母和数字",
  }),

  url: (): ValidationRule => ({
    validate: (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: "请输入有效的URL地址",
  }),
};

/**
 * React Hook表单验证工具
 */
export function useFormValidation(
  validator: FormValidator,
  initialData: Record<string, string> = {}
) {
  const [data, setData] = React.useState(initialData);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validate = () => {
    const result = validator.validateForm(data);
    setErrors(result.errors);
    return result.isValid;
  };

  const validateField = (fieldName: string, value: string) => {
    const error = validator.validateField(fieldName, value);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error || "",
    }));
    return !error;
  };

  const handleChange = (fieldName: string, value: string) => {
    setData((prev) => ({ ...prev, [fieldName]: value }));

    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  };

  const handleBlur = (fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, data[fieldName]);
  };

  const reset = () => {
    setData(initialData);
    setErrors({});
    setTouched({});
  };

  return {
    data,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    validateField,
    reset,
    setData,
  };
}

import React from "react";
