import { getCredentialStorage, isGithubPagesDeployment } from "./deployment-mode";

export const AI_RUNTIME_SETTINGS_STORAGE_KEY = "synchire-ai-runtime-settings";
export const AI_RUNTIME_SETTINGS_VERSION = 1;

export type AIProviderId =
  | "openai"
  | "anthropic"
  | "moonshot"
  | "deepseek"
  | "gemini"
  | "local";

export type ProviderMode = "auto" | "manual";
export type ModelSelectionMode = "auto" | "manual";
export type RuntimeCatalogKind = "skill" | "mcp" | "mixed";
export type RuntimeCapabilityKind = "skill" | "mcp";
export type RuntimeRiskLevel = "low" | "medium" | "high";

export interface AIModelOption {
  id: string;
  label: string;
  description: string;
  useCases: string[];
}

export interface AIProviderConfig {
  id: AIProviderId;
  name: string;
  description: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  modelMode: ModelSelectionMode;
  selectedModel: string;
  customModelId: string;
  priority: number;
  models: AIModelOption[];
}

export interface RuntimeCapability {
  id: string;
  kind: RuntimeCapabilityKind;
  name: string;
  description: string;
  category: string;
  tags: string[];
  source: string;
  enabled: boolean;
  installed: boolean;
  recommended: boolean;
  risk: RuntimeRiskLevel;
  repositoryId: string;
  command?: string;
  permissionNote?: string;
  updatedAt?: string;
}

export interface RuntimeRepository {
  id: string;
  name: string;
  url: string;
  kind: RuntimeCatalogKind;
  enabled: boolean;
  trusted: boolean;
  description: string;
  scriptHint?: "skill.sh" | "mcp.sh" | "catalog.json" | "manual";
  lastRefreshedAt?: string;
}

export interface AIRuntimeSettings {
  version: number;
  providerMode: ProviderMode;
  activeProviderId: AIProviderId;
  providers: AIProviderConfig[];
  skills: RuntimeCapability[];
  mcps: RuntimeCapability[];
  repositories: RuntimeRepository[];
  defaultSkillIds: string[];
  defaultMcpIds: string[];
  autoRefreshCatalogs: boolean;
  allowRemoteMetadataRefresh: boolean;
  lastCatalogRefreshAt?: string;
  updatedAt: string;
}

