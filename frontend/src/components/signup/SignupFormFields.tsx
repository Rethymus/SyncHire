/**
 * 注册表单字段组件
 * 提取可复用的表单字段组件
 */

import { User, Mail, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { PasswordStrengthIndicator } from '@/components/password-strength-indicator';

interface BaseFieldProps {
  id: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder: string;
  label: string;
  icon: React.ReactNode;
  ariaDescribedBy?: string;
  additionalContent?: React.ReactNode;
}

export function FormField({
  id,
  name,
  type,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  label,
  icon,
  ariaDescribedBy,
  additionalContent,
}: BaseFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
          {icon}
        </div>
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300"
          )}
          placeholder={placeholder}
        />
      </div>
      {error && (
        <p id={ariaDescribedBy} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {additionalContent}
    </div>
  );
}

export const NameField = memo(function NameField({
  value,
  onChange,
  onBlur,
  error,
}: Pick<BaseFieldProps, 'value' | 'onChange' | 'onBlur' | 'error'>) {
  return (
    <FormField
      id="name"
      name="name"
      type="text"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
      placeholder="您的姓名"
      label="姓名"
      icon={<User className="h-5 w-5 text-gray-500" />}
      ariaDescribedBy={error ? "name-error" : undefined}
    />
  );
});

export const EmailField = memo(function EmailField({
  value,
  onChange,
  onBlur,
  error,
}: Pick<BaseFieldProps, 'value' | 'onChange' | 'onBlur' | 'error'>) {
  return (
    <FormField
      id="email"
      name="email"
      type="email"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
      placeholder="your@email.com"
      label="邮箱"
      icon={<Mail className="h-5 w-5 text-gray-500" />}
      ariaDescribedBy={error ? "email-error" : undefined}
    />
  );
});

interface PasswordFieldProps extends Pick<BaseFieldProps, 'value' | 'onChange' | 'onBlur' | 'error'> {
  passwordStrength?: {
    level: number;
    label: string;
    emoji: string;
    color: string;
    requirements: { met: boolean; text: string }[];
  };
}

export const PasswordField = memo(function PasswordField({
  value,
  onChange,
  onBlur,
  error,
  passwordStrength,
}: PasswordFieldProps) {
  const hasPassword = value.length > 0;

  return (
    <div>
      <label
        htmlFor="password"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        密码
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
          <Lock className="h-5 w-5 text-gray-500" />
        </div>
        <input
          id="password"
          name="password"
          type="password"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? "password-error"
              : hasPassword
              ? "password-strength"
              : undefined
          }
          className={cn(
            "block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300"
          )}
          placeholder="至少12个字符，包含大小写字母、数字和特殊字符"
        />
      </div>
      {error && (
        <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Enhanced password strength indicator */}
      {hasPassword && passwordStrength && (
        <PasswordStrengthIndicator
          passwordStrength={passwordStrength}
          password={value}
        />
      )}
    </div>
  );
});

export const ConfirmPasswordField = memo(function ConfirmPasswordField({
  value,
  onChange,
  onBlur,
  error,
}: Pick<BaseFieldProps, 'value' | 'onChange' | 'onBlur' | 'error'>) {
  return (
    <FormField
      id="confirmPassword"
      name="confirmPassword"
      type="password"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
      placeholder="再次输入密码"
      label="确认密码"
      icon={<Lock className="h-5 w-5 text-gray-500" />}
      ariaDescribedBy={error ? "confirm-password-error" : undefined}
    />
  );
});
