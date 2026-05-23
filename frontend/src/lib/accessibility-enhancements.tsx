/**
 * 无障碍增强组件
 * 修复WCAG 2.1合规性问题
 */

"use client";

import React, {
  forwardRef,
  useRef,
  useEffect,
  useState,
  useId,
  type ComponentPropsWithoutRef,
} from "react";
import { cn } from "@/lib/utils";

/**
 * 跳过导航链接
 * 允许键盘用户跳过重复内容
 */
export const SkipLink = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<"a"> & { targetId: string }
>(({ className, targetId, children = "跳到主内容", ...props }, ref) => {
  return (
    <a
      ref={ref}
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4",
        "focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white",
        "focus:rounded-lg focus:shadow-lg focus:min-h-[44px] focus:flex",
        "focus:items-center focus:font-medium",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
});
SkipLink.displayName = "SkipLink";

/**
 * 焦点陷阱容器
 * 用于模态框和对话框
 */
interface FocusTrapProps {
  children: React.ReactNode;
  enabled?: boolean;
  className?: string;
}

export const FocusTrap = ({ children, enabled = true, className }: FocusTrapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // 保存当前焦点元素
    previousActiveElement.current = document.activeElement as HTMLElement;

    // 获取所有可聚焦元素
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<
      HTMLElement
    >(
      'a[href], button:not([disabled]), textarea:not([disabled]),' +
      'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // 初始焦点
    if (firstElement) {
      firstElement.focus();
    }

    // 处理Tab键循环
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);

    return () => {
      document.removeEventListener("keydown", handleTab);

      // 恢复焦点
      previousActiveElement.current?.focus();
    };
  }, [enabled]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};


/**
 * 实时区域
 * 用于向屏幕阅读器宣布动态内容
 */
interface LiveRegionProps {
  message: string;
  politeness?: "polite" | "assertive";
  role?: "status" | "alert";
}

