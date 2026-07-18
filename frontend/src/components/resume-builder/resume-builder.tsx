"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, type Resume } from "@/lib/store";
import { useBuilderStore } from "@/lib/resume-builder/builder-store";
import { applyProofreadFixes } from "@/lib/resume-builder/proofread";
import type { OnePageFitResult } from "@/lib/resume-builder/use-one-page-fit";
import { ResumePreview } from "./resume-preview";
import { SourceEditor, type SourceEditorHandle } from "./source-editor";
import { WysiwygEditor, type WysiwygEditorHandle } from "./wysiwyg-editor";
import { ThemePicker } from "./theme-picker";
import { PluginPanel } from "./plugin-panel";
import { IconPicker } from "./icon-picker";
import { DetectionPanel } from "./detection-panel";
import { ExportMenu } from "./export-menu";
import { PortraitStudio } from "./portrait-studio";
import { GithubProjectStudio } from "./github-project-studio";
import {
  buildProjectBlock,
  insertProjectBlock,
  mergeSkillsIntoContent,
} from "@/lib/github-distill/resume-insert";
import type { DistilledProject } from "@/lib/github-distill/types";
import {
  ArrowLeft,
  Code2,
  Eye,
  Palette,
  Puzzle,
  Smile,
  ScanText,
  History,
  Save,
  Check,
  Loader2,
  AlertTriangle,
  Maximize2,
  Camera,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isGithubPagesDeployment } from "@/lib/deployment-mode";

export const DEFAULT_RESUME_MARKDOWN = `# 陈宇
前端工程师 · 上海

::: left
icon:info 男 / 24 岁
icon:school 上海交通大学 / 计算机科学与技术 / 本科
:::

::: right
icon:email chen.yu@example.com
icon:phone 138-0000-0000
icon:blog github.com/chenyu
:::

## 个人优势
- 5 年前端开发经验，擅长 React、TypeScript 与工程化体系，熟悉 Next.js 与性能优化
- 主导过中大型 SaaS 项目的从 0 到 1 搭建，关注**可维护性**与**交付效率**
- 具备跨团队协作与需求拆解能力，能把业务目标转化为清晰的技术方案

## 工作经历
### 字节跳动 · 高级前端工程师
2022.07 - 至今

- 负责创作者后台重构，将首屏加载时间从 3.2s 优化到 1.1s
- 搭建组件库与 CI/CD 流水线，团队交付效率提升约 40%
- 带 3 名初级工程师，推动代码评审与单元测试文化

## 项目经历
### SyncHire 求职助手 · 全栈个人项目
2025.09 - 2026.01

- 基于 Next.js 16 与 FastAPI 构建，支持简历管理、岗位匹配与申请看板
- 实现 Markdown 简历编辑器，支持多主题、智能一页与多格式导出
- 使用 PostgreSQL + PGVector 做语义匹配，召回率较关键词提升 28%

## 技能清单
- **前端**：React、Next.js、TypeScript、Tailwind CSS、Zustand
- **后端**：Node.js、Python、PostgreSQL、Redis
- **工程**：Docker、GitHub Actions、Vitest、Playwright

## 教育背景
### 上海交通大学 · 计算机科学与技术 · 本科
2018.09 - 2022.06
`;

interface ResumeBuilderProps {
  /** Initial resume to edit; if absent a new resume is created on first save. */
  initialResume?: Resume | null;
}

type SaveState = "idle" | "saving" | "saved" | "unsaved";

