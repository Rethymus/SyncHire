/**
 * 注册页面组件拆分 - 可复用子组件
 * 将476行的signup组件拆分为更小的、可维护的组件
 */

"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, User, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { FORMS, REGEX, CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ============================================
// 密码强度指示器组件
// ============================================

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const calculateStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strength = calculateStrength();
  const strengthPercent = (strength / 6) * 100;

  const getStrengthLabel = () => {
    if (strength < 2) return { label: "弱", color: "bg-red-500" };
    if (strength < 4) return { label: "中", color: "bg-yellow-500" };
    return { label: "强", color: "bg-green-500" };
  };

  const { label, color } = getStrengthLabel();

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-700">密码强度</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${color}`}
          style={{ width: `${strengthPercent}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// OAuth按钮组件
// ============================================

interface OAuthButtonProps {
  provider: "google" | "github";
  onClick: () => void;
  loading?: boolean;
}

export function OAuthButton({ provider, onClick, loading }: OAuthButtonProps) {
  const config = {
    google: {
      name: "Google",
      icon: "🔍",
      bgColor: "bg-white hover:bg-gray-50",
      textColor: "text-gray-900",
      borderColor: "border-gray-300",
    },
    github: {
      name: "GitHub",
      icon: "🐙",
      bgColor: "bg-gray-900 hover:bg-gray-800",
      textColor: "text-white",
      borderColor: "border-gray-700",
    },
  };

  const { name, icon, bgColor, textColor, borderColor } = config[provider];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 border rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${bgColor} ${textColor} ${borderColor}`}
    >
      <span className="text-lg" aria-hidden="true">
        {icon}
      </span>
      <span>使用 {name} {provider === "google" ? "账号" : "登录"}</span>
    </button>
  );
}

// ============================================
// 分隔线组件
// ============================================

interface DividerProps {
  text: string;
}

export function Divider({ text }: DividerProps) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-white text-gray-600">{text}</span>
      </div>
    </div>
  );
}

// ============================================
// 表单状态提示组件
// ============================================

interface FormStatusProps {
  type: "error" | "success";
  message: string;
}

export function FormStatus({ type, message }: FormStatusProps) {
  const config = {
    error: {
      icon: AlertCircle,
      bgColor: "bg-red-50",
      textColor: "text-red-800",
      iconColor: "text-red-500",
    },
    success: {
      icon: CheckCircle2,
      bgColor: "bg-green-50",
      textColor: "text-green-800",
      iconColor: "text-green-500",
    },
  };

  const { icon: Icon, bgColor, textColor, iconColor } = config[type];

  return (
    <div className={`${bgColor} ${textColor} px-4 py-3 rounded-lg flex items-start gap-3`}>
      <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ============================================
// 输入字段包装器
// ============================================

interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
  autoComplete?: string;
}

export function InputField({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  icon,
  autoComplete,
}: InputFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            {icon}
          </div>
        )}
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={icon ? "pl-10" : ""}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600 flex items-center gap-1" role="alert">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================
// 服务条款复选框
// ============================================

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export function TermsCheckbox({ checked, onChange, error }: TermsCheckboxProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-start">
        <input
          id="terms"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          className={cn(
            "mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500",
            error && "border-red-300 focus:ring-red-500"
          )}
        />
        <label htmlFor="terms" className="ml-2 text-sm text-gray-700 leading-tight">
          我同意
          <a href="/terms" className="text-blue-600 hover:underline mx-1">
            服务条款
          </a>
          和
          <a href="/privacy" className="text-blue-600 hover:underline mx-1">
            隐私政策
          </a>
        </label>
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}