export const LiveRegion = ({
  message,
  politeness = "polite",
  role = "status",
}: LiveRegionProps) => {
  return (
    <div
      role={role}
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

/**
 * 增强的按钮组件
 * 自动处理无障碍属性
 */
interface AccessibleButtonProps extends ComponentPropsWithoutRef<"button"> {
  loading?: boolean;
  loadingText?: string;
  iconOnly?: boolean;
}

export const AccessibleButton = forwardRef<
  HTMLButtonElement,
  AccessibleButtonProps
>(
  (
    {
      children,
      loading,
      loadingText = "加载中...",
      disabled,
      iconOnly,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const isIconOnly = iconOnly && !children;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-label={isIconOnly ? ariaLabel : undefined}
        aria-busy={loading}
        {...props}
      >
        {loading ? loadingText : children}
      </button>
    );
  }
);
AccessibleButton.displayName = "AccessibleButton";

/**
 * 增强的输入框组件
 * 自动关联标签和错误
 */
interface AccessibleInputProps extends ComponentPropsWithoutRef<"input"> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const AccessibleInput = forwardRef<
  HTMLInputElement,
  AccessibleInputProps
>(
  (
    {
      id,
      label,
      error,
      helperText,
      required,
      "aria-invalid": ariaInvalid,
      "aria-describedby": ariaDescribedby,
      className,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const describedBy = [
      error ? errorId : null,
      helperText ? helperId : null,
      ariaDescribedby,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || ariaInvalid}
          aria-describedby={describedBy || undefined}
          aria-required={required}
          className={cn(
            "block w-full px-3 py-2 border rounded-lg min-h-[44px]",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300",
            className
          )}
          {...props}
        />

        {error && (
          <p id={errorId} className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="text-sm text-gray-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
AccessibleInput.displayName = "AccessibleInput";

/**
 * 增强的模态框组件
 * 自动处理焦点陷阱和背景滚动
 */
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const AccessibleModal = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}: AccessibleModalProps) => {
  const titleId = useId();
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 保存当前焦点
      previousActiveElement.current = document.activeElement as HTMLElement;

      // 禁用背景滚动
      document.body.style.overflow = "hidden";
    } else {
      // 恢复背景滚动
      document.body.style.overflow = "";

      // 恢复焦点
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ESC键关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 模态框内容 */}
      <FocusTrap enabled={isOpen} className={cn("relative z-10", className)}>
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <h2 id={titleId} className="text-xl font-semibold mb-4">
            {title}
          </h2>
          {children}
        </div>
      </FocusTrap>
    </div>
  );
};

/**
 * 减少动画Hook
 * 尊重用户系统偏好
 */
export function useReducedMotion() {
  // Initialize state from media query to avoid setState in effect
  const mediaQuery = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(mediaQuery?.matches ?? false);

  useEffect(() => {
    if (!mediaQuery) return;

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [mediaQuery]);

  return prefersReducedMotion;
}

/**
 * 条件动画组件
 * 自动根据用户偏好禁用动画
 */
interface ConditionalAnimationProps {
  children: React.ReactNode;
  animationClass: string;
  className?: string;
}

export const ConditionalAnimation = ({
  children,
  animationClass,
  className,
}: ConditionalAnimationProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={cn(prefersReducedMotion ? "" : animationClass, className)}>
      {children}
    </div>
  );
};

/**
 * 颜色对比度检查器
 */
export class ContrastChecker {
  /**
   * 计算相对亮度
   */
  private static getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((value) => {
      const sRGB = value / 255;
      return sRGB <= 0.03928
        ? sRGB / 12.92
        : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * 解析颜色为RGB
   */
  private static parseColor(color: string): { r: number; g: number; b: number } {
    // 处理hex颜色
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return { r, g, b };
    }

    // 处理rgb()颜色
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3]),
      };
    }

    // 默认黑色
    return { r: 0, g: 0, b: 0 };
  }

  /**
   * 计算对比度
   */
  static getContrastRatio(foreground: string, background: string): number {
    const fg = this.parseColor(foreground);
    const bg = this.parseColor(background);

    const fgLuminance = this.getLuminance(fg.r, fg.g, fg.b);
    const bgLuminance = this.getLuminance(bg.r, bg.g, bg.b);

    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * 检查WCAG AA合规性
   */
  static checkWCAG_AA(
    foreground: string,
    background: string,
    isLargeText: boolean = false
  ): { compliant: boolean; ratio: number; required: number } {
    const ratio = this.getContrastRatio(foreground, background);
    const required = isLargeText ? 3.0 : 4.5;
    return {
      compliant: ratio >= required,
      ratio: Math.round(ratio * 100) / 100,
      required,
    };
  }

  /**
   * 检查WCAG AAA合规性
   */
  static checkWCAG_AAA(
    foreground: string,
    background: string,
    isLargeText: boolean = false
  ): { compliant: boolean; ratio: number; required: number } {
    const ratio = this.getContrastRatio(foreground, background);
    const required = isLargeText ? 4.5 : 7.0;
    return {
      compliant: ratio >= required,
      ratio: Math.round(ratio * 100) / 100,
      required,
    };
  }
}

/**
 * 无障碍检查清单
 */
export const A11Y_CHECKLIST = {
  keyboard: {
    items: [
      "所有交互功能可通过键盘访问",
      "焦点顺序符合逻辑",
      "焦点指示器可见",
      "跳过导航链接已实现",
      "模态框可关闭并返回焦点",
    ],
    completed: 0,
  },

  semantic: {
    items: [
      "使用原生HTML元素",
      "标题层次正确",
      "列表使用正确的标记",
      "地标区域已标记",
      "表单控件已标记",
    ],
    completed: 0,
  },

  aria: {
    items: [
      "ARIA属性正确使用",
      "ARIA标签提供上下文",
      "状态变化已通知",
      "错误消息已关联",
      "实时区域已实现",
    ],
    completed: 0,
  },

  visual: {
    items: [
      "颜色对比度符合WCAG AA",
      "不依赖颜色传达信息",
      "文本可缩放200%",
      "响应式设计支持放大",
      "动画可禁用",
    ],
    completed: 0,
  },

  media: {
    items: [
      "图片有alt文本",
      "装饰图标已隐藏",
      "视频有字幕",
      "音频有转录",
      "媒体可暂停控制",
    ],
    completed: 0,
  },
};
