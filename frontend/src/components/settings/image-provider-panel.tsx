"use client";

import { memo, useCallback, useEffect, useState } from "react";
import {
  IMAGE_PROVIDER_PRESETS,
  getImagePreset,
  loadImageProviderSettings,
  saveImageProviderSettings,
  maskApiKey,
  testImageProviderConnection,
  type ImagePresetId,
  type ImageProviderSettings,
  type ImageConnectionResult,
} from "@/lib/image-provider-settings";
import { CheckCircle2, Eye, EyeOff, Loader2, PlugZap, ExternalLink, AlertCircle } from "lucide-react";

interface ImageProviderPanelProps {
  onSaved?: () => void;
}

function ImageProviderPanelBase({ onSaved }: ImageProviderPanelProps) {
  const [settings, setSettings] = useState<ImageProviderSettings>(() =>
    loadImageProviderSettings(),
  );
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ImageConnectionResult | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Re-load if storage changes from another tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "synchire-image-provider-settings") {
        setSettings(loadImageProviderSettings());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const preset = getImagePreset(settings.presetId);

  const update = useCallback((patch: Partial<ImageProviderSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setResult(null);
  }, []);

  const handlePresetChange = useCallback((id: ImagePresetId) => {
    const p = getImagePreset(id);
    setSettings((prev) => ({
      ...prev,
      presetId: id,
      baseUrl: id === "custom" ? prev.baseUrl : p.baseUrl,
      model: p.defaultModel,
    }));
    setResult(null);
  }, []);

  const handleSave = useCallback(() => {
    saveImageProviderSettings(settings);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
    onSaved?.();
  }, [settings, onSaved]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setResult(null);
    // Persist first so the proxy reads a coherent config if needed downstream.
    saveImageProviderSettings(settings);
    const r = await testImageProviderConnection(settings);
    setResult(r);
    setTesting(false);
  }, [settings]);

  return (
    <section className="rounded-md border border-gray-200 bg-white p-5 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-950 flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-blue-600" />
            图像生成供应商
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            独立于文本 AI 的图像接口。许多大模型不具备图像生成能力，因此证件照功能使用单独的 API key。
          </p>
        </div>
        {preset.apiKeyUrl && (
          <a
            href={preset.apiKeyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            获取 API key <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </header>

      {/* Preset */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">供应商</label>
        <select
          value={settings.presetId}
          onChange={(e) => handlePresetChange(e.target.value as ImagePresetId)}
          className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none bg-white"
        >
          {IMAGE_PROVIDER_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Base URL */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Base URL</label>
        <input
          value={settings.baseUrl}
          onChange={(e) => update({ baseUrl: e.target.value })}
          placeholder="https://api.example.com/v1"
          className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm font-mono focus:border-blue-400 focus:outline-none"
        />
      </div>

      {/* API key */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          API Key {preset.requiresApiKey && <span className="text-rose-500">*</span>}
          <span className="ml-2 text-gray-400 font-normal">
            {settings.apiKey ? `已保存：${maskApiKey(settings.apiKey)}` : "（仅本地存储，不离开本机）"}
          </span>
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={settings.apiKey}
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder={preset.requiresApiKey ? "sk-..." : "可选"}
            className="w-full h-9 px-3 pr-10 rounded-md border border-gray-200 text-sm font-mono focus:border-blue-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showKey ? "隐藏" : "显示"}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">模型 ID</label>
        <input
          value={settings.model}
          onChange={(e) => update({ model: e.target.value })}
          placeholder={preset.defaultModel}
          className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm font-mono focus:border-blue-400 focus:outline-none"
        />
        <p className="text-[11px] text-gray-400 mt-1">{preset.modelHint}</p>
      </div>

      {/* Size */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">输出尺寸</label>
        <select
          value={settings.size}
          onChange={(e) => update({ size: e.target.value as ImageProviderSettings["size"] })}
          className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none bg-white"
        >
          <option value="1024x1024">1024 × 1024（方形，推荐）</option>
          <option value="1:1">1:1（由模型决定）</option>
          <option value="auto">auto</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
          测试连通性
        </button>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
        >
          {savedFlash ? <CheckCircle2 className="h-4 w-4" /> : null}
          {savedFlash ? "已保存" : "保存配置"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-start gap-2">
            {result.ok ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">{result.message}</p>
              <p className="text-xs opacity-90 mt-0.5">{result.detail}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export const ImageProviderPanel = memo(ImageProviderPanelBase);
