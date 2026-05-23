"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 清理所有定时器
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // 自动移除（带清理机制）
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        removeToast(id);
        timersRef.current.delete(id);
      }, toast.duration || 5000);
      timersRef.current.set(id, timer);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    // 清理对应的定时器
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <XCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
  };

  const styles = {
    success: "bg-green-50 border-green-200 text-green-900",
    error: "bg-red-50 border-red-200 text-red-900",
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 shadow-md min-w-[300px] max-w-md",
        styles[toast.type]
      )}
      role="alert"
      aria-labelledby={`toast-title-${toast.id}`}
    >
      <div className={cn("flex-shrink-0 mt-0.5")}>
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p
          id={`toast-title-${toast.id}`}
          className="font-medium text-sm"
        >
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-1 text-sm opacity-90">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="关闭通知"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Toast Hook 便捷方法
 */
export function useToastMessage() {
  const { addToast, clearToasts } = useToast();

  return {
    success: (title: string, message?: string, duration?: number) => {
      addToast({ type: "success", title, message, duration });
    },
    error: (title: string, message?: string, duration?: number) => {
      addToast({ type: "error", title, message, duration });
    },
    info: (title: string, message?: string, duration?: number) => {
      addToast({ type: "info", title, message, duration });
    },
    warning: (title: string, message?: string, duration?: number) => {
      addToast({ type: "warning", title, message, duration });
    },
    clear: clearToasts,
  };
}
