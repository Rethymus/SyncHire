/**
 * 可复用的表单字段组件
 * 用于简化signup等大型表单组件
 */

"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  icon?: LucideIcon;
  autoComplete?: string;
  description?: string;
}

export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  required = false,
  icon: Icon,
  autoComplete,
  description,
}: FormFieldProps) {
  const inputId = `field-${name}`;
  const errorId = error ? `error-${name}` : undefined;
  const descriptionId = description ? `desc-${name}` : undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-900"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={cn(
            errorId,
            descriptionId
          )}
          className={cn(
            "block w-full rounded-lg border px-3 py-2.5 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            Icon && "pl-10",
            error
              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
              : "border-gray-300"
          )}
        />
      </div>

      {description && !error && (
        <p id={descriptionId} className="text-xs text-gray-500">
          {description}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

interface PasswordFieldProps {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  showStrength?: boolean;
  strength?: "weak" | "medium" | "strong";
  autoComplete?: string;
}

export function PasswordField({
  label = "密码",
  name,
  value,
  onChange,
  error,
  showStrength = true,
  strength,
  autoComplete = "new-password",
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  const strengthColors = {
    weak: "bg-red-500",
    medium: "bg-yellow-500",
    strong: "bg-green-500",
  };

  const strengthLabels = {
    weak: "弱",
    medium: "中",
    strong: "强",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={`field-${name}`}
          className="block text-sm font-medium text-gray-900"
        >
          {label}
        </label>
        {showStrength && strength && (
          <span
            className={cn(
              "text-xs font-medium",
              strength === "weak" && "text-red-600",
              strength === "medium" && "text-yellow-600",
              strength === "strong" && "text-green-600"
            )}
          >
            密码强度: {strengthLabels[strength]}
          </span>
        )}
      </div>

      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        <input
          id={`field-${name}`}
          type={showPassword ? "text" : "password"}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={cn(
            "block w-full rounded-lg border pl-10 pr-10 py-2.5 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            error
              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
              : "border-gray-300"
          )}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          aria-label={showPassword ? "隐藏密码" : "显示密码"}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>

      {showStrength && strength && (
        <div className="flex gap-1">
          <div className="h-1 flex-1 rounded bg-gray-200">
            <div
              className={cn("h-full rounded transition-all", strengthColors[strength])}
              style={{ width: strength === "weak" ? "33%" : strength === "medium" ? "66%" : "100%" }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

interface CheckboxFieldProps {
  name: string;
  label: string | ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  link?: {
    text: string;
    href: string;
  };
}

export function CheckboxField({
  name,
  label,
  checked,
  onChange,
  error,
  link,
}: CheckboxFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-start">
        <input
          id={`field-${name}`}
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          className={cn(
            "mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500",
            error && "border-red-300 focus:ring-red-500"
          )}
        />
        <label
          htmlFor={`field-${name}`}
          className="ml-2 text-sm text-gray-700 leading-tight"
        >
          {link ? (
            <>
              {label}{" "}
              <Link
                href={link.href}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.text}
              </Link>
            </>
          ) : (
            label
          )}
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

// Import the icons needed for this file
import Link from "next/link";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
