"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  PackageCheck,
  PlugZap,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  addRuntimeRepository,
  AIProviderId,
  AIRuntimeSettings,
  applyRecommendedRuntimeDefaults,
  createDefaultAIRuntimeSettings,
  loadAIRuntimeSettings,
  maskApiKey,
  refreshRuntimeCatalog,
  removeRuntimeRepository,
  RuntimeCapability,
  RuntimeCapabilityKind,
  RuntimeCatalogKind,
  saveAIRuntimeSettings,
  searchRuntimeCatalog,
  setRuntimeCapabilityEnabled,
  setRuntimeCapabilityInstalled,
} from "@/lib/ai-runtime-settings";
import {
  AI_PROVIDER_PRESETS,
  findPresetByBaseUrl,
  getPresetsForProvider,
  testAIProviderConnection,
  type AIProviderPresetId,
} from "@/lib/ai-provider-connection";
import { formatLiteDate } from "@/lib/lite-i18n";
import { cn } from "@/lib/utils";
import { isGithubPagesDeployment } from "@/lib/deployment-mode";
import { EMPTY_REPOSITORY_FORM, type SettingsCopy } from "./copy";
import { updateProvider, getProviderName, getProviderDescription, getModelLabel, getMaskedApiKey, FloatingToast, SectionHeader } from "./shared";

