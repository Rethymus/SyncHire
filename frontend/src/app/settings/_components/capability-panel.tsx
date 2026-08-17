"use client";

import { useMemo, useState } from "react";
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
import { type SettingsCopy } from "./copy";
import { getCapabilityDisplay, SectionHeader } from "./shared";

export function CapabilityCard({
  item,
  copy,
  locale,
  onToggle,
  onInstallToggle,
}: {
  item: RuntimeCapability;
  copy: SettingsCopy;
  locale: "en-US" | "zh-CN";
  onToggle: (id: string, enabled: boolean) => void;
  onInstallToggle: (id: string, installed: boolean) => void;
}) {
  const riskCopy = {
    low: copy.capability.low,
    medium: copy.capability.medium,
    high: copy.capability.high,
  }[item.risk];
  const display = getCapabilityDisplay(item, locale);

  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-950">{display.name}</h3>
            {item.recommended && <Badge className="bg-blue-600">{copy.capability.recommended}</Badge>}
            <Badge variant={item.installed ? "default" : "outline"}>
              {item.installed ? copy.capability.installed : copy.capability.available}
            </Badge>
            <Badge variant="outline">
              {copy.capability.risk}: {riskCopy}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{display.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Label htmlFor={`${item.id}-enabled`} className="text-sm text-muted-foreground">
            {item.enabled ? copy.capability.enabled : copy.capability.disabled}
          </Label>
          <Switch
            id={`${item.id}-enabled`}
            checked={item.enabled}
            disabled={!item.installed}
            onCheckedChange={(checked) => onToggle(item.id, checked)}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {display.tags.map((tag) => (
          <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-muted-foreground">{copy.capability.source}</dt>
          <dd className="mt-1 text-muted-foreground">{display.source}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">{copy.capability.category}</dt>
          <dd className="mt-1 text-muted-foreground">{display.category}</dd>
        </div>
        {item.command && (
          <div className="sm:col-span-2">
            <dt className="font-medium text-muted-foreground">{copy.capability.command}</dt>
            <dd className="mt-1 rounded-md bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
              {item.command}
            </dd>
          </div>
        )}
        {display.permissionNote && (
          <div className="sm:col-span-2">
            <dt className="font-medium text-muted-foreground">{copy.capability.permission}</dt>
            <dd className="mt-1 text-muted-foreground">{display.permissionNote}</dd>
          </div>
        )}
      </dl>

      {!item.recommended && (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onInstallToggle(item.id, !item.installed)}
          >
            {item.installed ? <Trash2 className="size-4" /> : <PackageCheck className="size-4" />}
            {item.installed ? copy.capability.remove : copy.capability.install}
          </Button>
        </div>
      )}
    </article>
  );
}

export function CapabilityPanel({
  kind,
  settings,
  setSettings,
  copy,
  locale,
  onSave,
  onDefaults,
}: {
  kind: RuntimeCapabilityKind;
  settings: AIRuntimeSettings;
  setSettings: (settings: AIRuntimeSettings) => void;
  copy: SettingsCopy;
  locale: "en-US" | "zh-CN";
  onSave: () => void;
  onDefaults: () => void;
}) {
  const items = kind === "skill" ? settings.skills : settings.mcps;
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return items;
    }

    return items.filter((item) => {
      const display = getCapabilityDisplay(item, locale);

      return [item.name, item.description, item.category, item.source, ...item.tags, display.name, display.description, display.category, display.source, ...display.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [items, locale, query]);

  const title = kind === "skill" ? copy.capability.skillsTitle : copy.capability.mcpTitle;
  const subtitle = kind === "skill" ? copy.capability.skillsSubtitle : copy.capability.mcpSubtitle;
  const Icon = kind === "skill" ? Sparkles : PlugZap;

  return (
    <div className="space-y-6">
      <SectionHeader icon={Icon} title={title} subtitle={subtitle} />

      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <Label htmlFor={`${kind}-filter`}>{copy.discover.search}</Label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />
            <Input
              id={`${kind}-filter`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDefaults}>
            <RotateCcw className="size-4" />
            {copy.capability.restore}
          </Button>
          <Button type="button" onClick={onSave}>
            <CheckCircle2 className="size-4" />
            {copy.ai.save}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((item) => (
          <CapabilityCard
            key={item.id}
            item={item}
            copy={copy}
            locale={locale}
            onToggle={(id, enabled) =>
              setSettings(setRuntimeCapabilityEnabled(settings, kind, id, enabled))
            }
            onInstallToggle={(id, installed) =>
              setSettings(setRuntimeCapabilityInstalled(settings, kind, id, installed))
            }
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {copy.capability.empty}
        </div>
      )}
    </div>
  );
}
