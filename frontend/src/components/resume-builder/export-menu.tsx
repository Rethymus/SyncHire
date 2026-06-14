"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Download, FileText, Image as ImageIcon, FileType2, Loader2 } from "lucide-react";
import {
  exportResumeMarkdown,
  exportResumePng,
  printResumeToPdf,
} from "@/lib/resume-builder/export";
import type { RefObject } from "react";

interface ExportMenuProps {
  filename: string;
  content: string;
  themeId: string;
  pageRef: RefObject<HTMLElement | null>;
}

function ExportMenuBase({ filename, content, themeId, pageRef }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "pdf" | "png" | "md">(null);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!error) {
      return;
    }
    const t = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(t);
  }, [error]);

  const handlePdf = () => {
    setBusy("pdf");
    setError(null);
    try {
      printResumeToPdf(content, themeId, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败");
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  const handlePng = async () => {
    const node = pageRef.current;
    if (!node) {
      setError("未找到预览节点");
      setOpen(false);
      return;
    }
    setBusy("png");
    setError(null);
    try {
      await exportResumePng(node, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PNG 导出失败");
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  const handleMd = () => {
    setBusy("md");
    setError(null);
    try {
      exportResumeMarkdown(filename, content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败");
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800 transition disabled:opacity-60"
        disabled={busy !== null}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        导出
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-30 py-1"
        >
          <button
            onClick={handlePdf}
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 text-rose-500" />
            导出 PDF
          </button>
          <button
            onClick={handlePng}
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ImageIcon className="h-4 w-4 text-violet-500" />
            导出 PNG
          </button>
          <button
            onClick={handleMd}
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <FileType2 className="h-4 w-4 text-blue-500" />
            导出 Markdown
          </button>
        </div>
      )}

      {error && (
        <div className="absolute right-0 top-11 w-56 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 shadow-md z-30">
          {error}
        </div>
      )}
    </div>
  );
}

export const ExportMenu = memo(ExportMenuBase);