export function AIProviderPanel({
  settings,
  setSettings,
  copy,
  locale,
  onSave,
  onReset,
}: {
  settings: AIRuntimeSettings;
  setSettings: (settings: AIRuntimeSettings) => void;
  copy: SettingsCopy;
  locale: "en-US" | "zh-CN";
  onSave: () => void;
  onReset: () => void;
}) {
  const pagesMode = isGithubPagesDeployment();
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [testingProviderId, setTestingProviderId] = useState<AIProviderId | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});
  const [toast, setToast] = useState<{ type: "success" | "error"; title: string; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const toggleVisibleKey = (providerId: AIProviderId) => {
    setVisibleKeys((current) => ({ ...current, [providerId]: !current[providerId] }));
  };

  const handlePresetChange = (provider: AIRuntimeSettings["providers"][number], presetId: AIProviderPresetId | "custom") => {
    if (presetId === "custom") return;
    const preset = AI_PROVIDER_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    setSettings(updateProvider(settings, provider.id, { baseUrl: preset.baseUrl }));
  };

  const handleTestConnection = async (provider: AIRuntimeSettings["providers"][number]) => {
    setTestingProviderId(provider.id);
    const result = await testAIProviderConnection(provider);

    if (result.ok) {
      setSettings(updateProvider(settings, provider.id, { models: result.models }));
      setConnectionStatus((current) => ({
        ...current,
        [provider.id]: { type: "success", text: result.detail },
      }));
      setToast({ type: "success", title: result.message, text: result.detail });
    } else {
      setConnectionStatus((current) => ({
        ...current,
        [provider.id]: { type: "error", text: result.detail },
      }));
      setToast({ type: "error", title: result.message, text: result.detail });
    }

    setTestingProviderId(null);
  };

  return (
    <div className="space-y-6">
      <FloatingToast message={toast} />
      <SectionHeader icon={KeyRound} title={copy.ai.title} subtitle={copy.ai.subtitle} />

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>{copy.ai.localNotice}</span>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <Label>{copy.ai.providerMode}</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
              {(["auto", "manual"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSettings({ ...settings, providerMode: mode })}
                  className={cn(
                    "rounded px-3 py-2 text-sm font-medium transition-colors",
                    settings.providerMode === mode
                      ? "bg-card text-gray-950 shadow-sm"
                      : "text-muted-foreground hover:text-gray-950"
                  )}
                  aria-pressed={settings.providerMode === mode}
                >
                  {mode === "auto" ? copy.ai.auto : copy.ai.manual}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>{copy.ai.activeProvider}</Label>
            <Select
              value={settings.activeProviderId}
              onValueChange={(value) =>
                setSettings({ ...settings, activeProviderId: value as AIProviderId })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings.providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {getProviderName(provider, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{copy.status.updated}</Label>
            <div className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {formatLiteDate(settings.updatedAt, locale)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {settings.providers.map((provider) => {
          const selectedModel = provider.modelMode === "auto" ? "auto" : provider.selectedModel;
          const keyVisible = Boolean(visibleKeys[provider.id]);
          const hasKey = provider.apiKey.trim().length > 0;
          const presets = getPresetsForProvider(provider.id);
          const selectedPreset = findPresetByBaseUrl(provider.id, provider.baseUrl);
          const status = connectionStatus[provider.id];
          const isTesting = testingProviderId === provider.id;

          return (
            <section
              key={provider.id}
              className={cn(
                "rounded-md border bg-card p-4",
                provider.enabled ? "border-border" : "border-border opacity-75"
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-950">
                      {getProviderName(provider, locale)}
                    </h3>
                    <Badge variant={hasKey ? "default" : "outline"} className={hasKey ? "bg-emerald-600" : ""}>
                      {hasKey ? copy.ai.configured : copy.ai.noKey}
                    </Badge>
                    <Badge variant="outline">
                      {provider.enabled ? copy.ai.enabled : copy.ai.disabled}
                    </Badge>
                    <Badge
                      variant={status?.type === "success" ? "default" : "outline"}
                      className={status?.type === "success" ? "bg-emerald-600" : status?.type === "error" ? "border-red-300 text-red-700" : ""}
                    >
                      {status?.type === "success"
                        ? copy.ai.connectionOk
                        : status?.type === "error"
                          ? copy.ai.connectionFailed
                          : copy.ai.connectionUntested}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {getProviderDescription(provider, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`${provider.id}-enabled`} className="text-sm text-muted-foreground">
                    {copy.ai.enabled}
                  </Label>
                  <Switch
                    id={`${provider.id}-enabled`}
                    checked={provider.enabled}
                    onCheckedChange={(checked) =>
                      setSettings(updateProvider(settings, provider.id, { enabled: checked }))
                    }
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <Label>{copy.ai.providerPreset}</Label>
                  <Select
                    value={selectedPreset?.id ?? "custom"}
                    onValueChange={(value) => handlePresetChange(provider, value as AIProviderPresetId | "custom")}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">{copy.ai.customEndpoint}</SelectItem>
                    </SelectContent>
                  </Select>
                  {(selectedPreset?.apiKeyUrl || presets[0]?.apiKeyUrl) && (
                    <a
                      href={selectedPreset?.apiKeyUrl ?? presets[0].apiKeyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                    >
                      <LinkIcon className="size-3.5" />
                      {copy.ai.apiKeyLink}
                    </a>
                  )}
                </div>
                <div>
                  <Label htmlFor={`${provider.id}-base-url`}>{copy.ai.baseUrl}</Label>
                  <Input
                    id={`${provider.id}-base-url`}
                    value={provider.baseUrl}
                    onChange={(event) =>
                      setSettings(updateProvider(settings, provider.id, { baseUrl: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`${provider.id}-api-key`}>{copy.ai.apiKey}</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      id={`${provider.id}-api-key`}
                      data-testid={`${provider.id}-api-key`}
                      type={keyVisible ? "text" : "password"}
                      autoComplete="off"
                      value={provider.apiKey}
                      placeholder={copy.ai.apiKeyPlaceholder}
                      onChange={(event) =>
                        setSettings(updateProvider(settings, provider.id, { apiKey: event.target.value }))
                      }
                      className="mt-0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => toggleVisibleKey(provider.id)}
                      aria-label={keyVisible ? "Hide API key" : "Show API key"}
                    >
                      {keyVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.ai.masked}: {getMaskedApiKey(provider.apiKey, locale, copy.ai.noKey)}
                  </p>
                </div>
                <div>
                  <Label>{copy.ai.testConnection}</Label>
                  <div className="mt-2 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTestConnection(provider)}
                      disabled={isTesting || pagesMode}
                      className="justify-start"
                    >
                      {isTesting ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                      {isTesting ? copy.ai.testingConnection : pagesMode ? "Pages 版不测试模型列表" : copy.ai.testConnection}
                    </Button>
                    <p
                      className={cn(
                        "text-xs leading-5",
                        status?.type === "success" ? "text-emerald-700" : status?.type === "error" ? "text-red-700" : "text-muted-foreground"
                      )}
                    >
                      {status?.text ?? (pagesMode ? "直连请求将在你确认后、实际使用 AI 时发送。" : copy.ai.connectionDetail)}
                    </p>
                  </div>
                </div>
                <div>
                  <Label>{copy.ai.modelMode}</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
                    {(["auto", "manual"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setSettings(
                            updateProvider(settings, provider.id, {
                              modelMode: mode,
                              selectedModel: mode === "auto" ? "auto" : provider.selectedModel,
                            })
                          )
                        }
                        className={cn(
                          "rounded px-3 py-2 text-sm font-medium transition-colors",
                          provider.modelMode === mode
                            ? "bg-card text-gray-950 shadow-sm"
                            : "text-muted-foreground hover:text-gray-950"
                        )}
                        aria-pressed={provider.modelMode === mode}
                      >
                        {mode === "auto" ? copy.ai.auto : copy.ai.manual}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>{copy.ai.model}</Label>
                  <Select
                    value={selectedModel}
                    onValueChange={(value) =>
                      setSettings(
                        updateProvider(settings, provider.id, {
                          modelMode: value === "auto" ? "auto" : "manual",
                          selectedModel: value,
                        })
                      )
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {provider.models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {getModelLabel(provider, model, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {provider.selectedModel === "custom" && (
                  <div className="lg:col-span-2">
                    <Label htmlFor={`${provider.id}-custom-model`}>{copy.ai.customModel}</Label>
                    <Input
                      id={`${provider.id}-custom-model`}
                      value={provider.customModelId}
                      placeholder={copy.ai.customModelPlaceholder}
                      onChange={(event) =>
                        setSettings(
                          updateProvider(settings, provider.id, { customModelId: event.target.value })
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onReset}>
          <RotateCcw className="size-4" />
          {copy.ai.reset}
        </Button>
        <Button type="button" onClick={onSave}>
          <CheckCircle2 className="size-4" />
          {copy.ai.save}
        </Button>
      </div>
    </div>
  );
}
