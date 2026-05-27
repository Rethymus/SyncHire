"use client";

// import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles, AlertCircle } from "lucide-react";
import { useSignupForm } from "@/hooks/useSignupForm";
import { NameField, EmailField, PasswordField, ConfirmPasswordField, SocialLoginButtons, TermsCheckbox } from "@/components/signup";

export default function SignupPage() {
  const {
    formData,
    errors,
    loading,
    acceptTerms,
    passwordStrength,
    setAcceptTerms,
    setErrors,
    handleInputChange,
    handleInputBlur,
    handleSubmit,
  } = useSignupForm();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      

      <div className="flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                创建账户
              </h2>
              <p className="mt-2 text-gray-700">
                开始您的 AI 求职之旅
              </p>
            </div>

            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3" role="alert" aria-live="assertive">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <NameField
                value={formData.name}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                error={errors.name}
              />

              <EmailField
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                error={errors.email}
              />

              <PasswordField
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                error={errors.password}
                passwordStrength={passwordStrength}
              />

              <ConfirmPasswordField
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                error={errors.confirmPassword}
              />

              <TermsCheckbox
                checked={acceptTerms}
                onChange={setAcceptTerms}
                error={errors.terms}
                onClearError={() => {
                  if (errors.terms) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.terms;
                      return newErrors;
                    });
                  }
                }}
              />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? "注册中..." : "创建账户"}
              </Button>
            </form>

            <SocialLoginButtons />

            <p className="mt-6 text-center text-sm text-gray-700">
              已有账户？{" "}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                立即登录
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              注册即表示您同意我们的服务条款和隐私政策
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
