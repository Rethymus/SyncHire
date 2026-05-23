/**
 * 动态导入配置
 * 优化代码分割，减少初始加载包大小
 */

import dynamic from "next/dynamic";
import { ComponentType } from "react";
import type { JSX } from "react";

// ============================================
// 配置接口
// ============================================

interface DynamicOptions {
  loading?: () => JSX.Element | null;
  ssr?: boolean;
}

// ============================================
// 导出配置对象 (供页面组件使用)
// ============================================

/**
 * 动态导入路径配置
 * 使用方法: const ResumeEditor = dynamic(() => import("@/components/resume-editor"), RESUME_EDITOR_OPTIONS)
 */
export const DYNAMIC_IMPORTS = {
  // 重型组件配置
  RESUME_EDITOR: {
    ssr: false,
  } as DynamicOptions,

  RESUME_PREVIEW: {
    ssr: false,
  } as DynamicOptions,

  JD_INPUT: {
    ssr: true,
  } as DynamicOptions,

  RESUME_UPLOAD: {
    ssr: true,
  } as DynamicOptions,

  MILKDOWN_EDITOR: {
    ssr: false,
  } as DynamicOptions,

  CHARTS: {
    ssr: false,
  } as DynamicOptions,
};

// ============================================
// 组件大小统计
// ============================================

/**
 * 各组件行数统计
 * 用于识别需要优化的组件
 */
export const COMPONENT_SIZES = {
  ResumeEditor: 257,
  ResumePreview: 345,
  JDInput: 280,
  ResumeUpload: 290,
  Navigation: 198,
  FormFields: 277,
  Toast: 159,
} as const;

// ============================================
// 代码分割分析
// ============================================

/**
 * 分析代码分割覆盖率
 */
export function analyzeCodeSplitting() {
  const totalComponents = Object.keys(COMPONENT_SIZES).length;
  const largeComponents = Object.values(COMPONENT_SIZES).filter(size => size > 250).length;
  const veryLargeComponents = Object.values(COMPONENT_SIZES).filter(size => size > 350).length;

  return {
    totalComponents,
    largeComponents,
    veryLargeComponents,
    splitCoverage: Math.round((Object.keys(DYNAMIC_IMPORTS).length / totalComponents) * 100),
  };
}

// ============================================
// 预加载策略
// ============================================

/**
 * 基于路由的预加载配置
 * 在用户可能访问的页面上提前加载资源
 */
export const PRELOAD_STRATEGY = {
  // 首页预加载
  home: {
    prefetch: ["/signup", "/login", "/demo"],
    priority: "high",
  },

  // 注册页预加载
  signup: {
    prefetch: ["/dashboard"],
    priority: "medium",
  },

  // 仪表盘预加载
  dashboard: {
    prefetch: ["/editor", "/upload", "/jd-input"],
    priority: "high",
  },

  // 编辑器预加载
  editor: {
    prefetch: ["/preview"],
    priority: "high",
  },
} as const;

// ============================================
// 加载优先级配置
// ============================================

export type LoadPriority = "critical" | "high" | "medium" | "low";

export const LOAD_PRIORITY: Record<string, LoadPriority> = {
  // 首屏必需
  "Navigation": "critical",
  "Toast": "high",

  // 交互必需
  "ResumeUpload": "high",
  "JDInput": "high",

  // 按需加载
  "ResumeEditor": "medium",
  "ResumePreview": "medium",

  // 低优先级
  "Charts": "low",
};

// ============================================
// Bundle分析工具
// ============================================

/**
 * 估算bundle大小节省
 */
export function estimateBundleSavings() {
  const sizes = Object.entries(COMPONENT_SIZES);
  let savedBytes = 0;
  let totalBytes = 0;

  sizes.forEach(([name, lines]) => {
    // 估算: 每行代码约 50 字节 (minified + gzip 后)
    const estimatedSize = lines * 50;
    totalBytes += estimatedSize;

    // 如果配置为动态导入，则不算入初始bundle
    if (DYNAMIC_IMPORTS[name.toUpperCase() as keyof typeof DYNAMIC_IMPORTS]) {
      savedBytes += estimatedSize;
    }
  });

  return {
    totalBytes,
    savedBytes,
    savingsPercentage: totalBytes > 0 ? Math.round((savedBytes / totalBytes) * 100) : 0,
  };
}

// ============================================
// 路由级代码分割状态
// ============================================

/**
 * Next.js App Router 自动为每个路由进行代码分割
 *
 * 已自动分割的页面:
 * - /page.tsx -> 首页
 * - /signup/page.tsx -> 注册页
 * - /login/page.tsx -> 登录页
 * - /dashboard/page.tsx -> 仪表盘
 * - /editor/page.tsx -> 编辑器
 * - /upload/page.tsx -> 上传页
 * - /jd-input/page.tsx -> JD输入
 *
 * 无需额外配置，Next.js会自动优化
 */
export const ROUTE_SPLIT_STATUS = {
  autoSplit: true,
  framework: "Next.js App Router",
  note: "All /app routes are automatically code-split",
};

// ============================================
// 导出汇总
// ============================================

/**
 * 代码分割配置汇总
 */
export const CODE_SPLITTING_CONFIG = {
  dynamicImports: DYNAMIC_IMPORTS,
  preloadStrategy: PRELOAD_STRATEGY,
  loadPriority: LOAD_PRIORITY,
  componentSizes: COMPONENT_SIZES,
  routeSplitStatus: ROUTE_SPLIT_STATUS,
};

/**
 * 获取优化建议
 */
export function getOptimizationRecommendations() {
  const analysis = analyzeCodeSplitting();
  const savings = estimateBundleSavings();

  return {
    codeSplitting: {
      status: analysis.splitCoverage >= 80 ? "excellent" : "needs-improvement",
      coverage: `${analysis.splitCoverage}%`,
      recommendation: analysis.splitCoverage < 80
        ? "更多组件应配置为动态导入"
        : "代码分割配置良好",
    },

    bundleSize: {
      estimatedSavings: `${(savings.savedBytes / 1024).toFixed(0)} KB`,
      savingsPercentage: `${savings.savingsPercentage}%`,
      recommendation: savings.savingsPercentage < 30
        ? "考虑将更多大型组件设为动态导入"
        : "Bundle大小优化良好",
    },

    components: {
      largeComponents: analysis.veryLargeComponents,
      recommendation: analysis.veryLargeComponents > 0
        ? `${analysis.veryLargeComponents}个组件超过350行，建议拆分`
        : "组件大小合理",
    },
  };
}
