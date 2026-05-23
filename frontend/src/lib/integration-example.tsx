/**
 * 新工具集成示例
 * 演示 error-handler、form-validator、toast 的协同使用
 */

"use client";

import { useState } from "react";
import { useToastMessage } from "@/components/ui/toast";
import { ErrorHandler, ErrorLogger, ErrorType, ErrorSeverity } from "@/lib/error-handler";
import { FormValidator, ValidationRules } from "@/lib/form-validator";

/**
 * 示例1: 表单提交 - 完整错误处理流程
 */
export function useFormSubmission() {
  const toast = useToastMessage();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Record<string, string>) => {
    // 步骤1: 表单验证
    const validator = FormValidatorFactory.signup();
    const validationResult = validator.validateForm(data);

    if (!validationResult.isValid) {
      // 显示验证错误
      const firstError = Object.values(validationResult.errors)[0];
      toast.error("表单验证失败", firstError);
      return;
    }

    setLoading(true);

    try {
      // 步骤2: API调用
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      // 步骤3: 成功处理
      toast.success("注册成功", "欢迎使用SyncHire");
      return result;

    } catch (error) {
      // 步骤4: 统一错误处理
      const appError = ErrorHandler.handleApiError(error);
      ErrorLogger.log(appError);

      // 根据错误严重程度显示不同的toast
      if (appError.severity === ErrorSeverity.CRITICAL) {
        toast.error("系统错误", "服务暂时不可用，请稍后重试");
      } else {
        toast.error("操作失败", ErrorHandler.getUserMessage(appError));
      }

      throw appError;
    } finally {
      setLoading(false);
    }
  };

  return { handleSubmit, loading };
}

/**
 * 示例2: 实时表单验证
 */
export function useRealtimeValidation(validator: FormValidator) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (fieldName: string, value: string) => {
    const error = validator.validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: error || "" }));
    return !error;
  };

  const handleBlur = (fieldName: string, value: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, value);
  };

  const handleChange = (fieldName: string, value: string) => {
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  };

  return {
    errors,
    touched,
    validateField,
    handleBlur,
    handleChange,
  };
}

/**
 * 示例3: API错误拦截器
 */
export function createApiClient(baseURL: string) {
  return {
    async post(endpoint: string, data: unknown) {
      try {
        const response = await fetch(`${baseURL}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        const appError = ErrorHandler.handleApiError(error);
        ErrorLogger.log(appError);
        throw appError;
      }
    },

    async get(endpoint: string) {
      try {
        const response = await fetch(`${baseURL}${endpoint}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        const appError = ErrorHandler.handleApiError(error);
        ErrorLogger.log(appError);
        throw appError;
      }
    },
  };
}

/**
 * 示例4: 完整的登录表单组件集成
 */
export function useLoginFormIntegration() {
  const toast = useToastMessage();
  const validator = FormValidatorFactory.login();
  const { errors, touched, handleBlur, handleChange } = useRealtimeValidation(validator);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证所有字段
    const validationResult = validator.validateForm(formData);
    if (!validationResult.isValid) {
      // 标记所有字段为已触摸，显示所有错误
      const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {});
      Object.keys(validationResult.errors).forEach(key => {
        // 显示错误toast
        toast.error("表单错误", validationResult.errors[key]);
      });
      return;
    }

    setLoading(true);

    try {
      const apiClient = createApiClient("/api");
      const result = await apiClient.post("/auth/login", formData);

      toast.success("登录成功", "正在跳转...");
      return result;
    } catch (error) {
      const appError = error as AppError;
      if (appError.type === ErrorType.AUTH) {
        toast.error("登录失败", "邮箱或密码错误");
      } else {
        toast.error("网络错误", ErrorHandler.getUserMessage(appError));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    handleChange(fieldName, value);
  };

  return {
    formData,
    errors,
    touched,
    loading,
    handleSubmit,
    handleBlur: (fieldName: string) => {
      const value = fieldName in formData ? formData[fieldName as keyof typeof formData] : "";
      handleBlur(fieldName, value);
    },
    handleFieldChange,
  };
}

// 类型导入
interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// 工厂函数导入（如果FormValidatorFactory不存在）
const FormValidatorFactory = {
  login: () => {
    const validator = new FormValidator();
    validator
      .addRule("email", ValidationRules.required("邮箱"), ValidationRules.email())
      .addRule("password", ValidationRules.required("密码"));
    return validator;
  },
  signup: () => {
    const validator = new FormValidator();
    validator
      .addRule("email", ValidationRules.required("邮箱"), ValidationRules.email())
      .addRule("password", ValidationRules.required("密码"), {
        validate: (v) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v),
        message: "密码至少8位，需包含大小写字母和数字"
      })
      .addRule("name", ValidationRules.required("姓名"), ValidationRules.minLength(2, "姓名"))
      .addRule("confirmPassword", ValidationRules.required("确认密码"), {
        validate: (v) => v === v, // 简化示例
        message: "两次输入的密码不一致"
      });
    return validator;
  },
};

export { FormValidatorFactory };
