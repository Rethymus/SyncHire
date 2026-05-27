"use client";

/**
 * Forgot Password Page
 *
 * Allows users to request a password reset email
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
// import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/lib/logger";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = "请输入邮箱地址";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "请输入有效的邮箱地址";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.detail || "请求失败，请稍后重试" });
        return;
      }

      logger.info(LogCategory.AUTH, `Password reset requested for ${email}`);
      setSuccess(true);

      // Auto redirect after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 5000);
    } catch (error) {
      logger.error(LogCategory.AUTH, "Password reset request error", error as Error);
      setErrors({ general: "请求失败，请稍后重试" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        

        <div className="flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                邮件已发送
              </h2>

              <p className="text-gray-700 mb-6">
                如果您的账户存在，我们已向 <strong>{email}</strong> 发送了密码重置链接。
                请检查您的收件箱并点击链接重置密码。
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>提示：</strong> 重置链接将在1小时后过期。
                </p>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                没有收到邮件？请检查垃圾邮件文件夹，或稍后再试。
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/login")}
                className="w-full min-h-[44px]"
              >
                返回登录
              </Button>

              <p className="mt-4 text-sm text-gray-600">
                将在5秒后自动跳转到登录页面...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      

      <div className="flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回登录
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                忘记密码
              </h2>
              <p className="mt-2 text-gray-700">
                输入您的邮箱地址，我们将发送密码重置链接
              </p>
            </div>

            {errors.general && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱地址
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg min-h-[44px] ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="your@email.com"
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px]"
              >
                {loading ? "发送中..." : "发送重置链接"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-700">
                记起密码了？{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  立即登录
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}