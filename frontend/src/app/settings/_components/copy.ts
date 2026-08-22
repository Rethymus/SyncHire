// Settings page shell copy (bilingual).
//
// This module is imported statically by page.tsx and shared.tsx, so it must
// stay SMALL: only what the shell renders before any tab panel loads
// (title, privacy pill, tab labels, MetricStrip/status strings, and the
// shared action labels shown in the header / toast banner).
//
// Panel-domain copy (ai / capability / discover + zh provider/capability
// catalogs) lives in copy-panels.ts and is imported only by the lazily
// loaded panels. Do not import copy-panels.ts from the page shell.

export const COPY = {
  "en-US": {
    pageTitle: "AI Runtime Settings",
    pageSubtitle:
      "Control providers, models, skills, MCP servers, and local-only security from one cc-switch-style console.",
    privacyPill: "Local browser storage only",
    tabs: {
      ai: "AI Provider",
      skills: "Skills",
      mcp: "MCP",
      discover: "Discover",
      image: "Image",
      notifications: "Notifications",
      history: "History",
    },
    status: {
      updated: "Updated",
      lastRefresh: "Last catalog refresh",
      never: "Never",
      loading: "Loading settings...",
      enabledSkills: "Enabled skills",
      enabledMcps: "Enabled MCPs",
      configuredProviders: "Configured providers",
      autoProvider: "Auto provider routing",
      manualProvider: "Manual provider routing",
    },
    actions: {
      refresh: "Refresh metadata",
      refreshed: "Catalog metadata refreshed locally.",
      saved: "AI runtime settings saved locally.",
      resetDone: "Recommended defaults restored.",
    },
  },
  "zh-CN": {
    pageTitle: "AI 运行时设置",
    pageSubtitle:
      "用类似 cc switch 的控制台统一管理 API、模型、技能、MCP 与本地安全策略。",
    privacyPill: "仅存储在本机浏览器",
    tabs: {
      ai: "AI 供应商",
      skills: "技能",
      mcp: "MCP",
      discover: "发现",
      image: "图像",
      notifications: "通知",
      history: "历史",
    },
    status: {
      updated: "更新时间",
      lastRefresh: "上次目录刷新",
      never: "从未",
      loading: "正在加载设置...",
      enabledSkills: "启用技能",
      enabledMcps: "启用 MCP",
      configuredProviders: "已配置供应商",
      autoProvider: "自动供应商路由",
      manualProvider: "手动供应商路由",
    },
    actions: {
      refresh: "刷新元数据",
      refreshed: "目录元数据已在本地刷新。",
      saved: "AI 运行时设置已保存在本地。",
      resetDone: "已恢复推荐默认值。",
    },
  },
} as const;

export type TabType = "ai" | "skills" | "mcp" | "discover" | "image" | "notifications" | "history";

export type SettingsCopy = (typeof COPY)[keyof typeof COPY];
