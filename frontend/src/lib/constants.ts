/**
 * 应用常量配置
 * 集中管理硬编码字符串，便于国际化
 */

// ============================================
// 时间常量 (统一管理超时和延迟)
// ============================================

export const TIMING = {
  // API 调用模拟延迟
  API_CALL: {
    SHORT: 500,      // 快速响应
    MEDIUM: 1000,    // 标准响应
    LONG: 1500,      // 较慢响应
    EXTRA_LONG: 2000, // 很慢响应
    UPLOAD: 3000,    // 文件上传
  },

  // 自动保存
  AUTO_SAVE: {
    INTERVAL: 30000, // 自动保存间隔（30秒）
    DEBOUNCE: 1000,  // 防抖延迟
  },

  // UI 交互延迟
  UI: {
    DEBOUNCE: 300,           // 防抖延迟
    TOAST_AUTO_CLOSE: 5000,  // Toast自动关闭
    SECURITY_ALERT: 5000,    // 安全警告显示时长
    REDIRECT_DELAY: 1000,    // 页面跳转延迟
  },

  // 网络请求超时
  REQUEST_TIMEOUT: 30000,
} as const;

// ============================================
// 应用信息
// ============================================
export const APP = {
  NAME: "SyncHire 知遇",
  TAGLINE: "让每一次求职，都是一场被看见的知遇之恩",
  VERSION: "1.0.0",
} as const;

// ============================================
// 页面标题和描述
// ============================================
export const PAGES = {
  HOME: {
    title: `${APP.NAME} - AI 求职助手`,
    description: `${APP.TAGLINE}`,
  },
  SIGNUP: {
    title: `注册 - ${APP.NAME}`,
    description: "创建您的账户，开始智能求职之旅",
  },
  LOGIN: {
    title: `登录 - ${APP.NAME}`,
    description: "登录您的账户，继续求职之旅",
  },
  DASHBOARD: {
    title: `仪表盘 - ${APP.NAME}`,
    description: "管理您的简历和职位申请",
  },
  EDITOR: {
    title: `简历编辑 - ${APP.NAME}`,
    description: "使用Markdown编辑您的专业简历",
  },
  UPLOAD: {
    title: `上传简历 - ${APP.NAME}`,
    description: "上传现有简历，快速开始优化",
  },
  JD_INPUT: {
    title: "职位分析",
    description: "输入职位描述，分析您的匹配度",
  },
} as const;

// ============================================
// 功能特性
// ============================================
export const FEATURES = {
  RESUME_OPTIMIZATION: {
    name: "智能简历优化",
    description: "AI 驱动的简历分析，针对每个职位自动优化您的简历内容",
  },
  JOB_MATCHING: {
    name: "职位匹配分析",
    description: "深度解析职位描述，计算您的匹配度并提供改进建议",
  },
  ONE_CLICK_GENERATION: {
    name: "一键生成简历",
    description: "根据职位要求快速生成针对性简历，节省 90% 编辑时间",
  },
  VISUAL_EDITOR: {
    name: "可视化编辑",
    description: "所见即所得的简历编辑器，实时查看修改效果",
  },
  SKILL_MATCHING: {
    name: "技能匹配可视化",
    description: "可视化展示您的技能与职位需求的匹配情况",
  },
} as const;

// ============================================
// 优势亮点
// ============================================
export const BENEFITS = {
  TIME_SAVING: "节省简历准备时间 90%",
  UNLIMITED: "无限次简历生成",
  AI_POWERED: "AI 全流程支持",
  PROFESSIONAL: "专业级简历模板",
} as const;

