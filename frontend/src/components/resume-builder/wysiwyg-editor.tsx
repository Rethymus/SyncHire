"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { renderResumeMarkdown } from "@/lib/resume-md";
import { serializeResumeDom } from "@/lib/resume-builder/serialize-resume-dom";
import { resolveIconName } from "@/lib/resume-md";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  Link as LinkIcon,
  Eraser,
} from "lucide-react";

export interface WysiwygEditorHandle {
  /** Insert raw HTML at the current selection (used for icon spans). */
  insertHtml: (html: string) => void;
  /** Insert an icon by canonical token, e.g. "icon:email". */
  insertIcon: (token: string) => void;
  focus: () => void;
}

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  columns: boolean;
  icons: boolean;
}

const WYSIWYG_STYLE = `
.resume-wysiwyg{outline:none;min-height:100%;padding:32px 40px;font-size:14px;line-height:1.7;color:#1f2937;}
.resume-wysiwyg:focus{outline:none}
.resume-wysiwyg h1{font-size:26px;font-weight:800;margin:0 0 8px;}
.resume-wysiwyg h2{font-size:18px;font-weight:700;margin:18px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;}
.resume-wysiwyg h3{font-size:15px;font-weight:700;margin:12px 0 4px;}
.resume-wysiwyg p{margin:6px 0;}
.resume-wysiwyg strong{font-weight:700;color:#111827;}
.resume-wysiwyg ul,.resume-wysiwyg ol{margin:6px 0;padding-left:22px;}
.resume-wysiwyg li{margin:2px 0;}
.resume-wysiwyg a{color:#2563eb;text-decoration:none;}
.resume-wysiwyg blockquote{border-left:3px solid #d1d5db;padding:4px 12px;color:#4b5563;margin:8px 0;}
.resume-wysiwyg .resume-row{display:flex;gap:16px;}
.resume-wysiwyg .resume-col{flex:1;}
.resume-wysiwyg .resume-col-right{margin-left:auto;text-align:right;}
.resume-wysiwyg .ri{display:inline-block;width:14px;height:14px;vertical-align:-2px;background-color:#6b7280;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-size:contain;mask-size:contain;}
`;

export const WysiwygEditor = forwardRef<WysiwygEditorHandle, WysiwygEditorProps>(
  function WysiwygEditor({ value, onChange, columns, icons }, ref) {
    const elRef = useRef<HTMLDivElement>(null);
    const lastEmitted = useRef(value);

    // Reset innerHTML only for external changes (load / mode switch / fixes),
    // never for our own emissions — that preserves the caret while typing.
    useEffect(() => {
      const el = elRef.current;
      if (!el) {
        return;
      }
      if (value !== lastEmitted.current) {
        el.innerHTML = renderResumeMarkdown(value, { columns, icons });
        lastEmitted.current = value;
      }
    }, [value, columns, icons]);

    const emit = useCallback(() => {
      const el = elRef.current;
      if (!el) {
        return;
      }
      const md = serializeResumeDom(el);
      lastEmitted.current = md;
      onChange(md);
    }, [onChange]);

    useImperativeHandle(ref, () => ({
      insertHtml: (html: string) => {
        const el = elRef.current;
        if (!el) {
          return;
        }
        el.focus();
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) {
          return;
        }
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const fragment = range.createContextualFragment(html);
        const lastNode = fragment.lastChild;
        range.insertNode(fragment);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        emit();
      },
      insertIcon: (token: string) => {
        const name = token.replace(/^icon:/, "").trim();
        const resolved = resolveIconName(name) || "mail";
        const iconHtml = `<span class="ri ri-${resolved}" contenteditable="false">&nbsp;</span>&nbsp;`;
        const el = elRef.current;
        if (!el) {
          return;
        }
        el.focus();
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) {
          return;
        }
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const fragment = range.createContextualFragment(iconHtml);
        range.insertNode(fragment);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        emit();
      },
      focus: () => elRef.current?.focus(),
    }), [emit]);

    const exec = (command: string, arg?: string) => {
      elRef.current?.focus();
      document.execCommand(command, false, arg);
      emit();
    };

    const handleLink = () => {
      const url = window.prompt("链接地址 https://…");
      if (url) {
        exec("createLink", url);
      }
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
      // The persisted representation is Markdown. Never let pasted rich HTML
      // become an editable DOM sink beside a session-scoped provider key.
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      emit();
    };

    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-100 bg-gray-50">
          <ToolbarButton title="加粗" onClick={() => exec("bold")}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="斜体" onClick={() => exec("italic")}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="二级标题" onClick={() => exec("formatBlock", "<h2>")}>
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="三级标题" onClick={() => exec("formatBlock", "<h3>")}>
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="无序列表" onClick={() => exec("insertUnorderedList")}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="插入链接" onClick={handleLink}>
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="清除格式" onClick={() => exec("formatBlock", "<p>")}>
            <Eraser className="h-4 w-4" />
          </ToolbarButton>
        </div>
        <style>{WYSIWYG_STYLE}</style>
        <div
          ref={elRef}
          className="resume-wysiwyg flex-1 overflow-auto"
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onPaste={handlePaste}
          aria-label="所见即所得编辑"
          dir="ltr"
        />
      </div>
    );
  },
);

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="h-8 w-8 inline-flex items-center justify-center rounded text-gray-600 hover:bg-gray-200 transition"
    >
      {children}
    </button>
  );
}
