/**
 * User-Friendly Error Messages (Chinese)
 * Comprehensive error message library for common scenarios
 */

import { ErrorType, type AppError } from './error-handler';

export interface ErrorMessages {
  title: string;
  message: string;
  suggestions: string[];
  documentation?: string;
}

export const errorMessages: Record<ErrorType, ErrorMessages> = {
  [ErrorType.NETWORK]: {
    title: '网络连接问题',
    message: '无法连接到服务器，请检查您的网络连接',
    suggestions: [
      '检查您的网络连接是否正常',
      '尝试刷新页面',
      '如果问题持续，请稍后再试或联系客服',
    ],
    documentation: '/help/network-issues',
  },
  [ErrorType.VALIDATION]: {
    title: '输入验证失败',
    message: '请检查您的输入是否符合要求',
    suggestions: [
      '确保所有必填字段都已填写',
      '检查输入格式是否正确',
      '参考表单下方的提示信息',
    ],
    documentation: '/help/validation-errors',
  },
  [ErrorType.AUTH]: {
    title: '身份验证失败',
    message: '您的登录会话可能已过期',
    suggestions: [
      '请重新登录以继续',
      '如果忘记密码，可以通过邮箱重置',
      '首次使用请先注册账号',
    ],
    documentation: '/help/authentication',
  },
  [ErrorType.NOT_FOUND]: {
    title: '资源未找到',
    message: '您访问的资源不存在或已被删除',
    suggestions: [
      '检查链接是否正确',
      '返回首页重新开始',
      '联系客服确认资源状态',
    ],
    documentation: '/help/not-found',
  },
  [ErrorType.SERVER]: {
    title: '服务器错误',
    message: '服务器遇到问题，请稍后重试',
    suggestions: [
      '等待几分钟后重试',
      '清除浏览器缓存和Cookie',
      '如果问题持续，请联系技术支持',
    ],
    documentation: '/help/server-errors',
  },
  [ErrorType.UNKNOWN]: {
    title: '发生意外错误',
    message: '应用程序遇到了意外问题',
    suggestions: [
      '尝试刷新页面',
      '返回上一页重试',
      '如果问题持续，请联系客服',
    ],
    documentation: '/help/unknown-errors',
  },
};

/**
 * Context-specific error messages
 */
