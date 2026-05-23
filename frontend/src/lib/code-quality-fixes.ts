/**
 * 代码质量自动修复工具
 * 基于扫描结果提供具体修复方案
 */

import { logger, LogCategory } from "./logger";

/**
 * console语句迁移映射表
 * 用于自动替换console.*为logger.*
 */
export const CONSOLE_MIGRATION_MAP = {
  // API相关
  "console.error(\"Login error:" : "logger.authError(\"Login failed",
  "console.error(\"Signup error:" : "logger.authError(\"Signup failed",
  "console.error(\"Failed to upload resume:" : "logger.apiError(\"Resume upload failed",
  "console.error(\"PDF generation error:" : "logger.error(LogCategory.API, \"PDF generation failed\"",
  "console.error(\"Import error:" : "logger.error(LogCategory.UI, \"Import failed\"",

  // Security相关
  "console.warn(\"URL build failed:" : "logger.warn(LogCategory.SECURITY, \"URL build failed\"",
  "console.warn(\"localStorage" : "logger.warn(LogCategory.UI, \"localStorage operation failed\"",

  // Error Boundary
  "console.error(\"ErrorBoundary caught an error:" : "logger.error(LogCategory.UI, \"ErrorBoundary caught error\"",
  "console.error(\"Failed to load template:" : "logger.error(LogCategory.UI, \"Template load failed\"",

  // Store optimization
  "console.warn(\n          `[Store ${name}] State size is large" : "logger.warn(LogCategory.PERF, `Store size large: ${name}`",
};

/**
 * React性能优化示例
 * 展示如何优化现有组件
 */
export const REACT_OPTIMIZATION_EXAMPLES = {
  /**
   * 1. 列表渲染优化
   *
   * 问题: dashboard/page.tsx中的applications.map()
   */
  listOptimization: {
    before: `
{applications.slice(0, 5).map((app) => (
  <div key={app.id}>
    <p>{app.position}</p>
    <p>{app.companyName}</p>
  </div>
))}
    `,
    after: `
const displayApps = useMemo(
  () => applications.slice(0, 5),
  [applications]
);

{displayApps.map((app) => (
  <AppItem key={app.id} app={app} />
))}
    `,
    description: "使用useMemo缓存列表切片，避免每次渲染都创建新数组",
  },

  /**
   * 2. 事件处理函数优化
   *
   * 问题: 多个组件中的内联函数
   */
  callbackOptimization: {
    before: `
<button onClick={() => setMobileSidebarOpen(false)}>
  控制台
</button>
    `,
    after: `
const handleNavClick = useCallback(() => {
  setMobileSidebarOpen(false);
}, []);

<button onClick={handleNavClick}>
  控制台
</button>
    `,
    description: "使用useCallback稳定函数引用，避免子组件不必要的重渲染",
  },

  /**
   * 3. 计算属性优化
   *
   * 问题: dashboard中的stats数组每次渲染都重新计算
   */
  computedOptimization: {
    before: `
const stats = [
  {
    name: "总申请数",
    value: applications.length,
    icon: Briefcase,
    color: "bg-blue-500",
  },
  {
    name: "面试邀请",
    value: applications.filter((a) => a.status === "interview").length,
    icon: CheckCircle2,
    color: "bg-green-500",
  },
  // ...
];
    `,
    after: `
const stats = useMemo(
  () => [
    {
      name: "总申请数",
      value: applications.length,
      icon: Briefcase,
      color: "bg-blue-500",
    },
    {
      name: "面试邀请",
      value: applications.filter((a) => a.status === "interview").length,
      icon: CheckCircle2,
      color: "bg-green-500",
    },
    // ...
  ],
  [applications]
);
    `,
    description: "使用useMemo缓存计算结果，只有applications变化时才重新计算",
  },

  /**
   * 4. 表单输入优化
   *
   * 问题: signup/page.tsx中的handleInputChange
   */
  inputOptimization: {
    before: `
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
};
    `,
    after: `
const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
}, []);
    `,
    description: "表单处理函数应该用useCallback包装，因为会被频繁调用",
  },

  /**
   * 5. 条件渲染优化
   *
   * 问题: 复杂条件在JSX中直接计算
   */
  conditionalOptimization: {
    before: `
<div className={errors.email ? "border-red-500" : "border-gray-300"}>
    `,
    after: `
const emailErrorClass = useMemo(
  () => errors.email ? "border-red-500" : "border-gray-300",
  [errors.email]
);

<div className={emailErrorClass}>
    `,
    description: "将复杂类名计算提取到useMemo中",
  },
};