export function ResumeBuilder({ initialResume }: ResumeBuilderProps) {
  const router = useRouter();
  const { addResume, updateResume, currentResume } = useAppStore();
  const themeId = useBuilderStore((s) => s.themeId);
  const editMode = useBuilderStore((s) => s.editMode);
  const setEditMode = useBuilderStore((s) => s.setEditMode);
  const plugins = useBuilderStore((s) => s.plugins);
  const pushSnapshot = useBuilderStore((s) => s.pushSnapshot);
  const snapshots = useBuilderStore((s) => s.snapshots);
  const portraitUrl = useBuilderStore((s) => s.portraitUrl);
  const pagesMode = isGithubPagesDeployment();

  const [content, setContent] = useState(initialResume?.content ?? DEFAULT_RESUME_MARKDOWN);
  const [name, setName] = useState(initialResume?.name ?? "我的简历");
  const [resumeId, setResumeId] = useState<string | undefined>(initialResume?.id);
  const [flash, setFlash] = useState<null | "saving" | "saved">(null);
  const [fit, setFit] = useState<OnePageFitResult>({
    scale: 1,
    state: "idle",
    estimatedPages: 1,
  });

  const [showTheme, setShowTheme] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);
  const [showIcons, setShowIcons] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPortrait, setShowPortrait] = useState(false);
  const [showGithub, setShowGithub] = useState(false);

  const pageRef = useRef<HTMLElement>(null);
  const sourceRef = useRef<SourceEditorHandle>(null);
  const wysiwygRef = useRef<WysiwygEditorHandle>(null);

  // "Unsaved" is derived from drift between local edits and the stored resume,
  // never tracked through an effect (avoids cascading renders). `flash` carries
  // the transient "saving" / "saved" affordance on top.
  const dirty = useMemo(() => {
    if (flash) {
      return false;
    }
    if (!resumeId) {
      return true;
    }
    const stored = currentResume;
    if (!stored) {
      return true;
    }
    return stored.content !== content || stored.name !== name;
  }, [flash, resumeId, currentResume, content, name]);

  const saveState: SaveState = flash ?? (dirty ? "unsaved" : "idle");

  const columnsOn = plugins.columns;
  const iconsOn = plugins.icons;
  const onePageOn = plugins.onePage;
  const previewOn = plugins.preview;
  const detectionOn = plugins.detection;

  const handleContentChange = useCallback((next: string) => {
    setContent(next);
  }, []);

  const handleSave = useCallback(() => {
    setFlash("saving");
    pushSnapshot(name, content);
    if (resumeId) {
      updateResume(resumeId, { content, name });
    } else {
      const newResume: Resume = {
        id: `rb-${Date.now()}`,
        name,
        content,
        uploadedAt: new Date(),
      };
      addResume(newResume);
      setResumeId(newResume.id);
    }
    // Brief "saving" affordance then "saved".
    setTimeout(() => {
      setFlash("saved");
      setTimeout(() => setFlash(null), 1800);
    }, 250);
  }, [resumeId, name, content, updateResume, addResume, pushSnapshot]);

  // Ctrl/Cmd+S to save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave]);

  const handleInsertIcon = useCallback(
    (token: string) => {
      if (editMode === "source") {
        sourceRef.current?.insertAtCursor(token);
      } else {
        wysiwygRef.current?.insertIcon(token);
      }
    },
    [editMode],
  );

  const handleJumpToIssue = useCallback(
    (line: number, column: number) => {
      if (editMode === "source") {
        sourceRef.current?.focusLine(line, column);
      } else {
        wysiwygRef.current?.focus();
      }
    },
    [editMode],
  );

  const handleApplyFixes = useCallback(
    (fixed: string) => {
      setContent(fixed);
    },
    [],
  );

  const onFitChange = useCallback((result: OnePageFitResult) => {
    setFit((prev) =>
      prev.scale === result.scale &&
      prev.state === result.state &&
      prev.estimatedPages === result.estimatedPages
        ? prev
        : result,
    );
  }, []);

  // Apply a distilled GitHub project: insert a project block into 项目经历 and
  // merge its tech stack into the skills section. Snapshots the pre-edit content
  // so the change is reachable from the history drawer.
  const handleApplyGithubProject = useCallback(
    (project: DistilledProject) => {
      const block = buildProjectBlock(project);
      setContent((prev) => mergeSkillsIntoContent(insertProjectBlock(prev, block), project.skills));
      pushSnapshot(`${project.name}（GitHub 蒸馏）`, content);
    },
    [content, pushSnapshot],
  );

  const toolbarButton = useMemo(
    () => ({
      base: "inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm border transition min-h-[36px]",
      idle: "border-gray-200 text-gray-700 bg-white hover:bg-gray-50",
      active: "border-blue-300 bg-blue-50 text-blue-700",
    }),
    [],
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Toolbar */}
      <header className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 shadow-sm">
        <button
          onClick={() => router.back()}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
          aria-label="返回"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 min-w-0 flex-1 max-w-[220px] px-2 rounded-md border border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-sm font-medium text-gray-800"
          aria-label="简历名称"
          placeholder="请命名"
        />

        <div className="h-5 w-px bg-gray-200 mx-1" />

        {/* Edit mode toggle */}
        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
          <button
            onClick={() => setEditMode("source")}
            className={cn(
              "h-9 px-2.5 inline-flex items-center gap-1 text-xs",
              editMode === "source" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
            )}
          >
            <Code2 className="h-3.5 w-3.5" /> 源码
          </button>
          <button
            onClick={() => setEditMode("wysiwyg")}
            className={cn(
              "h-9 px-2.5 inline-flex items-center gap-1 text-xs",
              editMode === "wysiwyg" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
            )}
          >
            <Eye className="h-3.5 w-3.5" /> 所见即所得
          </button>
        </div>

        <button
          onClick={() => setShowTheme(true)}
          className={cn(toolbarButton.base, toolbarButton.idle)}
        >
          <Palette className="h-4 w-4" /> 主题
        </button>
        <button
          onClick={() => setShowPlugins(true)}
          className={cn(toolbarButton.base, toolbarButton.idle)}
        >
          <Puzzle className="h-4 w-4" /> 插件
        </button>
        <button
          onClick={() => setShowIcons(true)}
          className={cn(toolbarButton.base, toolbarButton.idle)}
        >
          <Smile className="h-4 w-4" /> 图标
        </button>
        {!pagesMode ? (
          <>
            <button
              onClick={() => setShowPortrait(true)}
              className={cn(toolbarButton.base, portraitUrl ? toolbarButton.active : toolbarButton.idle)}
              aria-pressed={!!portraitUrl}
              title="AI 生成商务证件照"
            >
              <Camera className="h-4 w-4" /> 证件照
              {portraitUrl && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
            </button>
            <button
              onClick={() => setShowGithub(true)}
              className={cn(toolbarButton.base, toolbarButton.idle)}
              title="GitHub 项目蒸馏：从仓库链接推断项目经历"
            >
              <GitBranch className="h-4 w-4" /> 项目蒸馏
            </button>
          </>
        ) : null}
        <button
          onClick={() => useBuilderStore.getState().togglePlugin("detection")}
          className={cn(toolbarButton.base, detectionOn ? toolbarButton.active : toolbarButton.idle)}
          aria-pressed={detectionOn}
        >
          <ScanText className="h-4 w-4" /> 检测
        </button>
        <button
          onClick={() => useBuilderStore.getState().togglePlugin("onePage")}
          className={cn(toolbarButton.base, onePageOn ? toolbarButton.active : toolbarButton.idle)}
          aria-pressed={onePageOn}
          title="智能一页：自动缩放字号让简历刚好一页"
        >
          <Maximize2 className="h-4 w-4" /> 一页
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={cn(toolbarButton.base, toolbarButton.idle)}
        >
          <History className="h-4 w-4" /> 历史
          {snapshots.length > 0 && (
            <span className="text-[10px] text-gray-400">{snapshots.length}</span>
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* Page count / fit indicator */}
          <PageIndicator fit={fit} onePage={onePageOn} />
          {saveState === "unsaved" && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> 未保存
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {saveState === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveState === "saved" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveState === "saving" ? "保存中" : saveState === "saved" ? "已保存" : "保存"}
          </button>
          <ExportMenu
            filename={name}
            content={content}
            themeId={themeId}
            portraitUrl={portraitUrl}
            pageRef={pageRef}
          />
        </div>
      </header>

      {/* Body: editor + preview + detection */}
      <div className="flex-1 min-h-0 flex">
        <section className="flex-1 min-w-0 border-r border-gray-200">
          {editMode === "source" ? (
            <SourceEditor
              ref={sourceRef}
              value={content}
              onChange={handleContentChange}
              placeholder="使用 Markdown 编写简历… 支持 ::: left/right 分栏与 icon:名称 语法"
            />
          ) : (
            <WysiwygEditor
              ref={wysiwygRef}
              value={content}
              onChange={handleContentChange}
              columns={columnsOn}
              icons={iconsOn}
            />
          )}
        </section>

        {previewOn && (
          <section className="flex-1 min-w-0 overflow-hidden">
            <ResumePreview
              content={content}
              themeId={themeId}
              columns={columnsOn}
              icons={iconsOn}
              onePage={onePageOn}
              portraitUrl={portraitUrl}
              pageRef={pageRef}
              onFitChange={onFitChange}
            />
          </section>
        )}

        {detectionOn && (
          <DetectionPanel
            content={content}
            onJump={handleJumpToIssue}
            onApplyFixes={handleApplyFixes}
          />
        )}
      </div>

      {/* Overlays */}
      <ThemePicker open={showTheme} onClose={() => setShowTheme(false)} />
      <PluginPanel open={showPlugins} onClose={() => setShowPlugins(false)} />
      <IconPicker open={showIcons} onPick={handleInsertIcon} onClose={() => setShowIcons(false)} />
      {!pagesMode ? <PortraitStudio open={showPortrait} onClose={() => setShowPortrait(false)} /> : null}
      {!pagesMode ? (
        <GithubProjectStudio
          open={showGithub}
          onClose={() => setShowGithub(false)}
          onApplyProject={handleApplyGithubProject}
        />
      ) : null}
      <HistoryDrawer
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onRestore={(snapshotContent) => {
          setContent(snapshotContent);
          setShowHistory(false);
        }}
      />
    </div>
  );
}

function PageIndicator({
  fit,
  onePage,
}: {
  fit: OnePageFitResult;
  onePage: boolean;
}) {
  const color =
    onePage && fit.state === "overflow"
      ? "text-rose-600"
      : onePage && fit.state === "fit" && fit.scale < 1
        ? "text-amber-600"
        : fit.estimatedPages > 1
          ? "text-amber-600"
          : "text-gray-500";
  return (
    <span className={cn("text-xs flex items-center gap-1", color)} title="页数估算 / 智能一页状态">
      {onePage && fit.scale < 1 && fit.state === "fit"
        ? `已缩放至 ${(fit.scale * 100) | 0}%`
        : `${fit.estimatedPages} 页`}
      {onePage && fit.state === "overflow" && " · 仍超出"}
    </span>
  );
}

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onRestore: (content: string) => void;
}

function HistoryDrawer({ open, onClose, onRestore }: HistoryDrawerProps) {
  const snapshots = useBuilderStore((s) => s.snapshots);
  const clearSnapshots = useBuilderStore((s) => s.clearSnapshots);
  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="历史记录"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">历史记录</h3>
          <div className="flex items-center gap-2">
            {snapshots.length > 0 && (
              <button
                onClick={clearSnapshots}
                className="text-xs text-gray-500 hover:text-rose-600"
              >
                清空
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {snapshots.length === 0 ? (
            <p className="text-sm text-gray-400 p-6 text-center">
              每次保存会自动留下一份快照。
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {snapshots.map((snap) => (
                <li key={snap.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{snap.label}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(snap.takenAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <button
                    onClick={() => onRestore(snap.content)}
                    className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    恢复
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