const DEFAULT_AI_MODELS: Record<AIProviderId, AIModelOption[]> = {
  openai: [
    {
      id: "auto",
      label: "Auto select",
      description: "Let SyncHire choose speed or reasoning depth by task.",
      useCases: ["resume tailoring", "JD analysis", "browser fill review"],
    },
    {
      id: "gpt-5",
      label: "GPT-5",
      description: "Deep reasoning for role-card distillation and resume rewrite.",
      useCases: ["strategy", "resume generation", "interview prep"],
    },
    {
      id: "gpt-5-mini",
      label: "GPT-5 mini",
      description: "Fast daily drafting and field-fill suggestions.",
      useCases: ["drafting", "classification", "low-latency fill"],
    },
    {
      id: "custom",
      label: "Custom model ID",
      description: "Use any model ID supported by your endpoint.",
      useCases: ["custom endpoint"],
    },
  ],
  anthropic: [
    {
      id: "auto",
      label: "Auto select",
      description: "Use the best configured Claude-family model for each task.",
      useCases: ["resume reasoning", "JD matching"],
    },
    {
      id: "claude-sonnet",
      label: "Claude Sonnet family",
      description: "Balanced reasoning and speed for most job-search flows.",
      useCases: ["role-card updates", "cover letters", "browser fill"],
    },
    {
      id: "claude-haiku",
      label: "Claude Haiku family",
      description: "Economical extraction and classification.",
      useCases: ["field extraction", "tagging", "summaries"],
    },
    {
      id: "custom",
      label: "Custom model ID",
      description: "Use any model ID supported by your endpoint.",
      useCases: ["custom endpoint"],
    },
  ],
  moonshot: [
    {
      id: "auto",
      label: "Auto select",
      description: "Prefer Kimi for long Chinese JD and resume context.",
      useCases: ["Chinese resumes", "long context"],
    },
    {
      id: "kimi-k2",
      label: "Kimi K2",
      description: "Long-context Chinese and English job-search reasoning.",
      useCases: ["long JD", "role-card distillation"],
    },
    {
      id: "custom",
      label: "Custom model ID",
      description: "Use any Moonshot-compatible model ID.",
      useCases: ["custom endpoint"],
    },
  ],
  deepseek: [
    {
      id: "auto",
      label: "Auto select",
      description: "Choose DeepSeek chat or reasoning model by task.",
      useCases: ["analysis", "drafting"],
    },
    {
      id: "deepseek-chat",
      label: "DeepSeek Chat",
      description: "Efficient drafting, extraction, and summarization.",
      useCases: ["JD parsing", "resume bullets"],
    },
    {
      id: "deepseek-reasoner",
      label: "DeepSeek Reasoner",
      description: "Reasoning-heavy match analysis and interview planning.",
      useCases: ["match analysis", "interview prep"],
    },
    {
      id: "custom",
      label: "Custom model ID",
      description: "Use any DeepSeek-compatible model ID.",
      useCases: ["custom endpoint"],
    },
  ],
  gemini: [
    {
      id: "auto",
      label: "Auto select",
      description: "Let SyncHire choose Gemini depth by task.",
      useCases: ["multimodal resume review", "drafting"],
    },
    {
      id: "gemini-pro",
      label: "Gemini Pro family",
      description: "Reasoning and multimodal-friendly review.",
      useCases: ["resume review", "company research"],
    },
    {
      id: "gemini-flash",
      label: "Gemini Flash family",
      description: "Low-latency local assistant workflows.",
      useCases: ["field fill", "summaries"],
    },
    {
      id: "custom",
      label: "Custom model ID",
      description: "Use any Gemini-compatible model ID.",
      useCases: ["custom endpoint"],
    },
  ],
  local: [
    {
      id: "auto",
      label: "Auto select",
      description: "Use the local model server default.",
      useCases: ["offline drafting", "private extraction"],
    },
    {
      id: "ollama-default",
      label: "Ollama default",
      description: "Local model served from an Ollama-compatible endpoint.",
      useCases: ["offline", "privacy-first"],
    },
    {
      id: "custom",
      label: "Custom model ID",
      description: "Use any local model ID exposed by your endpoint.",
      useCases: ["custom endpoint"],
    },
  ],
};

export const DEFAULT_AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI compatible",
    description: "General-purpose reasoning, resume writing, and structured extraction.",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    enabled: true,
    modelMode: "auto",
    selectedModel: "auto",
    customModelId: "",
    priority: 1,
    models: DEFAULT_AI_MODELS.openai,
  },
  {
    id: "anthropic",
    name: "Anthropic compatible",
    description: "Strong long-form reasoning and cautious browser-fill suggestions.",
    baseUrl: "https://api.anthropic.com",
    apiKey: "",
    enabled: true,
    modelMode: "auto",
    selectedModel: "auto",
    customModelId: "",
    priority: 2,
    models: DEFAULT_AI_MODELS.anthropic,
  },
  {
    id: "moonshot",
    name: "Kimi / Moonshot",
    description: "Long-context Chinese and bilingual job-search workflows.",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKey: "",
    enabled: true,
    modelMode: "auto",
    selectedModel: "auto",
    customModelId: "",
    priority: 3,
    models: DEFAULT_AI_MODELS.moonshot,
  },
  {
    id: "deepseek",
    name: "DeepSeek compatible",
    description: "Efficient reasoning and drafting for local-first workflows.",
    baseUrl: "https://api.deepseek.com",
    apiKey: "",
    enabled: false,
    modelMode: "auto",
    selectedModel: "auto",
    customModelId: "",
    priority: 4,
    models: DEFAULT_AI_MODELS.deepseek,
  },
  {
    id: "gemini",
    name: "Gemini compatible",
    description: "Multimodal-friendly analysis and fast drafting.",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: "",
    enabled: false,
    modelMode: "auto",
    selectedModel: "auto",
    customModelId: "",
    priority: 5,
    models: DEFAULT_AI_MODELS.gemini,
  },
  {
    id: "local",
    name: "Local model server",
    description: "Offline OpenAI-compatible endpoint for maximum privacy.",
    baseUrl: "http://localhost:11434/v1",
    apiKey: "",
    enabled: false,
    modelMode: "auto",
    selectedModel: "auto",
    customModelId: "",
    priority: 6,
    models: DEFAULT_AI_MODELS.local,
  },
];

