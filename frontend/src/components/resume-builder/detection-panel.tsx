"use client";

import { memo, useMemo } from "react";
import {
  proofreadResume,
  applyProofreadFixes,
  type ProofreadCategory,
  type Severity,
} from "@/lib/resume-builder/proofread";
import { cn } from "@/lib/utils";
import { Wand2, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface DetectionPanelProps {
  content: string;
  onJump: (line: number, column: number) => void;
  onApplyFixes: (fixedContent: string) => void;
}

const CATEGORY_META: Record<ProofreadCategory, { label: string; color: string }> = {
  typo: { label: "错别字", color: "text-rose-600" },
  "english-term": { label: "英文专词", color: "text-violet-600" },
  punctuation: { label: "标点误用", color: "text-amber-600" },
  spacing: { label: "中英文间距", color: "text-sky-600" },
};

const SEVERITY_DOT: Record<Severity, string> = {
  error: "bg-rose-500",
  warning: "bg-amber-500",
  info: "bg-sky-400",
};

function DetectionPanelBase({ content, onJump, onApplyFixes }: DetectionPanelProps) {
  const result = useMemo(() => proofreadResume(content), [content]);
  const total = result.issues.length;
  const hasAutoFixable = result.issues.some(
    (i) =>
      i.category === "typo" ||
      (i.category === "punctuation" && i.severity === "error"),
  );

  return (
    <aside className="flex flex-col h-full bg-white border-l border-gray-200 w-80 min-w-80">
      <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">智能检测</h3>
          <span className="text-xs text-gray-400">({total})</span>
        </div>
        {hasAutoFixable && (
          <button
            onClick={() => onApplyFixes(applyProofreadFixes(content))}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
          >
            <Wand2 className="h-3 w-3" />
            一键修正
          </button>
        )}
      </header>

      <div className="grid grid-cols-4 gap-1 px-3 py-2 border-b border-gray-50 text-center">
        {(Object.keys(CATEGORY_META) as ProofreadCategory[]).map((cat) => (
          <div key={cat} className="flex flex-col">
            <span className={cn("text-base font-bold", CATEGORY_META[cat].color)}>
              {result.counts[cat]}
            </span>
            <span className="text-[10px] text-gray-500">{CATEGORY_META[cat].label}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 p-6">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
            <p className="text-sm">未发现问题，内容很干净。</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {result.issues.map((issue) => (
              <li key={issue.id}>
                <button
                  onClick={() => onJump(issue.line, issue.column)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_DOT[issue.severity])} />
                    <span className="text-[10px] text-gray-400">
                      第 {issue.line} 行 · {CATEGORY_META[issue.category].label}
                    </span>
                    {issue.suggestion && (
                      <span className="ml-auto text-[10px] text-blue-500">点击修正</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{issue.message}</p>
                  {issue.suggestion && (
                    <p className="text-xs text-gray-400 mt-1">
                      <span className="line-through">{issue.excerpt}</span>{" "}
                      → <span className="text-green-600 font-medium">{issue.suggestion}</span>
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="px-4 py-2 border-t border-gray-100 text-[11px] text-gray-400 flex items-center gap-1">
        <Info className="h-3 w-3" />
        仅作辅助检查，修改请自行判断。
      </footer>
    </aside>
  );
}

export const DetectionPanel = memo(DetectionPanelBase);
