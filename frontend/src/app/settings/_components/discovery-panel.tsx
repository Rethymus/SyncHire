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
import { Textarea } from "@/components/ui/textarea";
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
import { EMPTY_REPOSITORY_FORM, getPanelCopy } from "./copy-panels";
import { formatOptionalDate } from "./shared";
import { getCapabilityDisplay, SectionHeader } from "./panel-shared";
import { CapabilityCard } from "./capability-panel";

export function DiscoveryPanel({
  settings,
  setSettings,
  locale,
  onRefresh,
  onSave,
  showMessage,
}: {
  settings: AIRuntimeSettings;
  setSettings: (settings: AIRuntimeSettings) => void;
  locale: "en-US" | "zh-CN";
  onRefresh: () => void;
  onSave: () => void;
  showMessage: (type: "success" | "error", text: string) => void;
}) {
  const copy = getPanelCopy(locale);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<RuntimeCapabilityKind | "all">("all");
  const [repositoryForm, setRepositoryForm] = useState(EMPTY_REPOSITORY_FORM);
  const results = useMemo(() => {
    const baseResults = searchRuntimeCatalog(settings, query, kind);
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return baseResults;
    }

    const rawMatches = new Set(baseResults.map((item) => item.id));
    const items = [
      ...(kind === "mcp" ? [] : settings.skills),
      ...(kind === "skill" ? [] : settings.mcps),
    ];
    const translatedMatches = items.filter((item) => {
      const display = getCapabilityDisplay(item, locale);

      return [
        display.name,
        display.description,
        display.category,
        display.source,
        ...display.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });

    return [
      ...baseResults,
      ...translatedMatches.filter((item) => !rawMatches.has(item.id)),
    ];
  }, [settings, query, kind, locale]);

  const protectedRepositoryIds = new Set(["synchire-built-in", "skill-sh", "mcp-sh"]);

  const handleAddRepository = () => {
    if (!repositoryForm.name.trim() || !repositoryForm.url.trim()) {
      showMessage("error", locale === "zh-CN" ? "请填写仓库名称和 URL。" : "Repository name and URL are required.");
      return;
    }

    const nextSettings = addRuntimeRepository(settings, {
      name: repositoryForm.name.trim(),
      url: repositoryForm.url.trim(),
      description: repositoryForm.description.trim() || repositoryForm.url.trim(),
      kind: repositoryForm.kind,
      scriptHint: repositoryForm.scriptHint,
    });
    setSettings(nextSettings);
    saveAIRuntimeSettings(nextSettings);
    setRepositoryForm(EMPTY_REPOSITORY_FORM);
    showMessage("success", copy.discover.added);
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={Database} title={copy.discover.title} subtitle={copy.discover.subtitle} />

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>{copy.discover.remoteWarning}</span>
        </div>
      </div>

      <div className="grid gap-4 rounded-md border border-border bg-card p-4 lg:grid-cols-[1fr_220px_220px]">
        <div>
          <Label htmlFor="catalog-search">{copy.discover.search}</Label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />
            <Input
              id="catalog-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
              placeholder="resume, browser, JD, local..."
            />
          </div>
        </div>
        <div>
          <Label>{copy.discover.kind}</Label>
          <Select
            value={kind}
            onValueChange={(value) => setKind(value as RuntimeCapabilityKind | "all")}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.discover.all}</SelectItem>
              <SelectItem value="skill">{copy.discover.skills}</SelectItem>
              <SelectItem value="mcp">{copy.discover.mcps}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="button" className="w-full" onClick={onRefresh}>
            <RefreshCw className="size-4" />
            {copy.actions.refresh}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-foreground">{copy.discover.allowRemote}</span>
            <span className="block text-xs text-muted-foreground">Metadata only</span>
          </span>
          <Switch
            checked={settings.allowRemoteMetadataRefresh}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, allowRemoteMetadataRefresh: checked })
            }
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-foreground">{copy.discover.autoRefresh}</span>
            <span className="block text-xs text-muted-foreground">{copy.discover.whenOpeningSettings}</span>
          </span>
          <Switch
            checked={settings.autoRefreshCatalogs}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, autoRefreshCatalogs: checked })
            }
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {results.map((item) => (
          <CapabilityCard
            key={`${item.kind}-${item.id}`}
            item={item}
            locale={locale}
            onToggle={(id, enabled) =>
              setSettings(setRuntimeCapabilityEnabled(settings, item.kind, id, enabled))
            }
            onInstallToggle={(id, installed) =>
              setSettings(setRuntimeCapabilityInstalled(settings, item.kind, id, installed))
            }
          />
        ))}
      </div>

      {results.length === 0 && (
        <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {copy.discover.noResults}
        </div>
      )}

      <section className="rounded-md border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-950">{copy.discover.repositories}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{copy.discover.subtitle}</p>
          </div>
          <Button type="button" variant="outline" onClick={onSave}>
            <CheckCircle2 className="size-4" />
            {copy.ai.save}
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          {settings.repositories.map((repository) => {
            const isProtected = protectedRepositoryIds.has(repository.id);

            return (
              <div key={repository.id} className="rounded-md border border-border bg-muted/40 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-gray-950">{repository.name}</h4>
                      <Badge variant={repository.trusted ? "default" : "outline"}>
                        {repository.trusted ? copy.discover.trusted : copy.discover.untrusted}
                      </Badge>
                      <Badge variant="outline">{repository.kind}</Badge>
                      {isProtected && <Badge variant="outline">{copy.discover.protectedRepo}</Badge>}
                    </div>
                    <p className="mt-1 break-all text-sm text-muted-foreground">{repository.url}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{repository.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {copy.discover.lastRefresh}:{" "}
                      {formatOptionalDate(repository.lastRefreshedAt, locale, copy.status.never)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={repository.enabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          repositories: settings.repositories.map((item) =>
                            item.id === repository.id ? { ...item, enabled: checked } : item
                          ),
                        })
                      }
                    />
                    {!isProtected && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const nextSettings = removeRuntimeRepository(settings, repository.id);
                          setSettings(nextSettings);
                          saveAIRuntimeSettings(nextSettings);
                          showMessage("success", copy.discover.removed);
                        }}
                        aria-label={`Remove ${repository.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <h3 className="text-base font-semibold text-gray-950">{copy.discover.addRepository}</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <Label htmlFor="repository-name">{copy.discover.repoName}</Label>
            <Input
              id="repository-name"
              value={repositoryForm.name}
              onChange={(event) =>
                setRepositoryForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="repository-url">{copy.discover.repoUrl}</Label>
            <Input
              id="repository-url"
              value={repositoryForm.url}
              onChange={(event) =>
                setRepositoryForm((current) => ({ ...current, url: event.target.value }))
              }
              placeholder="https://example.com/catalog.json"
            />
          </div>
          <div>
            <Label>{copy.discover.repoKind}</Label>
            <Select
              value={repositoryForm.kind}
              onValueChange={(value) =>
                setRepositoryForm((current) => ({ ...current, kind: value as RuntimeCatalogKind }))
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">mixed</SelectItem>
                <SelectItem value="skill">skill</SelectItem>
                <SelectItem value="mcp">mcp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{copy.discover.repoScript}</Label>
            <Select
              value={repositoryForm.scriptHint}
              onValueChange={(value) =>
                setRepositoryForm((current) => ({
                  ...current,
                  scriptHint: value as typeof repositoryForm.scriptHint,
                }))
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="catalog.json">catalog.json</SelectItem>
                <SelectItem value="skill.sh">skill.sh</SelectItem>
                <SelectItem value="mcp.sh">mcp.sh</SelectItem>
                <SelectItem value="manual">manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="repository-description">{copy.discover.repoDescription}</Label>
            <Textarea
              id="repository-description"
              value={repositoryForm.description}
              onChange={(event) =>
                setRepositoryForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={handleAddRepository}>
            <PackageCheck className="size-4" />
            {copy.discover.add}
          </Button>
        </div>
      </section>
    </div>
  );
}