export const DEFAULT_SKILLS: RuntimeCapability[] = [
  {
    id: "role-card-distiller",
    kind: "skill",
    name: "Role Card Distiller",
    description: "Distill the user's profile into a compact candidate role card for every JD match.",
    category: "Profile intelligence",
    tags: ["role-card", "privacy", "fresh-graduate"],
    source: "SyncHire built-in",
    enabled: true,
    installed: true,
    recommended: true,
    risk: "low",
    repositoryId: "synchire-built-in",
  },
  {
    id: "jd-resume-tailor",
    kind: "skill",
    name: "JD Resume Tailor",
    description: "Generate role-specific resume drafts without inventing experience.",
    category: "Resume generation",
    tags: ["resume", "JD", "ATS"],
    source: "SyncHire built-in",
    enabled: true,
    installed: true,
    recommended: true,
    risk: "low",
    repositoryId: "synchire-built-in",
  },
  {
    id: "browser-fill-review",
    kind: "skill",
    name: "Review-Only Browser Fill",
    description: "Prepare application form values for user review while blocking automatic submission.",
    category: "Browser assistant",
    tags: ["browser", "forms", "human-review"],
    source: "SyncHire built-in",
    enabled: true,
    installed: true,
    recommended: true,
    risk: "medium",
    repositoryId: "synchire-built-in",
    permissionNote: "Requires explicit user approval before learning from edits.",
  },
  {
    id: "local-privacy-guard",
    kind: "skill",
    name: "Local Privacy Guard",
    description: "Keep personal data local and warn before sending sensitive fields to a model provider.",
    category: "Security",
    tags: ["local-first", "PII", "consent"],
    source: "SyncHire built-in",
    enabled: true,
    installed: true,
    recommended: true,
    risk: "low",
    repositoryId: "synchire-built-in",
  },
  {
    id: "application-ledger",
    kind: "skill",
    name: "Application Ledger",
    description: "Track every JD, tailored resume, status change, and next action locally.",
    category: "Job management",
    tags: ["tracker", "workflow", "applications"],
    source: "SyncHire built-in",
    enabled: true,
    installed: true,
    recommended: true,
    risk: "low",
    repositoryId: "synchire-built-in",
  },
  {
    id: "resume-pdf-export",
    kind: "skill",
    name: "Resume PDF Export",
    description: "Render tailored resume drafts into user-reviewable PDF output.",
    category: "Resume generation",
    tags: ["PDF", "export", "resume"],
    source: "SyncHire built-in",
    enabled: true,
    installed: true,
    recommended: true,
    risk: "low",
    repositoryId: "synchire-built-in",
  },
  {
    id: "interview-prep-coach",
    kind: "skill",
    name: "Interview Prep Coach",
    description: "Generate focused interview questions, answer outlines, and risk checks from the JD.",
    category: "Interview",
    tags: ["interview", "questions", "practice"],
    source: "SyncHire catalog",
    enabled: false,
    installed: true,
    recommended: false,
    risk: "low",
    repositoryId: "synchire-built-in",
  },
  {
    id: "recruiter-message-writer",
    kind: "skill",
    name: "Recruiter Message Writer",
    description: "Draft concise outreach messages from your role card and target company context.",
    category: "Outreach",
    tags: ["message", "networking", "recruiter"],
    source: "Skill metadata catalog",
    enabled: false,
    installed: false,
    recommended: false,
    risk: "low",
    repositoryId: "skill-sh",
  },
  {
    id: "offer-comparison",
    kind: "skill",
    name: "Offer Comparison",
    description: "Compare compensation, growth, commute, and risk across offers.",
    category: "Decision support",
    tags: ["offer", "compensation", "decision"],
    source: "Skill metadata catalog",
    enabled: false,
    installed: false,
    recommended: false,
    risk: "low",
    repositoryId: "skill-sh",
  },
];

