"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
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
  type LucideIcon,
} from "lucide-react";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { NotificationHistory } from "@/components/notification-history";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { formatLiteDate, useLiteCopy } from "@/lib/lite-i18n";
import { cn } from "@/lib/utils";

type TabType = "ai" | "skills" | "mcp" | "discover" | "notifications" | "history";

type SettingsCopy = (typeof COPY)[keyof typeof COPY];

const COPY = {
  "en-US": {
    pageTitle: "AI Runtime Settings",
    pageSubtitle:
      "Control providers, models, skills, MCP servers, and local-only security from one cc-switch-style console.",
    privacyPill: "Local browser storage only",
    tabs: {
      ai: "AI Provider",
      skills: "Skills",
      mcp: "MCP",
      discover: "Discover",
      notifications: "Notifications",
      history: "History",
    },
    ai: {
      title: "Provider and model routing",
      subtitle:
        "Add API keys locally, choose one model manually, or let SyncHire pick the best configured model per task.",
      providerMode: "Provider routing",
      auto: "Auto select",
      manual: "Manual",
      activeProvider: "Manual provider",
      baseUrl: "Base URL",
      apiKey: "API key",
      apiKeyPlaceholder: "Paste your API key. It stays in this browser.",
      modelMode: "Model mode",
      model: "Model",
      customModel: "Custom model ID",
      customModelPlaceholder: "provider-specific-model-id",
      enabled: "Enabled",
      disabled: "Disabled",
      priority: "Priority",
      masked: "Saved key",
      save: "Save AI settings",
      saved: "AI runtime settings saved locally.",
      reset: "Reset runtime defaults",
      resetDone: "Recommended defaults restored.",
      localNotice:
        "SyncHire stores keys in localStorage for local-first use. Browser storage is convenient, not a password vault; avoid shared machines.",
      noKey: "No key configured",
      configured: "Configured",
    },
    capability: {
      recommended: "Recommended",
      installed: "Installed",
      available: "Available",
      enabled: "Enabled",
      disabled: "Disabled",
      risk: "Risk",
      command: "Command",
      permission: "Permission",
      source: "Source",
      category: "Category",
      enable: "Enable",
      disable: "Disable",
      install: "Add",
      remove: "Remove",
      restore: "Use recommended defaults",
      skillsTitle: "Skill switchboard",
      skillsSubtitle:
        "Turn SyncHire skills on or off like cc switch: role-card distillation, resume tailoring, review-only browser fill, and privacy guardrails.",
      mcpTitle: "MCP switchboard",
      mcpSubtitle:
        "Choose local MCP helpers and browser bridges. Commands remain suggestions until the user installs and reviews them.",
      low: "Low",
      medium: "Medium",
      high: "High",
      empty: "No capabilities match the current filter.",
    },
    discover: {
      title: "Discovery and repository management",
      subtitle:
        "Search local metadata from SyncHire, skill.sh, mcp.sh, and custom catalogs. Refreshing does not execute remote scripts.",
      search: "Search skills and MCPs",
      kind: "Catalog type",
      all: "All",
      skills: "Skills",
      mcps: "MCPs",
      refresh: "Refresh metadata",
      refreshed: "Catalog metadata refreshed locally.",
      allowRemote: "Allow remote metadata refresh",
      autoRefresh: "Auto refresh catalogs",
      repositories: "Repositories",
      addRepository: "Add repository",
      repoName: "Repository name",
      repoUrl: "Repository URL",
      repoDescription: "Description",
      repoKind: "Kind",
      repoScript: "Script hint",
      trusted: "Trusted",
      untrusted: "Untrusted",
      lastRefresh: "Last refresh",
      protectedRepo: "Built-in repository",
      add: "Add source",
      added: "Repository added.",
      removed: "Repository removed.",
      remoteWarning:
        "Remote refresh is metadata-only. SyncHire will not run skill.sh, mcp.sh, install commands, or browser agents automatically.",
      noResults: "No results yet. Try a broader search or refresh metadata.",
    },
    status: {
      updated: "Updated",
      lastRefresh: "Last catalog refresh",
      never: "Never",
      loading: "Loading settings...",
      enabledSkills: "Enabled skills",
      enabledMcps: "Enabled MCPs",
      configuredProviders: "Configured providers",
      autoProvider: "Auto provider routing",
      manualProvider: "Manual provider routing",
    },
  },
  "zh-CN": {
    pageTitle: "AI 运行时设置",
    pageSubtitle:
      "用类似 cc switch 的控制台统一管理 API、模型、Skill、MCP 与本地安全策略。",
    privacyPill: "仅存储在本机浏览器",
    tabs: {
      ai: "AI 供应商",
      skills: "Skills",
      mcp: "MCP",
      discover: "发现",
      notifications: "通知",
      history: "历史",
    },
    ai: {
      title: "供应商与模型路由",
      subtitle:
        "在本地填写 API key，可手动指定模型，也可以让 SyncHire 按任务自动选择已配置模型。",
      providerMode: "供应商路由",
      auto: "自动选择",
      manual: "手动指定",
      activeProvider: "手动供应商",
      baseUrl: "Base URL",
      apiKey: "API key",
      apiKeyPlaceholder: "粘贴 API key，仅保存在当前浏览器。",
      modelMode: "模型模式",
      model: "模型",
      customModel: "自定义模型 ID",
      customModelPlaceholder: "provider-specific-model-id",
      enabled: "已启用",
      disabled: "已停用",
      priority: "优先级",
      masked: "已保存密钥",
      save: "保存 AI 设置",
      saved: "AI 运行时设置已保存在本地。",
      reset: "恢复推荐默认值",
      resetDone: "已恢复推荐默认值。",
      localNotice:
        "SyncHire 为了本地优先会把密钥写入 localStorage。它很便捷，但不是密码保险箱；请不要在共享机器上保存。",
      noKey: "未配置密钥",
      configured: "已配置",
    },
    capability: {
      recommended: "推荐",
      installed: "已添加",
      available: "可添加",
      enabled: "已启用",
      disabled: "已停用",
      risk: "风险",
      command: "命令",
      permission: "权限",
      source: "来源",
      category: "分类",
      enable: "启用",
      disable: "停用",
      install: "添加",
      remove: "移除",
      restore: "使用推荐默认配置",
      skillsTitle: "Skill 开关面板",
      skillsSubtitle:
        "像 cc switch 一样启停能力：角色卡蒸馏、JD 简历生成、审核式浏览器填写、本地隐私护栏等。",
      mcpTitle: "MCP 开关面板",
      mcpSubtitle:
        "选择本地 MCP 与浏览器桥接能力。命令仅作为配置提示，必须由用户审核后安装。",
      low: "低",
      medium: "中",
      high: "高",
      empty: "当前筛选下没有匹配能力。",
    },
    discover: {
      title: "发现与仓库管理",
      subtitle:
        "搜索 SyncHire、skill.sh、mcp.sh 与自定义目录的本地元数据；刷新不会执行远程脚本。",
      search: "搜索 Skill 和 MCP",
      kind: "目录类型",
      all: "全部",
      skills: "Skills",
      mcps: "MCPs",
      refresh: "刷新元数据",
      refreshed: "目录元数据已在本地刷新。",
      allowRemote: "允许远程元数据刷新",
      autoRefresh: "自动刷新目录",
      repositories: "仓库",
      addRepository: "添加仓库",
      repoName: "仓库名称",
      repoUrl: "仓库 URL",
      repoDescription: "描述",
      repoKind: "类型",
      repoScript: "脚本提示",
      trusted: "可信",
      untrusted: "未信任",
      lastRefresh: "上次刷新",
      protectedRepo: "内置仓库",
      add: "添加来源",
      added: "仓库已添加。",
      removed: "仓库已移除。",
      remoteWarning:
        "远程刷新仅更新元数据。SyncHire 不会自动执行 skill.sh、mcp.sh、安装命令或浏览器 agent。",
      noResults: "暂无结果。可以放宽搜索词或刷新元数据。",
    },
    status: {
      updated: "更新时间",
      lastRefresh: "上次目录刷新",
      never: "从未",
      loading: "正在加载设置...",
      enabledSkills: "启用 Skills",
      enabledMcps: "启用 MCPs",
      configuredProviders: "已配置供应商",
      autoProvider: "自动供应商路由",
      manualProvider: "手动供应商路由",
    },
  },
} as const;

