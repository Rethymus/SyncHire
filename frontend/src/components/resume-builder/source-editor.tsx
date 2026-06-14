"use client";

import { forwardRef, useImperativeHandle, useRef, type ChangeEvent } from "react";

export interface SourceEditorHandle {
  /** Insert text at the current cursor position (used by the icon picker). */
  insertAtCursor: (text: string) => void;
  /** Move focus and selection to a 1-based line/column (detection jumps). */
  focusLine: (line: number, column: number) => void;
  /** Replace a 1-based line range's text (used when fixing an issue). */
  getTextArea: () => HTMLTextAreaElement | null;
}

interface SourceEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function offsetOfLineCol(text: string, line: number, column: number): number {
  let currentLine = 1;
  let i = 0;
  while (currentLine < line && i < text.length) {
    if (text[i] === "\n") {
      currentLine += 1;
    }
    i += 1;
  }
  return i + Math.max(0, column - 1);
}

export const SourceEditor = forwardRef<SourceEditorHandle, SourceEditorProps>(
  function SourceEditor({ value, onChange, placeholder }, ref) {
    const taRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      insertAtCursor: (text: string) => {
        const ta = taRef.current;
        if (!ta) {
          return;
        }
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = value.slice(0, start) + text + value.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
          ta.focus();
          const pos = start + text.length;
          ta.setSelectionRange(pos, pos);
        });
      },
      focusLine: (line: number, column: number) => {
        const ta = taRef.current;
        if (!ta) {
          return;
        }
        const offset = offsetOfLineCol(value, line, column);
        ta.focus();
        ta.setSelectionRange(offset, offset);
      },
      getTextArea: () => taRef.current,
    }), [value, onChange]);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    };

    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="flex-1 min-h-0">
          <textarea
            ref={taRef}
            value={value}
            onChange={handleChange}
            placeholder={placeholder ?? "在此编写简历（Markdown）…"}
            spellCheck={false}
            className="w-full h-full p-6 resize-none focus:outline-none font-mono text-[13px] leading-7 text-gray-800 bg-transparent"
            aria-label="简历源码编辑"
          />
        </div>
      </div>
    );
  },
);
