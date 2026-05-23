/**
 * 统一错误处理系统
 */

import { logger, LogCategory } from "./logger";

export enum ErrorType {
  NETWORK = "NETWORK_ERROR",
  VALIDATION = "VALIDATION_ERROR",
  AUTH = "AUTH_ERROR",
  NOT_FOUND = "NOT_FOUND",
  SERVER = "SERVER_ERROR",
  UNKNOWN = "UNKNOWN_ERROR",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export class ErrorHandler {
  /**
   * 创建标准错误对象
   */
  static createError(
    type: ErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: Record<string, unknown>
  ): AppError {
    return {
      type,
      severity,
      message,
      details,
      timestamp: new Date(),
    };
  }

  /**
   * 处理API错误
   */
  static handleApiError(error: unknown): AppError {
    if (error instanceof Error) {
      // 网络错误
      if (error.message.includes("fetch")) {
        return this.createError(
          ErrorType.NETWORK,
          "网络连接失败，请检查您的网络设置",
          ErrorSeverity.HIGH
        );
      }

      // HTTP状态码错误
      const statusCode = this.extractStatusCode(error);
      return this.createError(
        this.getErrorTypeByStatus(statusCode),
        this.getErrorMessageByStatus(statusCode),
        this.getErrorSeverityByStatus(statusCode),
        { statusCode }
      );
    }

    return this.createError(
      ErrorType.UNKNOWN,
      "发生未知错误，请稍后重试",
      ErrorSeverity.MEDIUM
    );
  }

  /**
   * 处理表单验证错误
   */
  static handleValidationError(
    field: string,
    message: string
  ): AppError {
    return this.createError(
      ErrorType.VALIDATION,
      message,
      ErrorSeverity.LOW,
      { field }
    );
  }

  /**
   * 处理认证错误
   */
  static handleAuthError(message: string = "认证失败，请重新登录"): AppError {
    return this.createError(
      ErrorType.AUTH,
      message,
      ErrorSeverity.HIGH
    );
  }

  /**
   * 获取用户友好的错误消息
   */
  static getUserMessage(error: AppError): string {
    return error.message;
  }

  /**
   * 判断是否需要显示给用户
   */
  static shouldShowToUser(error: AppError): boolean {
    return error.severity !== ErrorSeverity.LOW;
  }

  /**
   * 判断是否需要上报到服务器
   */
  static shouldReport(error: AppError): boolean {
    return error.severity === ErrorSeverity.HIGH ||
           error.severity === ErrorSeverity.CRITICAL;
  }

  // 私有辅助方法
  private static extractStatusCode(error: Error): number {
    const match = error.message.match(/status (\d+)/);
    return match ? parseInt(match[1], 10) : 500;
  }

  private static getErrorTypeByStatus(status: number): ErrorType {
    if (status === 401 || status === 403) return ErrorType.AUTH;
    if (status === 404) return ErrorType.NOT_FOUND;
    if (status >= 400 && status < 500) return ErrorType.VALIDATION;
    if (status >= 500) return ErrorType.SERVER;
    return ErrorType.UNKNOWN;
  }

  private static getErrorMessageByStatus(status: number): string {
    const messages: Record<number, string> = {
      400: "请求参数错误，请检查输入",
      401: "未授权，请先登录",
      403: "无权限访问此资源",
      404: "请求的资源不存在",
      500: "服务器错误，请稍后重试",
      502: "服务暂时不可用",
      503: "服务维护中",
    };
    return messages[status] || "请求失败，请稍后重试";
  }

  private static getErrorSeverityByStatus(status: number): ErrorSeverity {
    if (status === 401 || status === 403) return ErrorSeverity.HIGH;
    if (status >= 500) return ErrorSeverity.CRITICAL;
    if (status >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }
}

/**
 * 错误日志记录器
 */
export class ErrorLogger {
  private static errors: AppError[] = [];

  static log(error: AppError): void {
    this.errors.push(error);

    // 使用 logger 输出错误
    // 根据错误类型选择合适的分类
    const category = error.type === ErrorType.NETWORK || error.type === ErrorType.SERVER
      ? LogCategory.API
      : error.type === ErrorType.AUTH
      ? LogCategory.AUTH
      : LogCategory.UI;

    logger.error(
      category,
      `[${error.type}] ${error.message}`,
      undefined, // Error object
      { severity: error.severity, details: error.details, timestamp: error.timestamp }
    );

    // 上报到服务器（生产环境）
    if (ErrorHandler.shouldReport(error)) {
      this.reportToServer(error);
    }
  }

  static getRecentErrors(count: number = 10): AppError[] {
    return this.errors.slice(-count);
  }

  static clear(): void {
    this.errors = [];
  }

  private static reportToServer(error: AppError): void {
    // TODO: 实现错误上报
    if (typeof window !== "undefined" && typeof window.fetch === "function") {
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(error),
      }).catch(() => {
        // 静默失败，避免无限循环
      });
    }
  }
}
