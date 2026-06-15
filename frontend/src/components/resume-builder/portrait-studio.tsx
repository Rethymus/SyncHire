"use client";

import { memo, useCallback, useRef, useState } from "react";
import {
  loadImageProviderSettings,
  getImagePreset,
  type ImageProviderSettings,
} from "@/lib/image-provider-settings";
import {
  buildPortraitPrompt,
  PORTRAIT_BACKGROUND_OPTIONS,
  DEFAULT_PORTRAIT_BACKGROUND_ID,
  type PortraitDetails,
  type PortraitBackgroundId,
} from "@/lib/portrait-prompt";
import { useBuilderStore } from "@/lib/resume-builder/builder-store";
import {
  Upload,
  Wand2,
  Loader2,
  X,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Settings as SettingsIcon,
} from "lucide-react";
import Link from "next/link";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB

interface PortraitStudioProps {
  open: boolean;
  onClose: () => void;
}

type GenStatus = "idle" | "generating" | "done" | "error";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function PortraitStudioBase({ open, onClose }: PortraitStudioProps) {
  const setPortraitUrl = useBuilderStore((s) => s.setPortraitUrl);
  const currentPortrait = useBuilderStore((s) => s.portraitUrl);

  const [sourcePhoto, setSourcePhoto] = useState<string>("");
  const [details, setDetails] = useState<PortraitDetails>({
    name: "",
    title: "",
    department: "",
    backgroundId: DEFAULT_PORTRAIT_BACKGROUND_ID,
  });
  const [status, setStatus] = useState<GenStatus>("idle");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [provider, setProvider] = useState<ImageProviderSettings | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshProvider = useCallback(() => {
    setProvider(loadImageProviderSettings());
  }, []);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("请上传图片文件（PNG / JPG / WEBP）。");
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError("图片过大，请压缩到 8MB 以内。");
        return;
      }
      setError("");
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setSourcePhoto(dataUrl);
        setResult("");
        setStatus("idle");
      } catch {
        setError("读取图片失败，请重试。");
      }
    },
    [],
  );

  const handleGenerate = useCallback(async () => {
    setError("");
    const settings = loadImageProviderSettings();
    setProvider(settings);
    if (!settings.baseUrl) {
      setError("尚未配置图像生成供应商。请先在「设置 → 图像」中填写接口与 API key。");
      return;
    }
    if (!settings.apiKey && getImagePreset(settings.presetId).requiresApiKey) {
      setError("尚未填写图像 API key。请先在「设置 → 图像」中配置。");
      return;
    }
    setStatus("generating");
    setResult("");
    try {
      const prompt = buildPortraitPrompt(details);
      const res = await fetch("/api/image-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          model: settings.model,
          prompt,
          imageDataUrl: sourcePhoto || undefined,
          presetId: settings.presetId,
          size: settings.size,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; imageUrl?: string; error?: string } | null;
      if (!data || !data.ok || !data.imageUrl) {
        throw new Error(data?.error || "生成失败，请检查图像供应商配置与额度。");
      }
      setResult(data.imageUrl);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [details, sourcePhoto]);

  const handleApply = useCallback(() => {
    if (!result) return;
    setPortraitUrl(result);
    onClose();
  }, [result, setPortraitUrl, onClose]);

  const handleRemovePortrait = useCallback(() => {
    setPortraitUrl("");
  }, [setPortraitUrl]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="证件照生成"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">证件照生成</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Provider status */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5">
            <div className="text-xs text-gray-600">
              {(() => {
                const p = provider ?? loadImageProviderSettings();
                const preset = getImagePreset(p.presetId);
                return (
                  <>
                    <span className="font-medium text-gray-800">{preset.label}</span>
                    <span className="mx-2 text-gray-300">·</span>
                    模型 <code className="text-gray-700">{p.model || "未设置"}</code>
                    <span className="mx-2 text-gray-300">·</span>
                    Key {p.apiKey ? "已配置" : "未配置"}
                  </>
                );
              })()}
            </div>
            <Link
              href="/settings?tab=image"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <SettingsIcon className="h-3 w-3" /> 前往配置
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">1. 上传日常照片</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                className={`cursor-pointer rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-44 transition ${
                  dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                {sourcePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sourcePhoto} alt="原图" className="max-h-40 max-w-full object-contain rounded" />
                ) : (
                  <>
                    <Upload className="h-7 w-7 text-gray-400 mb-1.5" />
                    <p className="text-sm text-gray-500">点击或拖拽上传</p>
                    <p className="text-xs text-gray-400 mt-0.5">PNG / JPG / WEBP，≤ 8MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            {/* Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">2. 信息栏（可选）</label>
              <p className="text-xs text-gray-500 mb-2">
                中文会按规则自动翻译为正式英文显示在图片上。
              </p>
              <div className="space-y-2">
                <input
                  value={details.name}
                  onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))}
                  placeholder="姓名（如：陈宇）"
                  className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
                />
                <input
                  value={details.title}
                  onChange={(e) => setDetails((d) => ({ ...d, title: e.target.value }))}
                  placeholder="职位（如：前端工程师）"
                  className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
                />
                <input
                  value={details.department}
                  onChange={(e) => setDetails((d) => ({ ...d, department: e.target.value }))}
                  placeholder="部门（如：前端开发部）"
                  className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Background color */}
          <div>
            <label
              htmlFor="portrait-bg"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              背景颜色
            </label>
            <p className="text-xs text-gray-500 mb-2">
              选择证件照底色，不同颜色适配不同场景，请以接收方要求为准。
            </p>
            <select
              id="portrait-bg"
              value={details.backgroundId ?? DEFAULT_PORTRAIT_BACKGROUND_ID}
              onChange={(e) =>
                setDetails((d) => ({
                  ...d,
                  backgroundId: e.target.value as PortraitBackgroundId,
                }))
              }
              className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none bg-white"
            >
              {PORTRAIT_BACKGROUND_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} — {option.scenario}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={status === "generating"}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {status === "generating" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {status === "generating" ? "生成中…" : "生成商务证件照"}
            </button>
            <span className="text-xs text-gray-400">
              将调用配置的图像模型，可能需要数秒到数十秒。
            </span>
          </div>

          {/* Result */}
          {result && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">3. 生成结果</label>
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result} alt="证件照" className="w-40 h-40 object-cover rounded-lg border border-gray-200" />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleApply}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 transition"
                  >
                    <Check className="h-4 w-4" /> 应用到简历
                  </button>
                  <button
                    onClick={() => {
                      setResult("");
                      setStatus("idle");
                    }}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition"
                  >
                    重新生成
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentPortrait && (
            <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-2">
              <span className="text-xs text-amber-800">简历已设置证件照。</span>
              <button
                onClick={handleRemovePortrait}
                className="text-xs text-amber-700 hover:text-amber-900 underline"
              >
                移除当前证件照
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const PortraitStudio = memo(PortraitStudioBase);
