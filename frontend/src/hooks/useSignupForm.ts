/**
 * 注册表单自定义 Hook
 * 提取表单验证、状态管理和错误处理逻辑
 */

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logger, LogCategory } from '@/lib/logger';
import { authAPI } from '@/lib/api-client';
import { storeTokens, storeUserData } from '@/lib/auth';
import { useAppStore } from '@/lib/store';

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignupFormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  general?: string;
}

export interface PasswordStrength {
  level: number;
  label: string;
  emoji: string;
}

export function useSignupForm() {
  const router = useRouter();
  const setUser = useAppStore((state) => state.setUser);
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<SignupFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // 密码强度计算
  const passwordStrength: PasswordStrength = useMemo(() => {
    const score = [
      formData.password.length >= 12,
      /[a-z]/.test(formData.password),
      /[A-Z]/.test(formData.password),
      /\d/.test(formData.password),
      /[!@#$%^&*]/.test(formData.password),
    ].filter(Boolean).length;

    if (score <= 2) {
      return { level: score, label: '弱', emoji: '😟' };
    } else if (score <= 3) {
      return { level: score, label: '中', emoji: '😐' };
    } else {
      return { level: score, label: '强', emoji: '😊' };
    }
  }, [formData.password]);

  // 验证表单
  const validateForm = useCallback((): boolean => {
    const newErrors: SignupFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名';
    } else if (formData.name.length < 2) {
      newErrors.name = '姓名至少2个字符';
    }

    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    if (!formData.password) {
      newErrors.password = '请输入密码';
    } else if (formData.password.length < 12) {
      newErrors.password = '密码至少需要12个字符';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(formData.password)) {
      newErrors.password = '密码需包含大小写字母、数字和特殊字符(!@#$%^&*)';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次密码不一致';
    }

    if (!acceptTerms) {
      newErrors.terms = '请同意服务条款';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, acceptTerms]);

  // 处理输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // 清除错误
    if (errors[name as keyof SignupFormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof SignupFormErrors];
        return newErrors;
      });
    }
  }, [errors]);

  // 处理失焦验证
  const handleInputBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const newErrors: SignupFormErrors = {};

    if (name === 'email' && formData.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = '请输入有效的邮箱地址';
      }
    } else if (name === 'password' && formData.password) {
      if (formData.password.length < 12) {
        newErrors.password = '密码至少需要12个字符';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(formData.password)) {
        newErrors.password = '密码需包含大小写字母、数字和特殊字符';
      }
    } else if (name === 'confirmPassword' && formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '两次密码不一致';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
    }
  }, [formData]);

  // 提交表单
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Call register API
      const response = await authAPI.register({
        full_name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (response.error || !response.data) {
        setErrors({ general: response.error || '注册失败，请稍后重试' });
        return;
      }

      // Auto-login after successful registration
      const loginResponse = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      if (loginResponse.error || !loginResponse.data) {
        setErrors({ general: '注册成功，但自动登录失败，请手动登录' });
        router.push('/login');
        return;
      }

      const { access_token, refresh_token } = loginResponse.data;

      // Store tokens
      storeTokens({ accessToken: access_token, refreshToken: refresh_token });

      // Store user data
      const userData = {
        id: response.data.id,
        email: response.data.email,
        fullName: response.data.full_name,
        isActive: response.data.is_active,
      };

      storeUserData(userData);
      setUser(userData);

      logger.info(LogCategory.AUTH, 'User registered successfully', { email: userData.email });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      logger.error(LogCategory.AUTH, 'Signup error', error as Error);
      setErrors({ general: '注册失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  }, [validateForm, formData, router, setUser]);

  return {
    formData,
    errors,
    setErrors,
    loading,
    acceptTerms,
    passwordStrength,
    setAcceptTerms,
    handleInputChange,
    handleInputBlur,
    handleSubmit,
  };
}
