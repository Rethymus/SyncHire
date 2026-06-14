"use client";

import { memo } from "react";
import {
  PLUGIN_DEFS,
  useBuilderStore,
  type PluginKey,
} from "@/lib/resume-builder/builder-store";
import { cn } from "@/lib/utils";

interface PluginPanelProps {
  open: boolean;
  onClose: () => void;
}

function PluginPanelBase({ open, onClose }: PluginPanelProps) {
  const plugins = useBuilderStore((s) => s.plugins);
  const togglePlugin = useBuilderStore((s) => s.togglePlugin);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="插件设置"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">插件模式</h3>
            <p className="text-sm text-gray-500 mt-0.5">可插拔式设置，随时给你一片清爽的编辑页面。</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <ul className="divide-y divide-gray-100">
          {PLUGIN_DEFS.map((def) => {
            const on = plugins[def.key as PluginKey];
            return (
              <li key={def.key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{def.label}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full",
                        def.kind === "render"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-blue-50 text-blue-600",
                      )}
                    >
                      {def.kind === "render" ? "渲染" : "界面"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{def.description}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={on}
                  aria-label={def.label}
                  onClick={() => togglePlugin(def.key)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition",
                    on ? "bg-blue-500" : "bg-gray-300",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                      on ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export const PluginPanel = memo(PluginPanelBase);
