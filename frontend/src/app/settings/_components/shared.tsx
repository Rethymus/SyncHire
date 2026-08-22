"use client";

// Shell-side shared pieces for the settings page. This module is imported
// statically by page.tsx, so it must stay lean: only MessageBanner,
// MetricStrip and the small date helper the shell needs.
//
// Panel-only helpers (provider/capability display functions that depend on
// the zh catalogs) live in panel-shared.tsx and are loaded with the panels.

import { SlidersHorizontal } from "lucide-react";
import type { AIRuntimeSettings } from "@/lib/ai-runtime-settings";
import { formatLiteDate } from "@/lib/lite-i18n";
import { cn } from "@/lib/utils";
import { COPY, type SettingsCopy } from "./copy";

export function formatOptionalDate(value: string | undefined, locale: "en-US" | "zh-CN", fallback: string) {
  return value ? formatLiteDate(value, locale) : fallback;
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

export function MetricStrip({
  settings,
  locale,
}: {
  settings: AIRuntimeSettings;
  locale: "en-US" | "zh-CN";
}) {
  const copy: SettingsCopy = COPY[locale];
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
