"use client";

import { memo } from "react";
import { RESUME_ICON_KEYS, buildIconDataUri } from "@/lib/resume-md";

/**
 * Friendly insertion labels for each canonical icon key.
 * The user-facing token inserted into the source is `icon:<label>`.
 */
const ICON_LABELS: Record<string, string> = {
  user: "info",
  mail: "email",
  phone: "phone",
  location: "location",
  school: "school",
  briefcase: "work",
  award: "award",
  star: "skill",
  pencil: "edit",
  github: "github",
  linkedin: "linkedin",
  globe: "website",
  calendar: "date",
  link: "blog",
  heart: "heart",
  check: "check",
};

interface IconPickerProps {
  open: boolean;
  onPick: (token: string) => void;
  onClose: () => void;
}

function IconPickerBase({ open, onPick, onClose }: IconPickerProps) {
  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="图标列表"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">图标列表</h3>
            <p className="text-sm text-gray-500 mt-0.5">点击插入 <code className="text-xs">icon:名称</code>。</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 p-4 max-h-[60vh] overflow-auto">
          {RESUME_ICON_KEYS.map((key) => {
            const label = ICON_LABELS[key] ?? key;
            const uri = buildIconDataUri(key);
            return (
              <button
                key={key}
                onClick={() => {
                  onPick(`icon:${label} `);
                  onClose();
                }}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 p-2.5 transition"
                title={`icon:${label}`}
              >
                <span
                  className="inline-block h-5 w-5"
                  style={{
                    backgroundColor: "#374151",
                    WebkitMaskImage: `url("${uri}")`,
                    maskImage: `url("${uri}")`,
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                  }}
                  aria-hidden="true"
                />
                <span className="text-[11px] text-gray-600">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const IconPicker = memo(IconPickerBase);