export const DEFAULT_MCPS: RuntimeCapability[] = [
  {
    id: "synchire-resume-analyzer",
    kind: "mcp",
    name: "SyncHire Resume Analyzer",
    description: "Parse resumes into structured local candidate evidence.",
    category: "Local MCP",
    tags: ["resume", "parser", "local"],
    source: "SyncHire built-in",
    enabled: true,
    installed: true,
    recommended: true,
    risk: "low",
    repositoryId: "synchire-built-in",
    command: "npm --workspace @synchire/mcp-resume-analyzer start",
  },
  {
    id: "synchire-jd-parser",
    kind: "mcp",
    name: "SyncHire JD Parser",
    description: "Extract title, company, requirements, and skills from pasted job descriptions.",
    category: "Local MCP",
    tags: ["JD", "parser", "local"],
    source: "SyncHire built-in",
    enabled: true,
    installed: true,
    recommended: true,
    risk: "low",
    repositoryId: "synchire-built-in",
    command: "npm --workspace @synchire/mcp-jd-parser start",
  },
  {
    id: "synchire-job-matcher",
    kind: "mcp",
    name: "SyncHire Job Matcher",
    description: "Score local role-card and resume evidence against the target JD.",
    category: "Local MCP",
    tags: ["matching", "score", "local"],
    source: "SyncHire built-in",
    enabled: true,
    installed: true,
    recommended: true,
    risk: "low",
    repositoryId: "synchire-built-in",
    command: "npm --workspace @synchire/mcp-job-matcher start",
  },
  {
    id: "synchire-interview-prep",
    kind: "mcp",
    name: "SyncHire Interview Prep",
    description: "Build interview prep materials from the JD and application history.",
    category: "Local MCP",
    tags: ["interview", "prep", "local"],
    source: "SyncHire built-in",
    enabled: true,
    installed: true,
    recommended: true,
    risk: "low",
    repositoryId: "synchire-built-in",
    command: "npm --workspace @synchire/mcp-interview-prep start",
  },
  {
    id: "review-only-webbridge",
    kind: "mcp",
    name: "Review-Only WebBridge",
    description: "Connect to a browser bridge for filling forms while leaving final submission to the user.",
    category: "Browser MCP",
    tags: ["browser", "forms", "no-submit"],
    source: "MCP metadata catalog",
    enabled: true,
    installed: true,
    recommended: true,
    risk: "medium",
    repositoryId: "mcp-sh",
    command: "Configure after installing a trusted browser bridge",
    permissionNote: "Never clicks submit. Learning from user edits requires consent.",
  },
  {
    id: "local-file-vault",
    kind: "mcp",
    name: "Local File Vault",
    description: "Read and write approved resume assets from a local folder only.",
    category: "Storage MCP",
    tags: ["files", "local", "vault"],
    source: "MCP metadata catalog",
    enabled: false,
    installed: false,
    recommended: false,
    risk: "medium",
    repositoryId: "mcp-sh",
    command: "Configure local directory access before enabling",
  },
  {
    id: "calendar-reminders",
    kind: "mcp",
    name: "Calendar Reminders",
    description: "Create local interview reminder drafts for user approval.",
    category: "Productivity MCP",
    tags: ["calendar", "interview", "reminders"],
    source: "MCP metadata catalog",
    enabled: false,
    installed: false,
    recommended: false,
    risk: "medium",
    repositoryId: "mcp-sh",
    command: "Configure with your local calendar bridge",
  },
];