// ============================================
// 表单相关
// ============================================
export const FORMS = {
  // 通用
  REQUIRED: "不能为空",
  INVALID_EMAIL: "请输入有效的邮箱地址",
  INVALID_PHONE: "请输入有效的手机号码",
  INVALID_PASSWORD: "密码至少8位，需包含大小写字母和数字",

  // 登录/注册
  LOGIN_TITLE: "登录",
  LOGIN_SUBTITLE: "欢迎回来",
  LOGIN_BUTTON: "登录",
  LOGIN_NO_ACCOUNT: "还没有账户？",
  LOGIN_REGISTER_LINK: "立即注册",
  LOGIN_FORGOT_PASSWORD: "忘记密码？",

  SIGNUP_TITLE: "创建账户",
  SIGNUP_SUBTITLE: "开始您的智能求职之旅",
  SIGNUP_BUTTON: "免费注册",
  SIGNUP_HAS_ACCOUNT: "已有账户？",
  SIGNUP_LOGIN_LINK: "立即登录",
  SIGNUP_AGREE: "我同意",
  SIGNUP_TERMS: "服务条款",
  SIGNUP_PRIVACY: "隐私政策",

  // 字段标签
  LABEL_NAME: "姓名",
  LABEL_EMAIL: "邮箱",
  LABEL_PASSWORD: "密码",
  LABEL_CONFIRM_PASSWORD: "确认密码",
  LABEL_PHONE: "手机号",

  // 占位符
  PLACEHOLDER_NAME: "请输入您的姓名",
  PLACEHOLDER_EMAIL: "your@email.com",
  PLACEHOLDER_PASSWORD: "请输入密码",
  PLACEHOLDER_CONFIRM_PASSWORD: "请再次输入密码",
  PLACEHOLDER_PHONE: "请输入手机号",

  // 验证消息
  ERROR_NAME_REQUIRED: "请输入姓名",
  ERROR_NAME_MIN_LENGTH: "姓名至少2个字符",
  ERROR_EMAIL_REQUIRED: "请输入邮箱",
  ERROR_EMAIL_INVALID: "请输入有效的邮箱地址",
  ERROR_PASSWORD_REQUIRED: "请输入密码",
  ERROR_PASSWORD_MIN_LENGTH: "密码至少8个字符",
  ERROR_PASSWORD_WEAK: "密码需包含大小写字母和数字",
  ERROR_PASSWORD_MISMATCH: "两次密码不一致",
  ERROR_PHONE_REQUIRED: "请输入手机号",
  ERROR_PHONE_INVALID: "请输入有效的手机号码",
  ERROR_TERMS_REQUIRED: "请同意服务条款",

  // 密码强度
  PASSWORD_STRENGTH_WEAK: "弱",
  PASSWORD_STRENGTH_MEDIUM: "中",
  PASSWORD_STRENGTH_STRONG: "强",
  PASSWORD_STRENGTH_LABEL: "密码强度",

  // 成功消息
  SUCCESS_REGISTER: "注册成功！正在跳转...",
  SUCCESS_LOGIN: "登录成功！正在跳转...",

  // 错误消息
  ERROR_AUTH_FAILED: "邮箱或密码错误",
  ERROR_REGISTER_FAILED: "注册失败，请稍后重试",
  ERROR_NETWORK: "网络错误，请检查您的连接",
  ERROR_SERVER: "服务器错误，请稍后重试",
} as const;

// ============================================
// 简历相关
// ============================================
export const RESUME = {
  // 标题
  TITLE_MY_RESUME: "我的简历",
  TITLE_CREATE_NEW: "创建新简历",
  TITLE_UPLOAD: "上传简历",
  TITLE_EDIT: "编辑简历",
  TITLE_PREVIEW: "预览简历",

  // 操作
  ACTION_CREATE: "创建简历",
  ACTION_EDIT: "编辑",
  ACTION_DELETE: "删除",
  ACTION_DOWNLOAD: "下载",
  ACTION_EXPORT: "导出PDF",
  ACTION_SAVE: "保存",
  ACTION_CANCEL: "取消",

  // 模板
  TEMPLATE_MINIMAL: "简约风格",
  TEMPLATE_PROFESSIONAL: "商务风格",
  TEMPLATE_CREATIVE: "创意风格",

  // 状态
  STATUS_SAVING: "保存中...",
  STATUS_SAVED: "已保存",
  STATUS_UNSAVED: "未保存",

  // 默认内容
  DEFAULT_NAME: "我的简历",
  DEFAULT_JOB_TITLE: "职位名称",
} as const;

