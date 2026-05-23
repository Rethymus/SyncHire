/**
 * 国际化 (i18n) 基础结构
 * 基于 constants.ts 构建的多语言支持
 */

"use client";

import { useState, useEffect } from "react";
import { SecureStorage } from "./security-enhancements";

export type Locale = "zh-CN" | "en-US";

export interface I18nConfig {
  locale: Locale;
  fallback: Locale;
  messages: Record<Locale, Record<string, string>>;
}

/**
 * 语言包
 */
export const messages: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    // 应用
    APP_NAME: "SyncHire 知遇",
    APP_TAGLINE: "让每一次求职，都是一场被看见的知遇之恩",

    // 通用
    SUBMIT: "提交",
    CANCEL: "取消",
    CONFIRM: "确认",
    SAVE: "保存",
    DELETE: "删除",
    EDIT: "编辑",
    BACK: "返回",
    NEXT: "下一步",

    // 表单
    EMAIL: "邮箱",
    PASSWORD: "密码",
    LOGIN: "登录",
    REGISTER: "注册",

    // 错误
    ERROR_REQUIRED: "不能为空",
    ERROR_INVALID_EMAIL: "请输入有效的邮箱地址",
  },

  "en-US": {
    // App
    APP_NAME: "SyncHire",
    APP_TAGLINE: "Where Talent Meets Opportunity",

    // Common
    SUBMIT: "Submit",
    CANCEL: "Cancel",
    CONFIRM: "Confirm",
    SAVE: "Save",
    DELETE: "Delete",
    EDIT: "Edit",
    BACK: "Back",
    NEXT: "Next",

    // Form
    EMAIL: "Email",
    PASSWORD: "Password",
    LOGIN: "Login",
    REGISTER: "Sign Up",

    // Errors
    ERROR_REQUIRED: "This field is required",
    ERROR_INVALID_EMAIL: "Please enter a valid email address",
  },
};

/**
 * 国际化Hook
 */
export function useI18n(locale: Locale = "zh-CN") {
  const t = (key: string): string => {
    return messages[locale][key] || messages["zh-CN"][key] || key;
  };

  const format = (key: string, params: Record<string, string | number>): string => {
    let message = t(key);
    Object.entries(params).forEach(([k, v]) => {
      message = message.replace(`{${k}}`, String(v));
    });
    return message;
  };

  return { t, format, locale };
}

/**
 * 语言切换Hook
 */
export function useLocale() {
  const [locale, setLocale] = useState<Locale>("zh-CN");

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    // 持久化到安全存储
    if (typeof window !== "undefined") {
      SecureStorage.setItem("locale", newLocale);
    }
  };

  return { locale, changeLocale };
}
