"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

export type LiteLocale = "en-US" | "zh-CN";

export const LITE_LOCALE_STORAGE_KEY = "synchire-lite-locale";

const DEFAULT_LOCALE: LiteLocale = "en-US";
const LOCALE_CHANGE_EVENT = "synchire-lite-locale-change";

export function normalizeLiteLocale(value: string | null | undefined): LiteLocale {
  if (value === "zh-CN" || value === "zh" || value?.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}

function readLiteLocale(): LiteLocale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const queryLocale = new URLSearchParams(window.location.search).get("locale");
  if (queryLocale) {
    return normalizeLiteLocale(queryLocale);
  }

  const storedLocale = window.localStorage.getItem(LITE_LOCALE_STORAGE_KEY);
  if (storedLocale) {
    return normalizeLiteLocale(storedLocale);
  }

  return normalizeLiteLocale(window.navigator.language);
}

export function writeLiteLocale(locale: LiteLocale) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LITE_LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = locale;
  window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: locale }));
}

function subscribeLiteLocale(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleLocaleChange = () => onStoreChange();
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === LITE_LOCALE_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

export function useLiteLocale(): [LiteLocale, (locale: LiteLocale) => void] {
  const locale = useSyncExternalStore(
    subscribeLiteLocale,
    readLiteLocale,
    () => DEFAULT_LOCALE
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: LiteLocale) => {
    writeLiteLocale(nextLocale);
  }, []);

  return [locale, setLocale];
}

