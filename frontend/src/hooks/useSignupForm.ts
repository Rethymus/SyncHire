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
import { useToastMessage } from '@/components/ui/toast';

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
  const { success, error: toastError, info } = useToastMessage();
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<SignupFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // 密码强度计算 - 增强版
  const passwordStrength: PasswordStrength & {
    requirements: { met: boolean; text: string }[];
    color: string;
  } = useMemo(() => {
    const requirements = [
      { test: formData.password.length >= 12, text: '至少12个字符' },
      { test: /[a-z]/.test(formData.password), text: '包含小写字母' },
      { test: /[A-Z]/.test(formData.password), text: '包含大写字母' },
      { test: /\d/.test(formData.password), text: '包含数字' },
      { test: /[!@#$%^&*]/.test(formData.password), text: '包含特殊字符(!@#$%^&*)' },
    ];

    const metCount = requirements.filter(r => r.test).length;

    let level: number;
    let label: string;
    let emoji: string;
    let color: string;

    if (metCount <= 2) {
      level = metCount;
      label = '弱';
      emoji = '😟';
      color = 'bg-red-500';
    } else if (metCount <= 3) {
      level = metCount;
      label = '中';
      emoji = '😐';
      color = 'bg-yellow-500';
    } else if (metCount <= 4) {
      level = metCount;
      label = '强';
      emoji = '😊';
      color = 'bg-green-500';
    } else {
      level = metCount;
      label = '非常强';
      emoji = '🎉';
      color = 'bg-green-600';
    }

    return {
      level,
      label,
      emoji,
      color,
      requirements: requirements.map(r => ({ met: r.test, text: r.text })),
    };
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

  // 处理输入变化 - 增强版实时验证
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // 实时验证 - 提供即时反馈
    const newErrors: SignupFormErrors = {};

    // 姓名实时验证
    if (name === 'name' && value) {
      if (value.length > 0 && value.length < 2) {
        newErrors.name = '姓名至少2个字符';
      }
    }

    // 邮箱实时验证
    if (name === 'email' && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors.email = '请输入有效的邮箱地址';
      }
    }

    // 密码实时验证
    if (name === 'password' && value) {
      if (value.length < 12) {
        newErrors.password = '密码至少需要12个字符';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(value)) {
        newErrors.password = '密码需包含大小写字母、数字和特殊字符';
      }

      // 如果确认密码已填写，实时检查匹配
      if (formData.confirmPassword && value !== formData.confirmPassword) {
        newErrors.confirmPassword = '两次密码不一致';
      }
    }

    // 确认密码实时验证
    if (name === 'confirmPassword' && value) {
      if (formData.password !== value) {
        newErrors.confirmPassword = '两次密码不一致';
      }
    }

    // 更新错误状态
    setErrors(prev => {
      const updated = { ...prev };
      // 清除当前字段的错误（如果有新的错误会覆盖）
      if (newErrors[name as keyof SignupFormErrors] !== undefined) {
        updated[name as keyof SignupFormErrors] = newErrors[name as keyof SignupFormErrors];
      } else {
        delete updated[name as keyof SignupFormErrors];
      }
      return updated;
    });
  }, [formData.password, formData.confirmPassword]);

  // 处理失焦验证 - 增强版验证和建议
  const handleInputBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const newErrors: SignupFormErrors = {};

    if (name === 'email' && formData.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = '请输入有效的邮箱地址，格式: user@example.com';
      } else if (formData.email.length > 254) {
        newErrors.email = '邮箱地址过长';
      }
    } else if (name === 'password' && formData.password) {
      if (formData.password.length < 12) {
        newErrors.password = `密码太短，当前${formData.password.length}个字符，需要至少12个`;
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(formData.password)) {
        const missing = [];
        if (!/[a-z]/.test(formData.password)) missing.push('小写字母');
        if (!/[A-Z]/.test(formData.password)) missing.push('大写字母');
        if (!/\d/.test(formData.password)) missing.push('数字');
        if (!/[!@#$%^&*]/.test(formData.password)) missing.push('特殊字符(!@#$%^&*)');
        newErrors.password = `密码缺少: ${missing.join('、')}`;
      } else if (formData.password.length > 128) {
        newErrors.password = '密码过长，最多128个字符';
      }
    } else if (name === 'confirmPassword' && formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '两次密码不一致，请仔细检查';
      }
    } else if (name === 'name' && formData.name) {
      if (formData.name.length < 2) {
        newErrors.name = '姓名至少2个字符';
      } else if (formData.name.length > 50) {
        newErrors.name = '姓名过长，最多50个字符';
      } else if (!/^[一-龥a-zA-Z\s]+$/.test(formData.name)) {
        newErrors.name = '姓名只能包含中文、英文和空格';
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
        toastError('注册失败', response.error || '请稍后重试');
        return;
      }

      // Auto-login after successful registration
      const loginResponse = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      if (loginResponse.error || !loginResponse.data) {
        setErrors({ general: '注册成功，但自动登录失败，请手动登录' });
        success('注册成功', '账户已创建，请手动登录');
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

      // Show success message
      success('注册成功', `欢迎加入知遇，${userData.fullName}！`);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      logger.error(LogCategory.AUTH, 'Signup error', error as Error);
      setErrors({ general: '注册失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  }, [validateForm, formData, router, setUser, success, toastError]);

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
