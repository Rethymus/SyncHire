import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 检查用户是否启用了减弱动画模式
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 根据用户偏好返回过渡持续时间
 */
export function getTransitionDuration(): string {
  return prefersReducedMotion() ? "0ms" : "200ms";
}
