"use client";

/**
 * Reset Password Form Component
 *
 * Client component that handles password reset form logic
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/lib/logger";
import { Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Validate token on page load
    const validateToken = async () => {
      if (!token) {
        setErrors({ general: "无效的重置链接" });
        setTokenValid(false);
        return;
      }

      try {
        const response = await fetch("/api/password-reset/validate-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok || !data.valid) {
          setErrors({ general: data.message || "无效或已过期的重置链接" });
          setTokenValid(false);
        } else {
          setTokenValid(true);
        }
      } catch (error) {
        logger.error(LogCategory.AUTH, "Token validation failed", error as Error);
        setErrors({ general: "验证token时出错" });
        setTokenValid(false);
      }
    };

    validateToken();
  }, [token]);

  const validatePassword = (pwd: string): boolean => {
    if (pwd.length < 12) {
      return false;
    }
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    return hasUpperCase && hasLowerCase && hasNumber;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!password || !confirmPassword) {
      setErrors({ general: "请填写所有字段" });
      return;
    }

    if (!validatePassword(password)) {
      setErrors({
        password: "密码必须至少12个字符，包含大小写字母和数字"
      });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "密码不匹配" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/password-reset/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "重置密码失败");
      }

      setSuccess(true);
      logger.info(LogCategory.AUTH, "Password reset successful");

      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      logger.error(LogCategory.AUTH, "Password reset failed", error as Error);
      setErrors({ general: (error as Error).message || "重置密码失败，请重试" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">密码重置成功</h1>
          <p className="text-gray-600 mb-6">您的密码已成功重置。即将跳转到登录页面...</p>
          <Button onClick={() => router.push("/login")} variant="outline">
            立即登录
          </Button>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <Lock className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">无效的重置链接</h1>
          <p className="text-gray-600 mb-6">{errors.general || "该链接已过期或无效"}</p>
          <div className="space-y-3">
            <Button onClick={() => router.push("/forgot-password")} className="w-full">
              请求新的重置链接
            </Button>
            <Button onClick={() => router.push("/login")} variant="outline" className="w-full">
              返回登录
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">验证重置链接...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <Lock className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">设置新密码</h1>
            <p className="text-gray-600">请输入您的新密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {errors.general}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                新密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="至少12个字符，包含大小写字母和数字"
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                确认新密码
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.confirmPassword ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="再次输入新密码"
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                />
              </div>
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              aria-busy={loading}
            >
              {loading ? "重置中..." : "重置密码"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                返回登录
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