export const contextErrorMessages = {
  // Authentication errors
  'auth.login.failed': {
    title: '登录失败',
    message: '用户名或密码错误，请检查后重试',
    suggestions: [
      '确认用户名输入正确',
      '检查密码是否正确（注意大小写）',
      '忘记密码？点击"忘记密码"重置',
    ],
  },
  'auth.register.failed': {
    title: '注册失败',
    message: '账号注册失败，请稍后重试',
    suggestions: [
      '检查邮箱格式是否正确',
      '密码强度需满足要求',
      '该邮箱可能已被注册，尝试直接登录',
    ],
  },
  'auth.session.expired': {
    title: '会话已过期',
    message: '您的登录会话已过期，请重新登录',
    suggestions: [
      '点击下方按钮重新登录',
      '登录后将自动返回您要访问的页面',
      '如频繁遇到此问题，请清除浏览器Cookie',
    ],
  },

  // Resume errors
  'resume.upload.failed': {
    title: '简历上传失败',
    message: '无法上传您的简历文件',
    suggestions: [
      '确认文件格式为PDF或Word',
      '文件大小不超过5MB',
      '检查文件是否损坏',
      '尝试重新选择文件上传',
    ],
  },
  'resume.parse.failed': {
    title: '简历解析失败',
    message: '无法解析简历内容，请检查文件格式',
    suggestions: [
      '确保文件为标准格式（PDF/Word）',
      '避免使用扫描版PDF',
      '检查文件是否加密或损坏',
      '尝试手动创建简历',
    ],
  },
  'resume.optimize.failed': {
    title: '简历优化失败',
    message: 'AI优化服务暂时不可用',
    suggestions: [
      '检查网络连接是否正常',
      '稍后重试',
      '如果问题持续，请联系客服',
    ],
  },

  // Job Description errors
  'jd.parse.failed': {
    title: '职位描述解析失败',
    message: '无法解析职位描述内容',
    suggestions: [
      '确保粘贴了完整的JD文本',
      '尝试直接上传JD文件',
      '检查文本格式是否正确',
    ],
  },
  'jd.analyze.failed': {
    title: '职位分析失败',
    message: '无法分析该职位描述',
    suggestions: [
      '确保JD内容完整清晰',
      '稍后重试',
      '联系客服获取帮助',
    ],
  },

  // Application errors
  'application.create.failed': {
    title: '创建申请失败',
    message: '无法创建求职申请',
    suggestions: [
      '检查是否已选择简历和职位',
      '确保简历和职位都存在',
      '稍后重试或联系客服',
    ],
  },
  'application.match.failed': {
    title: '匹配分析失败',
    message: '无法进行匹配分析',
    suggestions: [
      '确保简历和JD都已成功解析',
      '检查网络连接',
      '稍后重试',
    ],
  },

  // File upload errors
  'file.too.large': {
    title: '文件过大',
    message: '文件大小超过限制',
    suggestions: [
      '文件大小不能超过5MB',
      '压缩文件后重试',
      '移除不必要的图片或内容',
    ],
  },
  'file.invalid.format': {
    title: '文件格式不支持',
    message: '不支持的文件格式',
    suggestions: [
      '支持的格式：PDF, DOC, DOCX',
      '检查文件扩展名',
      '将文件转换为支持的格式',
    ],
  },
  'file.upload.interrupted': {
    title: '上传中断',
    message: '文件上传被中断',
    suggestions: [
      '检查网络连接是否稳定',
      '重新选择文件上传',
      '尝试使用更稳定的网络',
    ],
  },

  // Interview errors
  'interview.generate.failed': {
    title: '面试题生成失败',
    message: '无法生成面试问题',
    suggestions: [
      '确保JD已成功解析',
      '检查网络连接',
      '稍后重试',
    ],
  },

  // Payment errors (if applicable)
  'payment.failed': {
    title: '支付失败',
    message: '支付处理失败，请稍后重试',
    suggestions: [
      '检查支付信息是否正确',
      '确认账户余额充足',
      '尝试使用其他支付方式',
      '联系客服获取帮助',
    ],
  },
};

/**
 * Get error message by error code
 */
export function getErrorMessageByCode(code: string): ErrorMessages | undefined {
  return contextErrorMessages[code as keyof typeof contextErrorMessages];
}

/**
 * Get comprehensive error message
 */
export function getComprehensiveErrorMessage(
  error: AppError
): ErrorMessages {
  // First check for error code
  if (error.code) {
    const message = getErrorMessageByCode(error.code);
    if (message) {
      return message;
    }
  }

  // Fall back to error type
  return errorMessages[error.type];
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: AppError): {
  title: string;
  message: string;
  suggestions: string[];
  canRetry: boolean;
  canGoBack: boolean;
} {
  const messages = getComprehensiveErrorMessage(error);

  return {
    title: messages.title,
    message: error.message || messages.message,
    suggestions: messages.suggestions,
    canRetry: error.type === ErrorType.NETWORK || error.type === ErrorType.SERVER,
    canGoBack: error.type === ErrorType.VALIDATION || error.type === ErrorType.NOT_FOUND,
  };
}

/**
 * User-friendly action labels
 */
export const actionLabels = {
  retry: '重试',
  refresh: '刷新页面',
  goBack: '返回上一页',
  goHome: '返回首页',
  login: '重新登录',
  register: '注册账号',
  contactSupport: '联系客服',
  viewHelp: '查看帮助',
  clearForm: '清空表单',
  uploadAgain: '重新上传',
  tryAgain: '再试一次',
  cancel: '取消',
  confirm: '确认',
};

/**
 * Error severity descriptions
 */
export const severityDescriptions = {
  low: {
    label: '提示',
    color: 'blue',
    icon: 'ℹ️',
  },
  medium: {
    label: '警告',
    color: 'yellow',
    icon: '⚠️',
  },
  high: {
    label: '错误',
    color: 'orange',
    icon: '❌',
  },
  critical: {
    label: '严重错误',
    color: 'red',
    icon: '🚨',
  },
};
