"use client";

import { memo } from "react";
import { RESUME_THEMES, getResumeTheme, normalizeResumeThemeId } from "@/lib/resume-builder/themes";
import { useBuilderStore } from "@/lib/resume-builder/builder-store";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemePickerProps {
  open: boolean;
  onClose: () => void;
}

function ThemePickerBase({ open, onClose }: ThemePickerProps) {
  const themeId = useBuilderStore((s) => s.themeId);
  const setTheme = useBuilderStore((s) => s.setTheme);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="选择主题"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">选择主题</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">一份内容，多份简历，多种样式和排版尽收眼底。</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {RESUME_THEMES.map((theme) => {
            const active = normalizeResumeThemeId(themeId) === theme.id;
            const t = getResumeTheme(theme.id);
            return (
              <button
                key={theme.id}
                onClick={() => {
                  setTheme(theme.id);
                  onClose();
                }}
                className={cn(
                  "group relative rounded-lg border-2 overflow-hidden text-left transition",
                  active
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300",
                )}
                aria-pressed={active}
              >
                <div className="h-24 bg-white p-3 flex flex-col gap-1.5">
                  <div
                    className="h-2.5 rounded-sm"
                    style={{ background: t.heading, width: "55%" }}
                  />
                  <div
                    className="h-1.5 rounded-sm"
                    style={{ background: t.accent, width: "30%" }}
                  />
                  <div className="h-1.5 rounded-sm bg-gray-200 w-full" />
                  <div className="h-1.5 rounded-sm bg-gray-200 w-4/5" />
                  <div className="h-1.5 rounded-sm bg-gray-200 w-2/3" />
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-800">{t.label["zh-CN"]}</span>
                  <span
                    className="h-4 w-4 rounded-full border border-gray-200"
                    style={{ background: t.swatch }}
                    aria-hidden="true"
                  />
                </div>
                {active && (
                  <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const ThemePicker = memo(ThemePickerBase);