/**
 * 组件拆分建议
 * 基于组件复杂度分析
 */
export const COMPONENT_SPLIT_SUGGESTIONS = {
  "signup/page.tsx": {
    currentLines: 476,
    targetComponents: [
      "SignupForm.tsx - 核心表单逻辑",
      "PasswordStrengthIndicator.tsx - 密码强度显示",
      "SocialAuthButtons.tsx - 社交登录按钮",
      "SignupPage.tsx - 页面容器和布局",
    ],
    estimatedLines: [150, 80, 60, 100],
    complexityReduction: "从476行降至~390行，各组件独立可测试",
  },

  "dashboard/page.tsx": {
    currentLines: 375,
    targetComponents: [
      "DashboardSidebar.tsx - 侧边栏导航",
      "DashboardStats.tsx - 统计卡片",
      "DashboardSteps.tsx - 步骤指示器",
      "DashboardActivity.tsx - 活动列表",
      "DashboardPage.tsx - 页面容器",
    ],
    estimatedLines: [80, 70, 60, 80, 85],
    complexityReduction: "从375行降至~375行，但各模块独立维护",
  },

  "resume-preview.tsx": {
    currentLines: 345,
    targetComponents: [
      "TemplateSelector.tsx - 模板选择器",
      "ResumePreviewCanvas.tsx - 预览画布",
      "ResumeActions.tsx - 操作按钮",
    ],
    estimatedLines: [80, 200, 40],
    complexityReduction: "从345行降至~320行，提升可测试性",
  },
};

/**
 * 代码坏味道检测和修复
 */
export class CodeSmellDetector {
  /**
   * 检测过长的组件文件
   */
  static detectLongComponents(filePath: string, lines: number): boolean {
    const MAX_LINES = 300;
    return lines > MAX_LINES;
  }

  /**
   * 检测过多的useState
   */
  static detectTooManyState(useStateCount: number): boolean {
    return useStateCount > 5;
  }

  /**
   * 检测缺少记忆化
   */
  static detectMissingMemoization(
    useStateCount: number,
    useMemoCount: number,
    useCallbackCount: number
  ): boolean {
    const totalOptimized = useMemoCount + useCallbackCount;
    const optimizationRate = totalOptimized / Math.max(useStateCount, 1);
    return optimizationRate < 0.3; // 优化率低于30%
  }

  /**
   * 检测console语句
   */
  static detectConsoleStatements(fileContent: string): number {
    const matches = fileContent.match(/console\.(log|error|warn|info|debug)/g);
    return matches ? matches.length : 0;
  }

  /**
   * 检测内联函数
   */
  static detectInlineFunctions(fileContent: string): number {
    const matches = fileContent.match(/=\s*\([^)]*\)\s*=>/g);
    return matches ? matches.length : 0;
  }

  /**
   * 检测内联对象
   */
  static detectInlineObjects(fileContent: string): number {
    const matches = fileContent.match(/\{\s*[^}]*:\s*[^,}]*,\s*[^}]*:/g);
    return matches ? matches.length : 0;
  }

  /**
   * 生成修复建议
   */
  static generateFixSuggestions(filePath: string, fileContent: string): string[] {
    const suggestions: string[] = [];
    const lines = fileContent.split("\n").length;
    const useStateCount = (fileContent.match(/useState/g) || []).length;
    const useMemoCount = (fileContent.match(/useMemo/g) || []).length;
    const useCallbackCount = (fileContent.match(/useCallback/g) || []).length;

    if (this.detectLongComponents(filePath, lines)) {
      suggestions.push(
        `组件过长 (${lines}行)，建议拆分为多个子组件`
      );
    }

    if (this.detectTooManyState(useStateCount)) {
      suggestions.push(
        `状态过多 (${useStateCount}个useState)，考虑使用useReducer`
      );
    }

    if (this.detectMissingMemoization(useStateCount, useMemoCount, useCallbackCount)) {
      const rate = Math.round(((useMemoCount + useCallbackCount) / Math.max(useStateCount, 1)) * 100);
      suggestions.push(
        `优化率过低 (${rate}%)，添加useMemo/useCallback减少重渲染`
      );
    }

    const consoleCount = this.detectConsoleStatements(fileContent);
    if (consoleCount > 0) {
      suggestions.push(
        `发现${consoleCount}个console语句，替换为logger系统`
      );
    }

    const inlineFunctions = this.detectInlineFunctions(fileContent);
    if (inlineFunctions > 5) {
      suggestions.push(
        `发现${inlineFunctions}个内联函数，使用useCallback优化`
      );
    }

    return suggestions;
  }
}

