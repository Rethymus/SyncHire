"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Download, FileText, Image as ImageIcon, FileType2, Loader2 } from "lucide-react";
import {
  exportResumeMarkdown,
  exportResumePng,
  printResumeToPdf,
} from "@/lib/resume-builder/export";
import { useLiteCopy } from "@/lib/lite-i18n";
import type { RefObject } from "react";

interface ExportMenuProps {
  filename: string;
  content: string;
  themeId: string;
  portraitUrl?: string | null;
  pageRef: RefObject<HTMLElement | null>;
}

function ExportMenuBase({ filename, content, themeId, portraitUrl, pageRef }: ExportMenuProps) {
  const { locale } = useLiteCopy();
  const zh = locale === "zh-CN";
  const copy = {
    trigger: zh ? "导出" : "Export",
    pdf: zh ? "导出 PDF" : "Export PDF",
    png: zh ? "导出 PNG" : "Export PNG",
    markdown: zh ? "导出 Markdown" : "Export Markdown",
    exportFailed: zh ? "导出失败" : "Export failed",
    pngFailed: zh ? "PNG 导出失败" : "PNG export failed",
    previewMissing: zh ? "未找到预览节点" : "Preview node not found",
  };
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
      printResumeToPdf(content, themeId, filename, portraitUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.exportFailed);
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  const handlePng = async () => {
    const node = pageRef.current;
    if (!node) {
      setError(copy.previewMissing);
      setOpen(false);
      return;
    }
    setBusy("png");
    setError(null);
    try {
      await exportResumePng(node, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.pngFailed);
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
      setError(e instanceof Error ? e.message : copy.exportFailed);
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
        {copy.trigger}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-44 rounded-lg border border-border bg-card shadow-lg z-30 py-1"
        >
          <button
            onClick={handlePdf}
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40"
          >
            <FileText className="h-4 w-4 text-rose-500" />
            {copy.pdf}
          </button>
          <button
            onClick={handlePng}
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40"
          >
            <ImageIcon className="h-4 w-4 text-violet-500" />
            {copy.png}
          </button>
          <button
            onClick={handleMd}
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40"
          >
            <FileType2 className="h-4 w-4 text-blue-500" />
            {copy.markdown}
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
