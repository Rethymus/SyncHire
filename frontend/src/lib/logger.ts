/**
 * 生产级日志系统
 * 替换所有console.*语句
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export enum LogCategory {
  API = "API",
  AUTH = "AUTH",
  UI = "UI",
  PERF = "PERF",
  SECURITY = "SECURITY",
  DATABASE = "DATABASE",
  USER_ACTION = "USER_ACTION",
  API_ERROR = "API_ERROR",
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: unknown;
  error?: Error;
  stack?: string;
}

interface LogConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  samplingRate: number; // 0-1, 1表示全部记录
}

class Logger {
  private config: LogConfig = {
    minLevel: process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
    enableConsole: true,
    enableRemote: process.env.NODE_ENV === "production",
    samplingRate: 1.0,
  };

  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 50;
  private flushTimer?: NodeJS.Timeout;

  configure(config: Partial<LogConfig>) {
    this.config = { ...this.config, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel && Math.random() < this.config.samplingRate;
  }

  private formatLevel(level: LogLevel): string {
    return LogLevel[level];
  }

  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: unknown,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    if (error) {
      entry.error = error;
      entry.stack = error.stack;
    }

    return entry;
  }

  private logToConsole(entry: LogEntry) {
    if (!this.config.enableConsole) return;

    const prefix = `[${entry.timestamp}] [${entry.category}] [${this.formatLevel(entry.level)}]`;

    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(prefix, entry.message, entry.data || "");
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || "");
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, entry.message, entry.data || "");
        if (entry.error) {
          console.error("Error:", entry.error);
          if (entry.stack) {
            console.error("Stack:", entry.stack);
          }
        }
        break;
    }
  }

  private async sendToRemote(entry: LogEntry) {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    try {
      // 使用navigator.sendBeacon确保页面卸载时也能发送
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        const blob = new Blob([JSON.stringify(entry)], {
          type: "application/json",
        });
        navigator.sendBeacon(this.config.remoteEndpoint, blob);
      } else {
        // 降级到fetch
        await fetch(this.config.remoteEndpoint!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
          keepalive: true,
        });
      }
    } catch (e) {
      // 静默失败，避免无限循环
      // console.error("Failed to send log:", e);
    }
  }

  private async flush() {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    await Promise.all(logsToSend.map((entry) => this.sendToRemote(entry)));
  }

  private async processLog(entry: LogEntry) {
    // 控制台输出
    this.logToConsole(entry);

    // 生产环境发送到远程
    if (process.env.NODE_ENV === "production" && entry.level >= LogLevel.ERROR) {
      this.logBuffer.push(entry);

      if (this.logBuffer.length >= this.MAX_BUFFER_SIZE) {
        await this.flush();
      } else if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flush();
          this.flushTimer = undefined;
        }, 5000);
      }
    } else if (entry.level >= LogLevel.WARN && process.env.NODE_ENV === "production") {
      // 警告级别也发送，但不同步等待
      this.sendToRemote(entry).catch(() => {});
    }
  }

  debug(category: LogCategory, message: string, data?: unknown) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createLogEntry(LogLevel.DEBUG, category, message, data);
    this.processLog(entry);
  }

  info(category: LogCategory, message: string, data?: unknown) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry(LogLevel.INFO, category, message, data);
    this.processLog(entry);
  }

  warn(category: LogCategory, message: string, data?: unknown) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createLogEntry(LogLevel.WARN, category, message, data);
    this.processLog(entry);
  }

  error(category: LogCategory, message: string, error?: Error, data?: unknown) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createLogEntry(LogLevel.ERROR, category, message, data, error);
    this.processLog(entry);
  }

  fatal(category: LogCategory, message: string, error?: Error, data?: unknown) {
    if (!this.shouldLog(LogLevel.FATAL)) return;
    const entry = this.createLogEntry(LogLevel.FATAL, category, message, data, error);
    this.processLog(entry);
  }

  // 特定场景的便捷方法
  apiError(message: string, error?: Error, data?: unknown) {
    this.error(LogCategory.API, message, error, data);
  }

  authError(message: string, error?: Error, data?: unknown) {
    this.error(LogCategory.AUTH, message, error, data);
  }

  uiError(message: string, error?: Error, data?: unknown) {
    this.error(LogCategory.UI, message, error, data);
  }

  perfWarn(message: string, data?: unknown) {
    this.warn(LogCategory.PERF, message, data);
  }

  securityWarn(message: string, data?: unknown) {
    this.warn(LogCategory.SECURITY, message, data);
  }
}

// 单例实例
export const logger = new Logger();

// 开发环境配置
if (process.env.NODE_ENV === "development") {
  logger.configure({
    minLevel: LogLevel.DEBUG,
    enableConsole: true,
    enableRemote: false,
  });
}

// 生产环境配置
if (process.env.NODE_ENV === "production") {
  logger.configure({
    minLevel: LogLevel.INFO,
    enableConsole: false,
    enableRemote: true,
    remoteEndpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT || "/api/logs",
    samplingRate: 0.1, // 采样10%
  });
}

/**
 * 使用示例：
 *
 * import { logger, LogCategory } from '@/lib/logger';
 *
 * // 替换 console.log
 * logger.info(LogCategory.API, "User logged in", { userId: "123" });
 *
 * // 替换 console.error
 * logger.error(LogCategory.API, "Login failed", error, { email });
 *
 * // 替换 console.warn
 * logger.warn(LogCategory.PERF, "Slow API response", { duration: 2000 });
 */

/**
 * 自动迁移指南：
 *
 * 旧代码:
 * console.error("Login error:", error);
 *
 * 新代码:
 * logger.authError("Login failed", error, { email });
 *
 * 旧代码:
 * console.warn("localStorage setItem failed:", e);
 *
 * 新代码:
 * logger.warn(LogCategory.UI, "localStorage operation failed", e);
 */
