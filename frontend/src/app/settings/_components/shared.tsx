"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ZH_PROVIDER_COPY, ZH_CAPABILITY_COPY, type SettingsCopy } from "./copy";

export function updateProvider(
  settings: AIRuntimeSettings,
  providerId: AIProviderId,
  updates: Partial<AIRuntimeSettings["providers"][number]>
): AIRuntimeSettings {
  return {
    ...settings,
    providers: settings.providers.map((provider) =>
      provider.id === providerId ? { ...provider, ...updates } : provider
    ),
  };
}

export function formatOptionalDate(value: string | undefined, locale: "en-US" | "zh-CN", fallback: string) {
  return value ? formatLiteDate(value, locale) : fallback;
}


export function getProviderName(provider: AIRuntimeSettings["providers"][number], locale: "en-US" | "zh-CN") {
  return locale === "zh-CN" ? ZH_PROVIDER_COPY[provider.id].name : provider.name;
}

export function getProviderDescription(provider: AIRuntimeSettings["providers"][number], locale: "en-US" | "zh-CN") {
  return locale === "zh-CN" ? ZH_PROVIDER_COPY[provider.id].description : provider.description;
}

export function getModelLabel(
  provider: AIRuntimeSettings["providers"][number],
  model: AIRuntimeSettings["providers"][number]["models"][number],
  locale: "en-US" | "zh-CN"
) {
  return locale === "zh-CN" ? ZH_PROVIDER_COPY[provider.id].models[model.id]?.label ?? model.label : model.label;
}

export function getMaskedApiKey(apiKey: string, locale: "en-US" | "zh-CN", noKeyCopy: string) {
  if (!apiKey) {
    return locale === "zh-CN" ? noKeyCopy : maskApiKey(apiKey);
  }

  return maskApiKey(apiKey);
}

export function getCapabilityDisplay(item: RuntimeCapability, locale: "en-US" | "zh-CN") {
  const zhCopy = locale === "zh-CN" ? ZH_CAPABILITY_COPY[item.id] : undefined;

  return {
    name: zhCopy?.name ?? item.name,
    description: zhCopy?.description ?? item.description,
    category: zhCopy?.category ?? item.category,
    tags: zhCopy?.tags ?? item.tags,
    source: zhCopy?.source ?? item.source,
    permissionNote: zhCopy?.permissionNote ?? item.permissionNote,
  };
}


export function MessageBanner({ message }: { message: { type: "success" | "error"; text: string } | null }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        message.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      )}
      role="status"
      aria-live="polite"
    >
      {message.text}
    </div>
  );
}

export function FloatingToast({ message }: { message: { type: "success" | "error"; title: string; text: string } | null }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed right-4 top-4 z-50 max-w-md rounded-md border bg-card p-4 shadow-lg",
        message.type === "success" ? "border-emerald-200" : "border-red-200"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {message.type === "success" ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        ) : (
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-red-600" />
        )}
        <div>
          <div className={cn("text-sm font-semibold", message.type === "success" ? "text-emerald-900" : "text-red-900")}>
            {message.title}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{message.text}</p>
        </div>
      </div>
    </div>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-gray-950 text-white">
          <Icon className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export function MetricStrip({
  settings,
  copy,
  locale,
}: {
  settings: AIRuntimeSettings;
  copy: SettingsCopy;
  locale: "en-US" | "zh-CN";
}) {
  const configuredProviders = settings.providers.filter((provider) => provider.apiKey.trim()).length;
  const enabledSkills = settings.skills.filter((skill) => skill.enabled).length;
  const enabledMcps = settings.mcps.filter((mcp) => mcp.enabled).length;
  const routingCopy =
    settings.providerMode === "auto" ? copy.status.autoProvider : copy.status.manualProvider;

  const metrics = [
    { label: copy.status.configuredProviders, value: configuredProviders.toString() },
    { label: copy.status.enabledSkills, value: enabledSkills.toString() },
    { label: copy.status.enabledMcps, value: enabledMcps.toString() },
    { label: copy.status.lastRefresh, value: formatOptionalDate(settings.lastCatalogRefreshAt, locale, copy.status.never) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-md border border-border bg-card px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</div>
          <div className="mt-2 text-lg font-semibold text-gray-950">{metric.value}</div>
        </div>
      ))}
      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 sm:col-span-2 lg:col-span-4">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
          <SlidersHorizontal className="size-4" />
          {routingCopy}
        </div>
      </div>
    </div>
  );
}