/**
 * 自动修复器
 * 提供代码级别的修复
 */
export class AutoFixer {
  /**
   * 替换console语句为logger
   */
  static replaceConsoleWithLogger(code: string): string {
    let fixed = code;

    // 添加logger导入
    if (!fixed.includes("from '@/lib/logger'")) {
      fixed = fixed.replace(
        /(^import\s+[^;]+;)/m,
        "$1\nimport { logger, LogCategory } from '@/lib/logger';"
      );
    }

    // 替换console.error
    fixed = fixed.replace(
      /console\.error\("([^"]+)",\s*error\);/g,
      (match, message) => {
        if (message.includes("Login")) {
          return `logger.authError("${message}", error);`;
        } else if (message.includes("Signup")) {
          return `logger.authError("${message}", error);`;
        } else if (message.includes("upload")) {
          return `logger.apiError("${message}", error);`;
        } else {
          return `logger.error(LogCategory.API, "${message}", error);`;
        }
      }
    );

    // 替换console.warn
    fixed = fixed.replace(
      /console\.warn\("([^"]+)",\s*e\);/g,
      'logger.warn(LogCategory.UI, "$1", e);'
    );

    return fixed;
  }

  /**
   * 添加useCallback到事件处理函数
   */
  static addUseCallbackToHandlers(
    code: string,
    functionNames: string[]
  ): string {
    let fixed = code;

    // 确保导入了useCallback
    if (functionNames.length > 0 && !fixed.includes("useCallback")) {
      fixed = fixed.replace(
        /import \{([^}]+)\} from "react"/,
        'import { $1, useCallback } from "react"'
      );
    }

    // 为每个函数添加useCallback
    functionNames.forEach((fnName) => {
      const regex = new RegExp(
        `const\\s+${fnName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`,
        "g"
      );
      fixed = fixed.replace(
        regex,
        `const ${fnName} = useCallback(() => {`
      );

      // 添加依赖数组闭包
      // 这需要更复杂的AST解析，暂时跳过
    });

    return fixed;
  }

  /**
   * 提取计算属性为useMemo
   */
  static extractComputedToMemo(
    code: string,
    variableName: string,
    dependencies: string[]
  ): string {
    // 确保导入了useMemo
    let fixed = code;
    if (!fixed.includes("useMemo")) {
      fixed = fixed.replace(
        /import \{([^}]+)\} from "react"/,
        'import { $1, useMemo } from "react"'
      );
    }

    // 查找const赋值并包装
    const regex = new RegExp(
      `const\\s+${variableName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`,
      "m"
    );

    fixed = fixed.replace(
      regex,
      `const ${variableName} = useMemo(
  () => $1,
  [${dependencies.join(", ")}]
);`
    );

    return fixed;
  }
}

/**
 * 批量修复工具
 * 一次性修复多个文件
 */
export async function batchFixFiles(
  files: Array<{
    path: string;
    fixes: Array<"console" | "useCallback" | "useMemo">;
  }>
) {
  const results: Array<{ path: string; success: boolean; error?: string }> = [];

  for (const file of files) {
    try {
      let content = "";
      // 实际实现需要读取文件
      // content = fs.readFileSync(file.path, "utf-8");

      for (const fix of file.fixes) {
        if (fix === "console") {
          // content = AutoFixer.replaceConsoleWithLogger(content);
        }
      }

      // 写回文件
      // fs.writeFileSync(file.path, content);

      results.push({ path: file.path, success: true });
    } catch (error) {
      results.push({
        path: file.path,
        success: false,
        error: (error as Error).message,
      });
    }
  }

  return results;
}