// ============================================
// JD相关
// ============================================
export const JD = {
  // 标题
  TITLE: "职位描述",
  TITLE_INPUT: "输入职位描述",
  TITLE_ANALYSIS: "职位分析",

  // 操作
  ACTION_IMPORT: "从URL导入",
  ACTION_ANALYZE: "分析职位",
  ACTION_MATCH: "匹配简历",

  // 字段
  LABEL_TITLE: "职位名称",
  LABEL_COMPANY: "公司名称",
  LABEL_DESCRIPTION: "职位描述",
  LABEL_REQUIREMENTS: "任职要求",

  // 占位符
  PLACEHOLDER_TITLE: "例如：高级前端工程师",
  PLACEHOLDER_COMPANY: "例如：字节跳动",
  PLACEHOLDER_DESCRIPTION: "粘贴完整的职位描述，包括岗位职责、任职要求等...",
  PLACEHOLDER_REQUIREMENTS: "每行一个要求，例如：\n- 3年以上前端开发经验\n- 精通 React 和 TypeScript\n- 有大型项目经验",
  PLACEHOLDER_URL: "https://www.example.com/job/123456",

  // 提示
  TIP_IMPORT: "粘贴招聘网站的职位链接，自动提取职位信息",
  TIP_INPUT: "粘贴或输入职位描述信息",
  TIP_COMPLETE: "请尽可能提供完整的职位描述，以便更准确地分析匹配度",

  // 结果
  RESULT_MATCH_SCORE: "匹配度",
  RESULT_SKILLS_MATCHED: "匹配技能",
  RESULT_SKILLS_MISSING: "缺失技能",
  RESULT_RECOMMENDATIONS: "改进建议",
} as const;

// ============================================
// 仪表盘
// ============================================
export const DASHBOARD = {
  TITLE: "仪表盘",
  WELCOME: "欢迎回来！",

  SECTION_RESUMES: "我的简历",
  SECTION_JDS: "职位描述",
  SECTION_APPLICATIONS: "我的申请",

  ACTION_CREATE_RESUME: "创建新简历",
  ACTION_ADD_JD: "添加职位描述",
  ACTION_VIEW_ALL: "查看全部",

  EMPTY_STATE_NO_RESUMES: "还没有简历",
  EMPTY_STATE_NO_JDS: "还没有职位描述",
  EMPTY_STATE_NO_APPLICATIONS: "还没有申请记录",

  EMPTY_ACTION_CREATE: "立即创建",
  EMPTY_ACTION_ADD: "立即添加",
} as const;

// ============================================
// 通用UI文本
// ============================================
export const UI = {
  // 按钮
  BUTTON_SUBMIT: "提交",
  BUTTON_CANCEL: "取消",
  BUTTON_CONFIRM: "确认",
  BUTTON_BACK: "返回",
  BUTTON_NEXT: "下一步",
  BUTTON_PREVIOUS: "上一步",
  BUTTON_CLOSE: "关闭",
  BUTTON_RETRY: "重试",
 _BUTTON_REFRESH: "刷新",

  // 状态
  LOADING: "加载中...",
  SAVING: "保存中...",
  SENDING: "发送中...",
  PROCESSING: "处理中...",

  // 错误
  ERROR_TITLE: "出错了",
  ERROR_MESSAGE: "发生错误，请稍后重试",
  ERROR_RETRY: "重试",

  // 空状态
  EMPTY_TITLE: "暂无数据",
  EMPTY_DESCRIPTION: "这里还没有内容",
  EMPTY_ACTION: "立即添加",

  // 通知
  TOAST_SUCCESS: "操作成功",
  TOAST_ERROR: "操作失败",
  TOAST_INFO: "提示",
  TOAST_WARNING: "警告",

  // 导航
  NAV_HOME: "首页",
  NAV_DASHBOARD: "仪表盘",
  NAV_RESUMES: "简历",
  NAV_JDS: "职位分析",
  NAV_SETTINGS: "设置",
  NAV_LOGOUT: "退出登录",
  NAV_PROFILE: "个人资料",

  // 其他
  OR: "或",
  AND: "和",
  REQUIRED: "必填",
  OPTIONAL: "选填",
  EXAMPLE: "例如",
  NOTE: "注意",
  TIP: "提示",
} as const;