export const LITE_COPY = {
  "en-US": {
    nav: {
      dashboard: "Dashboard",
      resumes: "Resumes",
      jobDescriptions: "Job Descriptions",
      applications: "Applications",
      search: "Search",
      dataManagement: "Data Management",
      settings: "Settings",
      english: "EN",
      chinese: "中文",
    },
    dashboard: {
      welcome: "Welcome to SyncHire Lite",
      subtitle: "Your local AI-powered job application assistant",
      newApplication: "New Application",
      stats: {
        resumes: "Resumes",
        jobDescriptions: "Job Descriptions",
        applications: "Applications",
        interviews: "Interviews",
      },
      quickActions: "Quick Actions",
      manageResumes: "Manage Resumes",
      trackApplications: "Track Applications",
      gettingStarted: "Getting Started",
      steps: [
        {
          title: "Upload your resume",
          description: "Add your resume to get started. Use AI to optimize it for better ATS compatibility.",
        },
        {
          title: "Add job descriptions",
          description: "Import job descriptions from URLs or paste content. AI will parse and structure the information.",
        },
        {
          title: "Create applications",
          description: "Pair resumes with job descriptions and track your application status with AI-powered match scores.",
        },
      ],
      recentApplications: "Recent Applications",
      viewAll: "View all",
      unknownPosition: "Unknown Position",
      unknownCompany: "Unknown Company",
      unknownResume: "Unknown Resume",
      emptyApplications: "No applications yet. Create your first application to get started.",
      dataManagement: "Data Management",
      manageData: "Manage Data",
      manageDataDescription: "Export, import, and back up your data",
      search: "Search",
      searchDescription: "Full-text and semantic search",
      privacyTitle: "SyncHire Lite - Local & Private",
      privacyDescription:
        "All your data is stored locally on your machine. No cloud storage, no authentication required. Your resume and job search data stays private.",
    },
    upload: {
      title: "Upload Your Resume",
      subtitle: "Supports PDF, Word, and text files. SyncHire helps you prepare each resume for the right role.",
      errors: {
        tooLarge: "File size exceeds the 10MB limit",
        tooMany: "You can upload up to 5 files at a time",
        invalidType: "Unsupported file format. Please upload PDF, Word, or text documents.",
        empty: "Please choose at least one resume file.",
        failed: "File upload failed. Please try again.",
      },
      successTitle: "Resume uploaded",
      successDescription: "SyncHire is analyzing your resume and opening the editor...",
      dropInvalid: "Unsupported file format",
      dropActive: "Drop files to upload",
      dropIdle: "Drag files here, or click to choose",
      supportedFormats: "PDF, DOC, DOCX, and TXT files. 10MB maximum per file.",
      processing: "Processing resume...",
      uploadedTitle: "Uploaded Resumes",
      goDashboard: "Go to Dashboard",
      uploadedAt: "Uploaded",
      edit: "Edit",
      features: [
        {
          title: "Smart Parsing",
          description: "Extract skills, experience, education, and role signals from each resume.",
        },
        {
          title: "Format Friendly",
          description: "Use PDF, Word, or plain text without manual conversion work.",
        },
        {
          title: "Fast Start",
          description: "Move straight from upload into editing and role-specific optimization.",
        },
      ],
    },
    jd: {
      title: "Enter Job Description",
      subtitle: "SyncHire turns each role into structured search and application intelligence.",
      importTitle: "Import from Job Site",
      importSubtitle: "Paste a job posting URL and preserve the source before manual review.",
      importPlaceholder: "https://www.example.com/job/123456",
      importButton: "Import",
      importingButton: "Importing...",
      importUnsupported:
        "Automatic import is not available for this link yet. The link is preserved; paste the job details below.",
      importFailed: "Import failed. The link is preserved; paste the job details manually below.",
      manualTitle: "Manual Entry",
      manualSubtitle: "Paste or type the full job description.",
      titleLabel: "Job Title *",
      titlePlaceholder: "Example: Frontend Engineer",
      companyLabel: "Company *",
      companyPlaceholder: "Example: ByteDance",
      descriptionLabel: "Job Description *",
      descriptionPlaceholder: "Paste responsibilities, qualifications, tech stack, and team context...",
      descriptionHelp: "Provide as much detail as possible for better match analysis.",
      requirementsLabel: "Requirements (optional)",
      requirementsPlaceholder:
        "One requirement per line, for example:\n- 3+ years of frontend experience\n- Strong React and TypeScript skills\n- Production testing experience",
      requirementsHelp: "Use one requirement per line. SyncHire can compare them against your resume.",
      submit: "Continue",
      loading: "Processing...",
      cancel: "Cancel",
      savedTitle: "Saved Job Descriptions",
      tipsTitle: "Tip: get stronger analysis",
      tips: [
        "Include the complete job description.",
        "Keep specific skills and technology stack details.",
        "Add company, team, and culture context.",
        "Include salary range or seniority signals when available.",
      ],
    },
    applications: {
      title: "My Applications",
      subtitle: "Manage job applications, match analysis, and interview preparation in one pipeline.",
      newApplication: "New Application",
      totalApplications: "Total Applications",
      analyzedMatches: "analyzed matches",
      averageMatch: "Average Match",
      max: "Max",
      min: "Min",
      excellentMatches: "Excellent Matches",
      good: "Good",
      fair: "Fair",
      median: "Median",
      strong: "Strong pipeline",
      improve: "Needs focus",
      suggestionsTitle: "Smart Workflow Suggestions",
      suggestionsSubtitle: "Recommended next steps based on your application status and match score.",
      suggestionReasons: {
        draft: "This application is still a draft. Tailor the resume before sending it out.",
        applied: "Application submitted. Track follow-up timing and keep interview notes ready.",
        interview: "Interview scheduled recently. Start preparing with company research and common questions.",
        offer: "Offer stage reached. Prepare negotiation notes and decision criteria.",
        rejected: "Application closed. Capture lessons and reuse the strongest materials.",
        optimized: "Resume optimized. Review the final version before applying.",
        pending: "Application is pending. Check the next action and keep materials ready.",
      },
      confidence: "Confidence",
      dismiss: "Dismiss",
      applySuggestion: "Apply",
      moreSuggestions: "More suggestions",
      recommendedTitle: "Recommended Priority Applications",
      recommendedSubtitle: "Based on match analysis, these roles best fit your background.",
      excellentMatch: "Excellent match",
      goodMatch: "Good match",
      percentilePrefix: "Top",
      emptyTitle: "Start your job-search journey",
      emptyDescription: "Create your first application so SyncHire can analyze fit and suggest next moves.",
      createApplication: "Create Application",
    },
    matchControls: {
      averageMatch: "Average Match",
      highestMatch: "Highest Match",
      excellentMatch: "Excellent",
      goodMatch: "Good",
      sortAndFilter: "Sort & Filter",
      sortBy: "Sort By",
      sortByPlaceholder: "Sort by",
      sortOptions: {
        matchScore: "Match Score",
        updatedAt: "Updated",
        createdAt: "Created",
        position: "Position",
      },
      sortOrder: "Sort Order",
      sortOrderPlaceholder: "Sort order",
      descending: "Descending",
      ascending: "Ascending",
      matchLevel: "Match Level",
      matchLevelPlaceholder: "Match level",
      levels: {
        all: "All",
        excellent: "Excellent (80%+)",
        good: "Good (60%+)",
        fair: "Fair (40%+)",
        poor: "Poor (<40%)",
      },
      minimumMatch: "Minimum match",
      reset: "Reset",
      activeFilters: "Active filters:",
      matchLevelFilter: "Match level",
      minimumMatchFilter: "Minimum match",
      clearFilters: "Clear filters",
      showing: "Showing",
      results: "results",
      total: "total applications",
    },
    batchApplications: {
      emptyTitle: "No applications yet",
      emptyDescription: "Create your first job application to start tracking the search.",
      createApplication: "Create Application",
      sortBy: "Sort by:",
      matchScore: "Match Score",
      updatedAt: "Updated",
      showingResults: "Showing {count} results",
      selectForBatch: "Select applications for batch actions",
      selectAll: "Select All",
      selectedCount: "{count} selected",
      match: "Match",
      levels: {
        excellent: "Excellent",
        good: "Good",
        fair: "Fair",
        poor: "Poor",
      },
      editResume: "Edit Resume",
      interviewPrep: "Interview Prep",
      viewDetails: "View Details",
      viewMatchAnalysis: "View Match Analysis",
      generateInterviewPrep: "Generate Interview Prep",
      batchActions: "Batch actions:",
      updateStatus: "Update Status",
      setStatus: "Set to {status}",
      addTags: "Add Tags",
      exportCsv: "Export CSV",
      delete: "Delete",
      clearSelection: "Clear Selection",
      csvHeaders: ["Company", "Position", "Status", "Match Score", "Created", "Updated", "Tags"],
      confirmBatchStatusTitle: "Confirm Batch Status Update",
      confirmBatchStatusDescription: "Update {count} applications to {status}?",
      cancel: "Cancel",
      processing: "Processing...",
      confirmUpdate: "Confirm Update",
      batchTagsTitle: "Add Tags in Bulk",
      batchTagsDescription: "Add tags to {count} applications. Separate multiple tags with commas.",
      tagsPlaceholder: "Example: High priority, Follow up, Contacted",
      tagsHelp: "New tags will be added to existing tags without overwriting them.",
      confirmAddTags: "Add Tags",
      confirmDeleteTitle: "Confirm Batch Delete",
      confirmDeleteDescription: "Delete {count} applications?",
      destructiveWarning: "This action cannot be undone. Related data will be permanently removed.",
      deleting: "Deleting...",
      confirmDelete: "Confirm Delete",
    },
    applicationStatus: {
      draft: "Draft",
      applied: "Applied",
      interview: "Interview",
      offer: "Offer",
      rejected: "Rejected",
      optimized: "Optimized",
      pending: "Pending",
      history: "History",
      updateTitle: "Update Application Status",
      updateDescription: "Change status from \"{from}\" to \"{to}\"",
      notes: "Notes (optional)",
      notesPlaceholder: "Add notes about this status change...",
      cancel: "Cancel",
      updating: "Updating...",
      confirm: "Confirm Update",
      historyTitle: "Status History",
      historyDescription: "View every status change for this application.",
      emptyHistory: "No status history yet",
      close: "Close",
    },
  },
  "zh-CN": {
    nav: {
      dashboard: "仪表盘",
      resumes: "简历",
      jobDescriptions: "职位描述",
      applications: "申请",
      search: "搜索",
      dataManagement: "数据管理",
      settings: "设置",
      english: "EN",
      chinese: "中文",
    },
    dashboard: {
      welcome: "欢迎使用 SyncHire Lite",
      subtitle: "本地优先的 AI 求职申请助手",
      newApplication: "新建申请",
      stats: {
        resumes: "简历",
        jobDescriptions: "职位描述",
        applications: "申请",
        interviews: "面试",
      },
      quickActions: "快捷操作",
      manageResumes: "管理简历",
      trackApplications: "跟踪申请",
      gettingStarted: "开始使用",
      steps: [
        {
          title: "上传你的简历",
          description: "先添加简历资产，再围绕岗位进行针对性优化。",
        },
        {
          title: "添加职位描述",
          description: "从链接保留来源，或直接粘贴岗位内容，让信息结构化沉淀。",
        },
        {
          title: "创建申请记录",
          description: "把简历和岗位配对，持续跟踪状态、匹配度和下一步动作。",
        },
      ],
      recentApplications: "最近申请",
      viewAll: "查看全部",
      unknownPosition: "未知职位",
      unknownCompany: "未知公司",
      unknownResume: "未知简历",
      emptyApplications: "还没有申请记录。创建第一条申请开始求职流程。",
      dataManagement: "数据管理",
      manageData: "管理数据",
      manageDataDescription: "导出、导入并备份你的求职数据",
      search: "搜索",
      searchDescription: "全文搜索和语义搜索",
      privacyTitle: "SyncHire Lite - 本地且私密",
      privacyDescription: "所有数据都存储在你的设备上。无需云端存储、无需登录认证，简历和求职数据始终由你掌控。",
    },
    upload: {
      title: "上传你的简历",
      subtitle: "支持 PDF、Word 和文本文件，让每份简历都为具体岗位服务。",
      errors: {
        tooLarge: "文件大小超过 10MB 限制",
        tooMany: "最多只能上传 5 个文件",
        invalidType: "不支持的文件格式。请上传 PDF、Word 或文本文档。",
        empty: "请选择要上传的简历文件。",
        failed: "文件上传失败，请重试。",
      },
      successTitle: "简历上传成功",
      successDescription: "SyncHire 正在分析您的简历，即将进入编辑器...",
      dropInvalid: "不支持的文件格式",
      dropActive: "放下文件以上传",
      dropIdle: "拖放文件到此处，或点击选择",
      supportedFormats: "支持 PDF、DOC、DOCX、TXT 格式，单个文件最大 10MB",
      processing: "正在处理简历...",
      uploadedTitle: "已上传的简历",
      goDashboard: "前往仪表盘",
      uploadedAt: "上传于",
      edit: "编辑",
      features: [
        {
          title: "智能解析",
          description: "自动提取简历中的技能、经历、教育背景和岗位信号。",
        },
        {
          title: "格式兼容",
          description: "支持 PDF、Word、文本等多种格式，无需手动转换。",
        },
        {
          title: "快速开始",
          description: "上传后立即进入编辑器，围绕目标岗位优化简历内容。",
        },
      ],
    },
    jd: {
      title: "输入职位描述",
      subtitle: "把每个岗位变成可分析、可比较、可行动的求职情报。",
      importTitle: "从招聘网站导入",
      importSubtitle: "粘贴招聘网站的职位链接，保留来源并进行人工校准。",
      importPlaceholder: "https://www.example.com/job/123456",
      importButton: "导入",
      importingButton: "导入中...",
      importUnsupported: "暂不支持自动导入该链接。链接已保留，请将职位信息粘贴到下方表单。",
      importFailed: "导入失败。链接已保留，请将职位信息手动粘贴到下方表单。",
      manualTitle: "手动输入",
      manualSubtitle: "粘贴或输入完整职位描述。",
      titleLabel: "职位名称 *",
      titlePlaceholder: "例如：高级前端工程师",
      companyLabel: "公司名称 *",
      companyPlaceholder: "例如：字节跳动",
      descriptionLabel: "职位描述 *",
      descriptionPlaceholder: "粘贴岗位职责、任职要求、技术栈和团队信息...",
      descriptionHelp: "请尽可能提供完整的职位描述，以便更准确地分析匹配度。",
      requirementsLabel: "任职要求（可选）",
      requirementsPlaceholder:
        "每行一个要求，例如：\n- 3 年以上前端开发经验\n- 精通 React 和 TypeScript\n- 有生产级测试经验",
      requirementsHelp: "每行一个要求，SyncHire 将帮你逐一对照简历。",
      submit: "继续下一步",
      loading: "处理中...",
      cancel: "取消",
      savedTitle: "已保存的职位描述",
      tipsTitle: "提示：如何获得最佳分析结果",
      tips: [
        "提供完整的职位描述，不要遗漏任何信息。",
        "保留具体的技能要求和技术栈。",
        "添加公司、团队和文化信息。",
        "如果有薪资范围或职级，也一并提供。",
      ],
    },
    applications: {
      title: "我的申请",
      subtitle: "在一个申请管线里管理投递、匹配分析和面试准备。",
      newApplication: "新建申请",
      totalApplications: "总申请数",
      analyzedMatches: "个已分析匹配度",
      averageMatch: "平均匹配度",
      max: "最高",
      min: "最低",
      excellentMatches: "优秀匹配",
      good: "良好",
      fair: "一般",
      median: "中位数",
      strong: "表现良好",
      improve: "有提升空间",
      suggestionsTitle: "智能工作流建议",
      suggestionsSubtitle: "基于申请状态和匹配度分析推荐下一步动作。",
      suggestionReasons: {
        draft: "这条申请仍是草稿。建议先围绕岗位优化简历，再正式投递。",
        applied: "申请已经投递。请跟踪跟进时间，并提前准备面试记录。",
        interview: "最近进入面试阶段。建议立即准备公司研究、常见问题和项目讲述。",
        offer: "已经进入 offer 阶段。建议整理谈薪要点和决策标准。",
        rejected: "申请已关闭。建议沉淀复盘结论，复用表现最好的材料。",
        optimized: "简历已优化。投递前请复核最终版本。",
        pending: "申请正在处理中。请确认下一步动作并保持材料就绪。",
      },
      confidence: "置信度",
      dismiss: "忽略",
      applySuggestion: "应用建议",
      moreSuggestions: "查看更多建议",
      recommendedTitle: "推荐优先申请",
      recommendedSubtitle: "基于匹配度分析，这些职位最适合你的背景。",
      excellentMatch: "优秀匹配",
      goodMatch: "良好匹配",
      percentilePrefix: "前",
      emptyTitle: "开始你的求职之旅",
      emptyDescription: "创建第一个职位申请，SyncHire 将帮你分析匹配度并提供优化建议。",
      createApplication: "创建申请",
    },
    matchControls: {
      averageMatch: "平均匹配度",
      highestMatch: "最高匹配度",
      excellentMatch: "优秀匹配",
      goodMatch: "良好匹配",
      sortAndFilter: "排序和筛选",
      sortBy: "排序方式",
      sortByPlaceholder: "排序方式",
      sortOptions: {
        matchScore: "匹配度",
        updatedAt: "更新时间",
        createdAt: "创建时间",
        position: "职位名称",
      },
      sortOrder: "排序顺序",
      sortOrderPlaceholder: "排序顺序",
      descending: "降序",
      ascending: "升序",
      matchLevel: "匹配等级",
      matchLevelPlaceholder: "匹配等级",
      levels: {
        all: "全部",
        excellent: "优秀 (80%+)",
        good: "良好 (60%+)",
        fair: "一般 (40%+)",
        poor: "较差 (<40%)",
      },
      minimumMatch: "最低匹配度",
      reset: "重置",
      activeFilters: "活跃筛选:",
      matchLevelFilter: "匹配等级",
      minimumMatchFilter: "最低匹配度",
      clearFilters: "清除筛选",
      showing: "显示",
      results: "个结果",
      total: "个申请",
    },
    batchApplications: {
      emptyTitle: "暂无申请",
      emptyDescription: "创建你的第一个职位申请来开始求职之旅。",
      createApplication: "创建申请",
      sortBy: "排序方式:",
      matchScore: "匹配度",
      updatedAt: "更新时间",
      showingResults: "显示 {count} 个结果",
      selectForBatch: "选择申请进行批量操作",
      selectAll: "全选",
      selectedCount: "{count} 个已选择",
      match: "匹配度",
      levels: {
        excellent: "优秀",
        good: "良好",
        fair: "一般",
        poor: "较差",
      },
      editResume: "编辑简历",
      interviewPrep: "面试准备",
      viewDetails: "查看详情",
      viewMatchAnalysis: "查看匹配分析",
      generateInterviewPrep: "生成面试准备",
      batchActions: "批量操作:",
      updateStatus: "更新状态",
      setStatus: "设为{status}",
      addTags: "添加标签",
      exportCsv: "导出 CSV",
      delete: "删除",
      clearSelection: "取消选择",
      csvHeaders: ["公司", "职位", "状态", "匹配度", "创建时间", "更新时间", "标签"],
      confirmBatchStatusTitle: "确认批量更新状态",
      confirmBatchStatusDescription: "确定要将 {count} 个申请的状态更新为 {status} 吗？",
      cancel: "取消",
      processing: "处理中...",
      confirmUpdate: "确认更新",
      batchTagsTitle: "批量添加标签",
      batchTagsDescription: "为 {count} 个申请添加标签。多个标签用逗号分隔。",
      tagsPlaceholder: "例如：高优先级, 待跟进, 已联系",
      tagsHelp: "标签将添加到现有标签中，不会覆盖已有标签。",
      confirmAddTags: "添加标签",
      confirmDeleteTitle: "确认批量删除",
      confirmDeleteDescription: "确定要删除 {count} 个申请吗？",
      destructiveWarning: "此操作无法撤销，所有相关数据将被永久删除。",
      deleting: "删除中...",
      confirmDelete: "确认删除",
    },
    applicationStatus: {
      draft: "草稿",
      applied: "已申请",
      interview: "面试中",
      offer: "已录用",
      rejected: "已拒绝",
      optimized: "已优化",
      pending: "处理中",
      history: "历史",
      updateTitle: "更新申请状态",
      updateDescription: "将申请状态从“{from}”更新为“{to}”",
      notes: "备注（可选）",
      notesPlaceholder: "添加关于此状态变更的备注...",
      cancel: "取消",
      updating: "更新中...",
      confirm: "确认更新",
      historyTitle: "状态变更历史",
      historyDescription: "查看此申请的所有状态变更记录。",
      emptyHistory: "暂无状态变更历史",
      close: "关闭",
    },
  },
} as const;

export function useLiteCopy() {
  const [locale, setLocale] = useLiteLocale();

  const copy = useMemo(() => LITE_COPY[locale], [locale]);

  return { locale, setLocale, t: copy };
}

export function formatLiteDate(value: Date | string | number, locale: LiteLocale) {
  return new Date(value).toLocaleDateString(locale);
}

export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
