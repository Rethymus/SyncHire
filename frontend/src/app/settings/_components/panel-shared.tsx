"use client";

// Panel-only helpers and presentational pieces for the lazily loaded
// settings panels. Kept separate from shared.tsx (which the page shell
// imports statically) because these helpers depend on the zh provider /
// capability catalogs in copy-panels.ts — pulling them into shared.tsx
// would drag the whole panel copy into the settings first load.

import {
  CheckCircle2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  AIProviderId,
  AIRuntimeSettings,
  maskApiKey,
  RuntimeCapability,
} from "@/lib/ai-runtime-settings";
import { cn } from "@/lib/utils";
import { ZH_PROVIDER_COPY, ZH_CAPABILITY_COPY, type SettingsLocale } from "./copy-panels";

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

export function getProviderName(provider: AIRuntimeSettings["providers"][number], locale: SettingsLocale) {
  return locale === "zh-CN" ? ZH_PROVIDER_COPY[provider.id].name : provider.name;
}

export function getProviderDescription(provider: AIRuntimeSettings["providers"][number], locale: SettingsLocale) {
  return locale === "zh-CN" ? ZH_PROVIDER_COPY[provider.id].description : provider.description;
}

export function getModelLabel(
  provider: AIRuntimeSettings["providers"][number],
  model: AIRuntimeSettings["providers"][number]["models"][number],
  locale: SettingsLocale
) {
  return locale === "zh-CN" ? ZH_PROVIDER_COPY[provider.id].models[model.id]?.label ?? model.label : model.label;
}

export function getMaskedApiKey(apiKey: string, locale: SettingsLocale, noKeyCopy: string) {
  if (!apiKey) {
    return locale === "zh-CN" ? noKeyCopy : maskApiKey(apiKey);
  }

  return maskApiKey(apiKey);
}

export function getCapabilityDisplay(item: RuntimeCapability, locale: SettingsLocale) {
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