// ============================================
// 错误消息
// ============================================
export const ERRORS = {
  // 网络
  NETWORK_OFFLINE: "网络连接失败，请检查您的网络设置",
  NETWORK_TIMEOUT: "请求超时，请稍后重试",
  NETWORK_SERVER_UNAVAILABLE: "服务暂时不可用，请稍后重试",

  // 认证
  AUTH_UNAUTHORIZED: "未授权，请先登录",
  AUTH_FORBIDDEN: "无权限访问此资源",
  AUTH_TOKEN_EXPIRED: "登录已过期，请重新登录",
  AUTH_INVALID_CREDENTIALS: "邮箱或密码错误",

  // 验证
  VALIDATION_INVALID_EMAIL: "请输入有效的邮箱地址",
  VALIDATION_INVALID_PHONE: "请输入有效的手机号码",
  VALIDATION_PASSWORD_TOO_SHORT: "密码至少8个字符",
  VALIDATION_PASSWORD_WEAK: "密码需包含大小写字母和数字",
  VALIDATION_REQUIRED: "此字段不能为空",

  // 文件
  FILE_TOO_LARGE: "文件大小超过限制",
  FILE_INVALID_TYPE: "不支持的文件类型",
  FILE_UPLOAD_FAILED: "文件上传失败",

  // 通用
  UNKNOWN_ERROR: "发生未知错误，请稍后重试",
  OPERATION_FAILED: "操作失败，请稍后重试",
  OPERATION_CANCELLED: "操作已取消",
} as const;

// ============================================
// 成功消息
// ============================================
export const SUCCESS = {
  // 操作
  CREATED: "创建成功",
  UPDATED: "更新成功",
  DELETED: "删除成功",
  SAVED: "保存成功",
  SENT: "发送成功",

  // 业务
  REGISTER_SUCCESS: "注册成功！",
  LOGIN_SUCCESS: "登录成功！",
  LOGOUT_SUCCESS: "已退出登录",
  PASSWORD_RESET: "密码重置成功，请查收邮件",
  EMAIL_VERIFIED: "邮箱验证成功",

  // 文件
  FILE_UPLOADED: "文件上传成功",
  RESUME_EXPORTED: "简历已导出",
} as const;

// ============================================
// 配置常量
// ============================================
export const CONFIG = {
  // 分页
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,

  // 文件上传
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: [".pdf", ".doc", ".docx"],

  // 验证
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  DESCRIPTION_MAX_LENGTH: 10000,

  // UI
  TOAST_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 1000,

  // 重试
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 1000,
} as const;

// ============================================
// 正则表达式
// ============================================
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  SPECIAL_CHAR: /[!@#$%^&*]/,
  PHONE: /^1[3-9]\d{9}$/,
  URL: /^https?:\/\/.+/,
  CHINESE_NAME: /^[一-龥]{2,20}$/,
  ID_CARD: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/,
} as const;

// ============================================
// 导出所有
// ============================================
export const CONSTANTS = {
  APP,
  PAGES,
  FEATURES,
  BENEFITS,
  FORMS,
  RESUME,
  JD,
  DASHBOARD,
  UI,
  ERRORS,
  SUCCESS,
  CONFIG,
  REGEX,
} as const;
