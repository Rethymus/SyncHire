/**
 * 使用常量的表单示例
 * 展示如何使用 constants.ts 替代硬编码字符串
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FORMS, UI, ERRORS, SUCCESS, REGEX } from "@/lib/constants";
import { useToastMessage } from "@/components/ui/toast";
import { ErrorHandler } from "@/lib/error-handler";

export function ConstantOptimizedForm() {
  const toast = useToastMessage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // ✅ 使用常量 - 替代硬编码字符串
  const validateForm = () => {
    const errors: string[] = [];

    // 姓名验证
    if (!formData.name.trim()) {
      errors.push(FORMS.ERROR_NAME_REQUIRED);
    } else if (formData.name.length < 2) {
      errors.push(FORMS.ERROR_NAME_MIN_LENGTH);
    }

    // 邮箱验证 - 使用常量正则
    if (!formData.email.trim()) {
      errors.push(FORMS.ERROR_EMAIL_REQUIRED);
    } else if (!REGEX.EMAIL.test(formData.email)) {
      errors.push(FORMS.ERROR_EMAIL_INVALID);
    }

    // 密码验证 - 使用常量正则
    if (!formData.password) {
      errors.push(FORMS.ERROR_PASSWORD_REQUIRED);
    } else if (!REGEX.PASSWORD.test(formData.password)) {
      errors.push(FORMS.ERROR_PASSWORD_WEAK);
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      // ✅ 使用常量错误消息
      errors.forEach((error) => {
        toast.error(UI.ERROR_TITLE, error);
      });
      return;
    }

    try {
      // API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // ✅ 使用常量成功消息
      toast.success(UI.TOAST_SUCCESS, SUCCESS.REGISTER_SUCCESS);
    } catch (error) {
      // ✅ 使用统一错误处理
      const appError = ErrorHandler.handleApiError(error);
      toast.error(UI.TOAST_ERROR, ErrorHandler.getUserMessage(appError));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 姓名字段 */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          {FORMS.LABEL_NAME}
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={FORMS.PLACEHOLDER_NAME}
          className="mt-1 block w-full rounded-md border px-3 py-2"
        />
      </div>

      {/* 邮箱字段 */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          {FORMS.LABEL_EMAIL}
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder={FORMS.PLACEHOLDER_EMAIL}
          className="mt-1 block w-full rounded-md border px-3 py-2"
        />
      </div>

      {/* 密码字段 */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          {FORMS.LABEL_PASSWORD}
        </label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder={FORMS.PLACEHOLDER_PASSWORD}
          className="mt-1 block w-full rounded-md border px-3 py-2"
        />
      </div>

      {/* 提交按钮 */}
      <div className="flex gap-3">
        <Button type="submit" className="flex-1">
          {FORMS.SIGNUP_BUTTON}
        </Button>
        <Button type="button" variant="outline">
          {UI.BUTTON_CANCEL}
        </Button>
      </div>
    </form>
  );
}

/**
 * 迁移指南
 *
 * 迁移前:
 *   const title = "登录";  // ❌ 硬编码
 *   const message = "请输入邮箱";  // ❌ 硬编码
 *
 * 迁移后:
 *   import { FORMS, UI } from "@/lib/constants";
 *   const title = FORMS.LOGIN_TITLE;  // ✅ 使用常量
 *   const message = FORMS.ERROR_EMAIL_REQUIRED;  // ✅ 使用常量
 *
 * 优势:
 *   1. 集中管理，便于修改
 *   2. 支持国际化 (i18n)
 *   3. 减少拼写错误
 *   4. 提供类型安全
 *   5. 便于测试和维护
 */