export const DEFAULT_REPOSITORIES: RuntimeRepository[] = [
  {
    id: "synchire-built-in",
    name: "SyncHire Built-in Catalog",
    url: "local://synchire/catalog",
    kind: "mixed",
    enabled: true,
    trusted: true,
    description: "Curated local-first capabilities shipped with SyncHire.",
    scriptHint: "catalog.json",
  },
  {
    id: "skill-sh",
    name: "skill.sh Skill Registry",
    url: "https://skill.sh",
    kind: "skill",
    enabled: true,
    trusted: false,
    description: "Skill metadata registry. SyncHire refreshes metadata only and never runs remote shell scripts.",
    scriptHint: "skill.sh",
  },
  {
    id: "mcp-sh",
    name: "mcp.sh MCP Registry",
    url: "https://mcp.sh",
    kind: "mcp",
    enabled: true,
    trusted: false,
    description: "MCP metadata registry. Commands require user review before installation.",
    scriptHint: "mcp.sh",
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(now = new Date()) {
  return now.toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mergeById<T extends { id: string }>(defaults: T[], persisted: unknown): T[] {
  const persistedItems = Array.isArray(persisted)
    ? persisted.filter(isObject)
    : [];
  const persistedById = new Map(
    persistedItems
      .filter((item): item is Record<string, unknown> & { id: string } => typeof item.id === "string")
      .map((item) => [item.id, item])
  );

  const merged = defaults.map((item) => ({
    ...item,
    ...(persistedById.get(item.id) ?? {}),
  })) as T[];

  const defaultIds = new Set(defaults.map((item) => item.id));
  const customItems = persistedItems.filter(
    (item): item is T =>
      typeof item.id === "string" &&
      !defaultIds.has(item.id)
  );

  return [...merged, ...customItems];
}

function normalizeProvider(provider: AIProviderConfig): AIProviderConfig {
  const defaults = DEFAULT_AI_PROVIDERS.find((item) => item.id === provider.id);
  const models = defaults?.models ?? provider.models ?? [];
  const hasSelectedModel = models.some((model) => model.id === provider.selectedModel);
  const selectedModel = hasSelectedModel ? provider.selectedModel : "auto";

  return {
    ...provider,
    models,
    apiKey: typeof provider.apiKey === "string" ? provider.apiKey : "",
    enabled: Boolean(provider.enabled),
    modelMode: provider.modelMode === "manual" ? "manual" : "auto",
    selectedModel,
    customModelId: typeof provider.customModelId === "string" ? provider.customModelId : "",
    priority: Number.isFinite(provider.priority) ? provider.priority : defaults?.priority ?? 99,
  };
}

function normalizeCapability(item: RuntimeCapability): RuntimeCapability {
  return {
    ...item,
    tags: Array.isArray(item.tags) ? item.tags : [],
    enabled: Boolean(item.enabled),
    installed: Boolean(item.installed),
    recommended: Boolean(item.recommended),
    risk: item.risk === "high" || item.risk === "medium" ? item.risk : "low",
  };
}

function normalizeRepository(item: RuntimeRepository): RuntimeRepository {
  const kind = item.kind === "skill" || item.kind === "mcp" ? item.kind : "mixed";

  return {
    ...item,
    kind,
    enabled: Boolean(item.enabled),
    trusted: Boolean(item.trusted),
    scriptHint: item.scriptHint ?? "manual",
  };
}

export function createDefaultAIRuntimeSettings(now = new Date()): AIRuntimeSettings {
  const timestamp = nowIso(now);

  return {
    version: AI_RUNTIME_SETTINGS_VERSION,
    providerMode: "auto",
    activeProviderId: "openai",
    providers: clone(DEFAULT_AI_PROVIDERS),
    skills: clone(DEFAULT_SKILLS),
    mcps: clone(DEFAULT_MCPS),
    repositories: clone(DEFAULT_REPOSITORIES),
    defaultSkillIds: DEFAULT_SKILLS.filter((item) => item.recommended).map((item) => item.id),
    defaultMcpIds: DEFAULT_MCPS.filter((item) => item.recommended).map((item) => item.id),
    autoRefreshCatalogs: false,
    allowRemoteMetadataRefresh: false,
    updatedAt: timestamp,
  };
}

export function hydrateAIRuntimeSettings(raw: unknown): AIRuntimeSettings {
  const defaults = createDefaultAIRuntimeSettings();

  if (!isObject(raw)) {
    return defaults;
  }

  const providers = mergeById(DEFAULT_AI_PROVIDERS, raw.providers)
    .map((item) => normalizeProvider(item as AIProviderConfig))
    .sort((a, b) => a.priority - b.priority);
  const providerIds = new Set(providers.map((provider) => provider.id));
  const activeProviderId =
    typeof raw.activeProviderId === "string" && providerIds.has(raw.activeProviderId as AIProviderId)
      ? raw.activeProviderId as AIProviderId
      : defaults.activeProviderId;

  return {
    ...defaults,
    providerMode: raw.providerMode === "manual" ? "manual" : "auto",
    activeProviderId,
    providers,
    skills: mergeById(DEFAULT_SKILLS, raw.skills).map((item) =>
      normalizeCapability(item as RuntimeCapability)
    ),
    mcps: mergeById(DEFAULT_MCPS, raw.mcps).map((item) =>
      normalizeCapability(item as RuntimeCapability)
    ),
    repositories: mergeById(DEFAULT_REPOSITORIES, raw.repositories).map((item) =>
      normalizeRepository(item as RuntimeRepository)
    ),
    defaultSkillIds: Array.isArray(raw.defaultSkillIds)
      ? raw.defaultSkillIds.filter((id): id is string => typeof id === "string")
      : defaults.defaultSkillIds,
    defaultMcpIds: Array.isArray(raw.defaultMcpIds)
      ? raw.defaultMcpIds.filter((id): id is string => typeof id === "string")
      : defaults.defaultMcpIds,
    autoRefreshCatalogs: Boolean(raw.autoRefreshCatalogs),
    allowRemoteMetadataRefresh: Boolean(raw.allowRemoteMetadataRefresh),
    lastCatalogRefreshAt: typeof raw.lastCatalogRefreshAt === "string"
      ? raw.lastCatalogRefreshAt
      : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : defaults.updatedAt,
  };
}

export function loadAIRuntimeSettings(): AIRuntimeSettings {
  if (typeof window === "undefined") {
    return createDefaultAIRuntimeSettings();
  }

  try {
    const storage = getCredentialStorage();
    if (!storage) return createDefaultAIRuntimeSettings();
    // A Pages build must never revive a secret that a pre-Pages build wrote to
    // durable browser storage for the same origin.
    if (isGithubPagesDeployment()) {
      window.localStorage.removeItem(AI_RUNTIME_SETTINGS_STORAGE_KEY);
    }
    const stored = storage.getItem(AI_RUNTIME_SETTINGS_STORAGE_KEY);
    return hydrateAIRuntimeSettings(stored ? JSON.parse(stored) : undefined);
  } catch {
    return createDefaultAIRuntimeSettings();
  }
}

export function saveAIRuntimeSettings(settings: AIRuntimeSettings) {
  if (typeof window === "undefined") {
    return;
  }

  const storage = getCredentialStorage();
  if (!storage) return;
  if (isGithubPagesDeployment()) {
    window.localStorage.removeItem(AI_RUNTIME_SETTINGS_STORAGE_KEY);
  }
  storage.setItem(
    AI_RUNTIME_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      ...settings,
      version: AI_RUNTIME_SETTINGS_VERSION,
      updatedAt: nowIso(),
    })
  );
}

export function maskApiKey(apiKey: string) {
  if (!apiKey) {
    return "Not configured";
  }

  if (apiKey.length <= 8) {
    return "••••••••";
  }

  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`;
}

export function applyRecommendedRuntimeDefaults(
  settings: AIRuntimeSettings,
  now = new Date()
): AIRuntimeSettings {
  const defaultSkillIds = new Set(settings.defaultSkillIds);
  const defaultMcpIds = new Set(settings.defaultMcpIds);

  return {
    ...settings,
    providerMode: "auto",
    skills: settings.skills.map((item) => ({
      ...item,
      enabled: defaultSkillIds.has(item.id),
      installed: item.installed || defaultSkillIds.has(item.id),
    })),
    mcps: settings.mcps.map((item) => ({
      ...item,
      enabled: defaultMcpIds.has(item.id),
      installed: item.installed || defaultMcpIds.has(item.id),
    })),
    updatedAt: nowIso(now),
  };
}

export function setRuntimeCapabilityEnabled(
  settings: AIRuntimeSettings,
  kind: RuntimeCapabilityKind,
  id: string,
  enabled: boolean
): AIRuntimeSettings {
  const key = kind === "skill" ? "skills" : "mcps";

  return {
    ...settings,
    [key]: settings[key].map((item) =>
      item.id === id
        ? {
            ...item,
            enabled,
            installed: item.installed || enabled,
          }
        : item
    ),
    updatedAt: nowIso(),
  };
}

export function setRuntimeCapabilityInstalled(
  settings: AIRuntimeSettings,
  kind: RuntimeCapabilityKind,
  id: string,
  installed: boolean
): AIRuntimeSettings {
  const key = kind === "skill" ? "skills" : "mcps";

  return {
    ...settings,
    [key]: settings[key].map((item) =>
      item.id === id
        ? {
            ...item,
            installed,
            enabled: installed ? item.enabled : false,
          }
        : item
    ),
    updatedAt: nowIso(),
  };
}

export function refreshRuntimeCatalog(
  settings: AIRuntimeSettings,
  now = new Date()
): AIRuntimeSettings {
  const timestamp = nowIso(now);

  return hydrateAIRuntimeSettings({
    ...settings,
    repositories: settings.repositories.map((repository) =>
      repository.enabled
        ? {
            ...repository,
            lastRefreshedAt: timestamp,
          }
        : repository
    ),
    skills: mergeById(DEFAULT_SKILLS, settings.skills).map((skill) => ({
      ...skill,
      updatedAt: timestamp,
    })),
    mcps: mergeById(DEFAULT_MCPS, settings.mcps).map((mcp) => ({
      ...mcp,
      updatedAt: timestamp,
    })),
    lastCatalogRefreshAt: timestamp,
    updatedAt: timestamp,
  });
}

export function searchRuntimeCatalog(
  settings: AIRuntimeSettings,
  query: string,
  kind: RuntimeCapabilityKind | "all" = "all"
): RuntimeCapability[] {
  const normalizedQuery = query.trim().toLowerCase();
  const items = [
    ...(kind === "mcp" ? [] : settings.skills),
    ...(kind === "skill" ? [] : settings.mcps),
  ];

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const haystack = [
      item.name,
      item.description,
      item.category,
      item.source,
      item.repositoryId,
      ...item.tags,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function makeRepositoryId(url: string) {
  const normalized = url.trim().toLowerCase().replace(/^https?:\/\//, "");
  const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `repo-${slug || Date.now()}`;
}

export function addRuntimeRepository(
  settings: AIRuntimeSettings,
  repository: Omit<RuntimeRepository, "id" | "enabled" | "trusted"> & {
    id?: string;
    enabled?: boolean;
    trusted?: boolean;
  }
): AIRuntimeSettings {
  const id = repository.id ?? makeRepositoryId(repository.url);
  const existing = new Set(settings.repositories.map((item) => item.id));

  if (existing.has(id)) {
    return settings;
  }

  return {
    ...settings,
    repositories: [
      ...settings.repositories,
      {
        ...repository,
        id,
        enabled: repository.enabled ?? true,
        trusted: repository.trusted ?? false,
      },
    ],
    updatedAt: nowIso(),
  };
}

export function removeRuntimeRepository(
  settings: AIRuntimeSettings,
  repositoryId: string
): AIRuntimeSettings {
  const protectedIds = new Set(DEFAULT_REPOSITORIES.map((item) => item.id));

  if (protectedIds.has(repositoryId)) {
    return settings;
  }

  return {
    ...settings,
    repositories: settings.repositories.filter((item) => item.id !== repositoryId),
    updatedAt: nowIso(),
  };
}
