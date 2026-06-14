/**
 * Builder UI state — ephemeral editor state that is NOT part of the persisted
 * {@link Resume} record: chosen theme, source/WYSIWYG mode, the smart-one-page
 * toggle, and the pluggable feature toggles ("插件模式" / clean mode).
 *
 * Persisted to localStorage so the user's editing environment is stable across
 * sessions, independently of which resume they are editing.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { normalizeResumeThemeId, type ResumeThemeId } from "./themes";

export type EditMode = "source" | "wysiwyg";

/** Pluggable features. Render plugins change how markdown is rendered;
 *  panel plugins change which UI surfaces are visible (clean mode). */
export type PluginKey =
  | "columns"
  | "icons"
  | "detection"
  | "onePage"
  | "preview"
  | "outline";

export interface PluginDef {
  key: PluginKey;
  label: string;
  description: string;
  /** Whether this affects rendering vs. only the editing UI. */
  kind: "render" | "panel";
  defaultOn: boolean;
}

export const PLUGIN_DEFS: PluginDef[] = [
  {
    key: "columns",
    label: "分栏排版",
    description: "启用 ::: left / ::: right 多栏容器语法",
    kind: "render",
    defaultOn: true,
  },
  {
    key: "icons",
    label: "行内图标",
    description: "启用 icon:name 行内图标语法",
    kind: "render",
    defaultOn: true,
  },
  {
    key: "onePage",
    label: "智能一页",
    description: "自动缩放字号，让简历刚好一页",
    kind: "panel",
    defaultOn: false,
  },
  {
    key: "detection",
    label: "智能检测",
    description: "错别字、英文专词、标点误用检测",
    kind: "panel",
    defaultOn: true,
  },
  {
    key: "preview",
    label: "实时预览",
    description: "显示右侧 A4 实时预览（关闭即专注写作）",
    kind: "panel",
    defaultOn: true,
  },
  {
    key: "outline",
    label: "章节大纲",
    description: "显示简历章节大纲，快速跳转",
    kind: "panel",
    defaultOn: false,
  },
];

const DEFAULT_PLUGINS: Record<PluginKey, boolean> = PLUGIN_DEFS.reduce(
  (acc, def) => {
    acc[def.key] = def.defaultOn;
    return acc;
  },
  {} as Record<PluginKey, boolean>,
);

/** Snapshot of editor content for the history panel. */
export interface ResumeSnapshot {
  id: string;
  takenAt: number;
  label: string;
  content: string;
}

interface BuilderState {
  themeId: ResumeThemeId;
  editMode: EditMode;
  plugins: Record<PluginKey, boolean>;
  snapshots: ResumeSnapshot[];
  /** Optional generated business headshot (data URL) shown atop the resume. */
  portraitUrl: string;
  setTheme: (id: string) => void;
  setEditMode: (mode: EditMode) => void;
  togglePlugin: (key: PluginKey) => void;
  setPlugin: (key: PluginKey, on: boolean) => void;
  isPluginOn: (key: PluginKey) => boolean;
  pushSnapshot: (label: string, content: string) => void;
  clearSnapshots: () => void;
  setPortraitUrl: (url: string) => void;
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      themeId: "minimal",
      editMode: "source",
      plugins: { ...DEFAULT_PLUGINS },
      snapshots: [],
      portraitUrl: "",

      setTheme: (id) => set({ themeId: normalizeResumeThemeId(id) }),
      setEditMode: (mode) => set({ editMode: mode }),
      togglePlugin: (key) =>
        set((state) => ({
          plugins: { ...state.plugins, [key]: !state.plugins[key] },
        })),
      setPlugin: (key, on) =>
        set((state) => ({ plugins: { ...state.plugins, [key]: on } })),
      isPluginOn: (key) => get().plugins[key],
      pushSnapshot: (label, content) =>
        set((state) => ({
          snapshots: [
            {
              id: `snap-${Date.now()}`,
              takenAt: Date.now(),
              label,
              content,
            },
            ...state.snapshots,
          ].slice(0, 30),
        })),
      clearSnapshots: () => set({ snapshots: [] }),
      setPortraitUrl: (url) => set({ portraitUrl: url }),
    }),
    {
      name: "synchire-resume-builder",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        themeId: state.themeId,
        editMode: state.editMode,
        plugins: state.plugins,
        snapshots: state.snapshots,
        portraitUrl: state.portraitUrl,
      }),
    },
  ),
);