const EMPTY_REPOSITORY_FORM = {
  name: "",
  url: "",
  description: "",
  kind: "mixed" as RuntimeCatalogKind,
  scriptHint: "catalog.json" as "skill.sh" | "mcp.sh" | "catalog.json" | "manual",
};

function updateProvider(
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

function formatOptionalDate(value: string | undefined, locale: "en-US" | "zh-CN", fallback: string) {
  return value ? formatLiteDate(value, locale) : fallback;
}

function MessageBanner({ message }: { message: { type: "success" | "error"; text: string } | null }) {
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

function SectionHeader({
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
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function MetricStrip({
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
        <div key={metric.label} className="rounded-md border border-gray-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{metric.label}</div>
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

function AIProviderPanel({
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
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const toggleVisibleKey = (providerId: AIProviderId) => {
    setVisibleKeys((current) => ({ ...current, [providerId]: !current[providerId] }));
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={KeyRound} title={copy.ai.title} subtitle={copy.ai.subtitle} />

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>{copy.ai.localNotice}</span>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <Label>{copy.ai.providerMode}</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-gray-100 p-1">
              {(["auto", "manual"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSettings({ ...settings, providerMode: mode })}
                  className={cn(
                    "rounded px-3 py-2 text-sm font-medium transition-colors",
                    settings.providerMode === mode
                      ? "bg-white text-gray-950 shadow-sm"
                      : "text-gray-600 hover:text-gray-950"
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
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{copy.status.updated}</Label>
            <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
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

          return (
            <section
              key={provider.id}
              className={cn(
                "rounded-md border bg-white p-4",
                provider.enabled ? "border-gray-200" : "border-gray-200 opacity-75"
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-950">{provider.name}</h3>
                    <Badge variant={hasKey ? "default" : "outline"} className={hasKey ? "bg-emerald-600" : ""}>
                      {hasKey ? copy.ai.configured : copy.ai.noKey}
                    </Badge>
                    <Badge variant="outline">
                      {provider.enabled ? copy.ai.enabled : copy.ai.disabled}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{provider.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`${provider.id}-enabled`} className="text-sm text-gray-700">
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
                  <p className="mt-1 text-xs text-gray-500">
                    {copy.ai.masked}: {maskApiKey(provider.apiKey)}
                  </p>
                </div>
                <div>
                  <Label>{copy.ai.modelMode}</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-gray-100 p-1">
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
                            ? "bg-white text-gray-950 shadow-sm"
                            : "text-gray-600 hover:text-gray-950"
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
                          {model.label}
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

function CapabilityCard({
  item,
  copy,
  onToggle,
  onInstallToggle,
}: {
  item: RuntimeCapability;
  copy: SettingsCopy;
  onToggle: (id: string, enabled: boolean) => void;
  onInstallToggle: (id: string, installed: boolean) => void;
}) {
  const riskCopy = {
    low: copy.capability.low,
    medium: copy.capability.medium,
    high: copy.capability.high,
  }[item.risk];

  return (
    <article className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-950">{item.name}</h3>
            {item.recommended && <Badge className="bg-blue-600">{copy.capability.recommended}</Badge>}
            <Badge variant={item.installed ? "default" : "outline"}>
              {item.installed ? copy.capability.installed : copy.capability.available}
            </Badge>
            <Badge variant="outline">
              {copy.capability.risk}: {riskCopy}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Label htmlFor={`${item.id}-enabled`} className="text-sm text-gray-700">
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
        {item.tags.map((tag) => (
          <span key={tag} className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
            {tag}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-gray-700">{copy.capability.source}</dt>
          <dd className="mt-1 text-gray-600">{item.source}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-700">{copy.capability.category}</dt>
          <dd className="mt-1 text-gray-600">{item.category}</dd>
        </div>
        {item.command && (
          <div className="sm:col-span-2">
            <dt className="font-medium text-gray-700">{copy.capability.command}</dt>
            <dd className="mt-1 rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">
              {item.command}
            </dd>
          </div>
        )}
        {item.permissionNote && (
          <div className="sm:col-span-2">
            <dt className="font-medium text-gray-700">{copy.capability.permission}</dt>
            <dd className="mt-1 text-gray-600">{item.permissionNote}</dd>
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

function CapabilityPanel({
  kind,
  settings,
  setSettings,
  copy,
  onSave,
  onDefaults,
}: {
  kind: RuntimeCapabilityKind;
  settings: AIRuntimeSettings;
  setSettings: (settings: AIRuntimeSettings) => void;
  copy: SettingsCopy;
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

    return items.filter((item) =>
      [item.name, item.description, item.category, item.source, ...item.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [items, query]);

  const title = kind === "skill" ? copy.capability.skillsTitle : copy.capability.mcpTitle;
  const subtitle = kind === "skill" ? copy.capability.skillsSubtitle : copy.capability.mcpSubtitle;
  const Icon = kind === "skill" ? Sparkles : PlugZap;

  return (
    <div className="space-y-6">
      <SectionHeader icon={Icon} title={title} subtitle={subtitle} />

      <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <Label htmlFor={`${kind}-filter`}>{copy.discover.search}</Label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
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
        <div className="rounded-md border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
          {copy.capability.empty}
        </div>
      )}
    </div>
  );
}

function DiscoveryPanel({
  settings,
  setSettings,
  copy,
  locale,
  onRefresh,
  onSave,
  showMessage,
}: {
  settings: AIRuntimeSettings;
  setSettings: (settings: AIRuntimeSettings) => void;
  copy: SettingsCopy;
  locale: "en-US" | "zh-CN";
  onRefresh: () => void;
  onSave: () => void;
  showMessage: (type: "success" | "error", text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<RuntimeCapabilityKind | "all">("all");
  const [repositoryForm, setRepositoryForm] = useState(EMPTY_REPOSITORY_FORM);
  const results = useMemo(
    () => searchRuntimeCatalog(settings, query, kind),
    [settings, query, kind]
  );

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

      <div className="grid gap-4 rounded-md border border-gray-200 bg-white p-4 lg:grid-cols-[1fr_220px_220px]">
        <div>
          <Label htmlFor="catalog-search">{copy.discover.search}</Label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
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
            {copy.discover.refresh}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-gray-900">{copy.discover.allowRemote}</span>
            <span className="block text-xs text-gray-500">Metadata only</span>
          </span>
          <Switch
            checked={settings.allowRemoteMetadataRefresh}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, allowRemoteMetadataRefresh: checked })
            }
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-gray-900">{copy.discover.autoRefresh}</span>
            <span className="block text-xs text-gray-500">When opening settings</span>
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
            copy={copy}
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
        <div className="rounded-md border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
          {copy.discover.noResults}
        </div>
      )}

      <section className="rounded-md border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-950">{copy.discover.repositories}</h3>
            <p className="mt-1 text-sm text-gray-600">{copy.discover.subtitle}</p>
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
              <div key={repository.id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
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
                    <p className="mt-1 break-all text-sm text-gray-600">{repository.url}</p>
                    <p className="mt-1 text-sm text-gray-600">{repository.description}</p>
                    <p className="mt-2 text-xs text-gray-500">
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

      <section className="rounded-md border border-gray-200 bg-white p-4">
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

export default function SettingsPage() {
  const { locale } = useLiteCopy();
  const copy = COPY[locale];
  const [activeTab, setActiveTab] = useState<TabType>("ai");
  const [settings, setSettings] = useState<AIRuntimeSettings>(() =>
    createDefaultAIRuntimeSettings()
  );
  const [hasHydrated, setHasHydrated] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4000);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = loadAIRuntimeSettings();
      const nextSettings = loaded.autoRefreshCatalogs ? refreshRuntimeCatalog(loaded) : loaded;
      setSettings(nextSettings);
      if (loaded.autoRefreshCatalogs) {
        saveAIRuntimeSettings(nextSettings);
      }
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const saveSettings = () => {
    saveAIRuntimeSettings(settings);
    showMessage("success", copy.ai.saved);
  };

  const restoreDefaults = () => {
    const nextSettings = applyRecommendedRuntimeDefaults(settings);
    setSettings(nextSettings);
    saveAIRuntimeSettings(nextSettings);
    showMessage("success", copy.ai.resetDone);
  };

  const refreshCatalogs = () => {
    const nextSettings = refreshRuntimeCatalog(settings);
    setSettings(nextSettings);
    saveAIRuntimeSettings(nextSettings);
    showMessage("success", copy.discover.refreshed);
  };

  if (!hasHydrated) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md border border-gray-200 bg-white p-8 text-sm text-gray-600">
            {copy.status.loading}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-950">{copy.pageTitle}</h1>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <ShieldCheck className="mr-1 size-3" />
                {copy.privacyPill}
              </Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{copy.pageSubtitle}</p>
          </div>
          <Button type="button" variant="outline" onClick={refreshCatalogs}>
            <RefreshCw className="size-4" />
            {copy.discover.refresh}
          </Button>
        </div>

        <div className="mb-6">
          <MetricStrip settings={settings} copy={copy} locale={locale} />
        </div>

        <MessageBanner message={message} />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="mt-6">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-gray-200 p-1">
            <TabsTrigger value="ai" className="gap-2">
              <KeyRound className="size-4" />
              {copy.tabs.ai}
            </TabsTrigger>
            <TabsTrigger value="skills" className="gap-2">
              <Sparkles className="size-4" />
              {copy.tabs.skills}
            </TabsTrigger>
            <TabsTrigger value="mcp" className="gap-2">
              <PlugZap className="size-4" />
              {copy.tabs.mcp}
            </TabsTrigger>
            <TabsTrigger value="discover" className="gap-2">
              <Search className="size-4" />
              {copy.tabs.discover}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Settings2 className="size-4" />
              {copy.tabs.notifications}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Database className="size-4" />
              {copy.tabs.history}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-6">
            <AIProviderPanel
              settings={settings}
              setSettings={setSettings}
              copy={copy}
              locale={locale}
              onSave={saveSettings}
              onReset={restoreDefaults}
            />
          </TabsContent>
          <TabsContent value="skills" className="mt-6">
            <CapabilityPanel
              kind="skill"
              settings={settings}
              setSettings={setSettings}
              copy={copy}
              onSave={saveSettings}
              onDefaults={restoreDefaults}
            />
          </TabsContent>
          <TabsContent value="mcp" className="mt-6">
            <CapabilityPanel
              kind="mcp"
              settings={settings}
              setSettings={setSettings}
              copy={copy}
              onSave={saveSettings}
              onDefaults={restoreDefaults}
            />
          </TabsContent>
          <TabsContent value="discover" className="mt-6">
            <DiscoveryPanel
              settings={settings}
              setSettings={setSettings}
              copy={copy}
              locale={locale}
              onRefresh={refreshCatalogs}
              onSave={saveSettings}
              showMessage={showMessage}
            />
          </TabsContent>
          <TabsContent value="notifications" className="mt-6">
            <NotificationSettings />
          </TabsContent>
          <TabsContent value="history" className="mt-6">
            <NotificationHistory />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
