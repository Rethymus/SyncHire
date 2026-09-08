import { create } from "zustand";
import { UserData } from "./auth";
import {
  type BrowserFillSession,
  type CandidateRoleCard,
  type ProfileLearningUpdate,
  applyApprovedProfileLearning,
  createDefaultCandidateRoleCard,
} from "./browser-fill-assistant";
import {
  canonicalizeStatus,
  statusImpliesSent,
  type ApplicationStatus,
} from "./status-vocabulary";
import {
  getPlatformStorageItem,
  migrateWebStorageItemToNative,
  removePlatformStorageItem,
  setPlatformStorageItem,
} from "./platform-storage";

export interface Resume {
  id: string;
  name: string;
  content: string;
  uploadedAt: Date;
  fileUrl?: string;
  skills?: string[];
  experience?: string[];
}

export interface JobApplication {
  id: string;
  companyName: string;
  position: string;
  /**
   * The canonical 12-value ApplicationStatus (openapi). Legacy persisted
   * values (draft/optimized/pending) are normalized on hydration — see
   * lib/status-vocabulary.ts.
   */
  status: ApplicationStatus;
  jobId: string;
  resumeId: string;
  matchScore?: number;
  createdAt: Date;
  updatedAt: Date;
  /**
   * When the application was first marked as sent out (status entered an
   * applied-or-beyond value). Stamped by updateApplication so the progress
   * page can date 标记投递 accurately instead of approximating from
   * updatedAt (docs/DESIGN_ETHICS.md §4, measurement honesty).
   */
  appliedAt?: Date | null;
  tags?: string[];
}

export interface JobDescription {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string[];
  skills: string[];
  createdAt: Date;
}

// The historical onboarding wizard was removed; its store slice went with
// it. The dashboard's 开始使用 checklist is the first-run guidance now.

/**
 * Rejection-recovery micro-flow (RejectionRecoveryCard). One of the three
 * autonomy-supportive next-step choices the card offers.
 */
export type RecoveryActionChoice = "tune_resume" | "switch_channel" | "rest";

/** Per-application record of the rejection-recovery card being handled. */
export interface RejectionRecoveryEntry {
  applicationId: string;
  /** True once the user explicitly collapsed the card. */
  dismissed: boolean;
  /** ISO string (not a Date) so persistence needs no date hydration. */
  dismissedAt?: string | null;
  chosenAction?: RecoveryActionChoice | null;
  /** ISO string; present once the user picked a next step. */
  chosenAt?: string | null;
}

/**
 * Per-entity sync bookkeeping (docs/STORE_API_SYNC_DESIGN.md §6 Phase 0).
 * Keyed by entity id across resumes, jobDescriptions and applications — ids
 * are client-UUIDs unique per type, and the ID is the join key on both
 * sides (§5.4), so one flat record works. Timestamps are ISO strings (not
 * Dates) so persistence needs no date hydration, same choice as
 * RejectionRecoveryEntry.
 */
export interface SyncMetaEntry {
  /** Where the row was born: a local UI write or a backend pull. */
  origin: "local" | "remote";
  /** Backend `updated_at` as of the last pull/push, for LWW comparison. */
  remoteUpdatedAt?: string;
  /** When the local row was last known to match the backend. */
  lastSyncedAt?: string;
}

/**
 * A locally deleted entity whose delete must be replayed to the backend
 * before it can be forgotten (§6 Phase 1 replays these as DELETE calls).
 */
export interface SyncTombstone {
  id: string;
  entityType: "resume" | "jd" | "application";
  deletedAt: string;
}

interface ToastAction {
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  showInfo: (title: string, description?: string) => void;
}

interface AppState {
  // Auth state
  user: UserData | null;
  isAuthenticated: boolean;
  setUser: (user: UserData | null) => void;
  logout: () => void;

  // Resume state
  resumes: Resume[];
  currentResume: Resume | null;
  addResume: (resume: Resume) => void;
  updateResume: (id: string, updates: Partial<Resume>) => void;
  setResumes: (resumes: Resume[]) => void;
  deleteResume: (id: string) => void;
  setCurrentResume: (resume: Resume | null) => void;

  // Toast actions
  showToast: (action: ToastAction) => void;

  // Template state
  selectedTemplate: string;
  templateCustomization: Record<string, any>;
  setSelectedTemplate: (templateId: string) => void;
  setTemplateCustomization: (customization: Record<string, any>) => void;
  saveTemplatePreferences: (templateId: string, customization: Record<string, any>) => void;

  // Job application state
  applications: JobApplication[];
  addApplication: (application: JobApplication) => void;
  setApplications: (applications: JobApplication[]) => void;
  updateApplication: (id: string, updates: Partial<JobApplication>) => void;
  deleteApplication: (id: string) => void;
  batchUpdateApplications: (ids: string[], updates: Partial<JobApplication>) => void;
  batchDeleteApplications: (ids: string[]) => void;

  // Job description state
  jobDescriptions: JobDescription[];
  currentJD: JobDescription | null;
  addJobDescription: (jd: JobDescription) => void;
  setJobDescriptions: (jds: JobDescription[]) => void;
  setCurrentJD: (jd: JobDescription | null) => void;

  // Local-first profile and browser fill assistant state
  candidateProfile: CandidateRoleCard;
  browserFillSessions: BrowserFillSession[];
  updateCandidateProfile: (updates: Partial<CandidateRoleCard>) => void;
  addBrowserFillSession: (session: BrowserFillSession) => void;
  updateBrowserFillSession: (id: string, updates: Partial<BrowserFillSession>) => void;
  approveProfileLearning: (sessionId: string, updates: ProfileLearningUpdate[]) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Rejection-recovery state (dismissible guided card on the progress page)
  rejectionRecovery: Record<string, RejectionRecoveryEntry>;
  dismissRejectionRecovery: (applicationId: string) => void;
  chooseRecoveryAction: (applicationId: string, action: RecoveryActionChoice) => void;

  // Sync bookkeeping (docs/STORE_API_SYNC_DESIGN.md §6 Phase 0): the store
  // becomes sync-capable without syncing anything yet. No actions in Phase 0
  // — the Phase 1 sync engine is the sole writer.
  syncMeta: Record<string, SyncMetaEntry>;
  tombstones: SyncTombstone[];

  hasHydrated: boolean;
  hydrateFromStorage: () => Promise<void>;
}

const STORAGE_KEY = "synchire-storage";
const STORAGE_VERSION = 1;

type PersistedAppState = Pick<
  AppState,
  | "resumes"
  | "currentResume"
  | "applications"
  | "jobDescriptions"
  | "currentJD"
  | "candidateProfile"
  | "browserFillSessions"
  | "selectedTemplate"
  | "templateCustomization"
  | "rejectionRecovery"
  | "syncMeta"
  | "tombstones"
>;

function parseDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  return fallback;
}

function hydrateResume(resume: Resume): Resume {
  return {
    ...resume,
    uploadedAt: parseDate(resume.uploadedAt),
  };
}

function hydrateApplication(application: JobApplication): JobApplication {
  const normalized: JobApplication = {
    ...application,
    // Legacy persisted statuses (draft/optimized/pending) map forward here,
    // so pre-canonical local data keeps working without a manual migration.
    status: canonicalizeStatus(application.status),
    createdAt: parseDate(application.createdAt),
    updatedAt: parseDate(application.updatedAt),
    appliedAt: application.appliedAt ? parseDate(application.appliedAt) : null,
  };
  // Backfill: records sent out before appliedAt existed get the documented
  // approximation (updatedAt) so the progress page stops re-deriving it.
  if (normalized.appliedAt === null && statusImpliesSent(normalized.status)) {
    normalized.appliedAt = normalized.updatedAt;
  }
  return normalized;
}

function hydrateJobDescription(jd: JobDescription): JobDescription {
  return {
    ...jd,
    createdAt: parseDate(jd.createdAt),
  };
}

function hydrateCandidateProfile(profile: CandidateRoleCard): CandidateRoleCard {
  return {
    ...createDefaultCandidateRoleCard(),
    ...profile,
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    updatedAt: parseDate(profile.updatedAt),
  };
}

function hydrateBrowserFillSession(session: BrowserFillSession): BrowserFillSession {
  return {
    ...session,
    createdAt: parseDate(session.createdAt),
    suggestions: Array.isArray(session.suggestions) ? session.suggestions : [],
    learnedUpdates: Array.isArray(session.learnedUpdates) ? session.learnedUpdates : [],
  };
}

function hydrateRejectionRecovery(
  value: unknown
): Record<string, RejectionRecoveryEntry> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries: Record<string, RejectionRecoveryEntry> = {};
  for (const [applicationId, raw] of Object.entries(
    value as Record<string, unknown>
  )) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as Partial<RejectionRecoveryEntry>;
    if (typeof candidate.dismissed !== "boolean") continue;
    entries[applicationId] = {
      applicationId,
      dismissed: candidate.dismissed,
      dismissedAt:
        typeof candidate.dismissedAt === "string" ? candidate.dismissedAt : null,
      chosenAction:
        candidate.chosenAction === "tune_resume" ||
        candidate.chosenAction === "switch_channel" ||
        candidate.chosenAction === "rest"
          ? candidate.chosenAction
          : null,
      chosenAt:
        typeof candidate.chosenAt === "string" ? candidate.chosenAt : null,
    };
  }
  return entries;
}

function hydrateSyncMeta(
  persisted: unknown,
  entityIds: string[]
): Record<string, SyncMetaEntry> {
  const meta: Record<string, SyncMetaEntry> = {};

  // Validate the persisted slice entry-by-entry (same defensive style as
  // hydrateRejectionRecovery) so a corrupt row drops instead of crashing.
  if (persisted && typeof persisted === "object" && !Array.isArray(persisted)) {
    for (const [id, raw] of Object.entries(persisted as Record<string, unknown>)) {
      if (!raw || typeof raw !== "object") continue;
      const candidate = raw as Partial<SyncMetaEntry>;
      if (candidate.origin !== "local" && candidate.origin !== "remote") continue;
      meta[id] = {
        origin: candidate.origin,
        remoteUpdatedAt:
          typeof candidate.remoteUpdatedAt === "string"
            ? candidate.remoteUpdatedAt
            : undefined,
        lastSyncedAt:
          typeof candidate.lastSyncedAt === "string"
            ? candidate.lastSyncedAt
            : undefined,
      };
    }
  }

  // Backfill: rows persisted before sync existed are local-born by
  // definition, so old data migrates for free without a STORAGE_VERSION
  // bump — same pattern as the rejectionRecovery hydration above and the
  // legacy-status normalization in hydrateApplication.
  for (const id of entityIds) {
    if (!meta[id]) {
      meta[id] = { origin: "local" };
    }
  }

  return meta;
}

function hydrateTombstones(persisted: unknown): SyncTombstone[] {
  if (!Array.isArray(persisted)) {
    return [];
  }

  const tombstones: SyncTombstone[] = [];
  for (const raw of persisted) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as Partial<SyncTombstone>;
    if (
      typeof candidate.id !== "string" ||
      (candidate.entityType !== "resume" &&
        candidate.entityType !== "jd" &&
        candidate.entityType !== "application") ||
      typeof candidate.deletedAt !== "string"
    ) {
      continue;
    }
    tombstones.push({
      id: candidate.id,
      entityType: candidate.entityType,
      deletedAt: candidate.deletedAt,
    });
  }
  return tombstones;
}

function hydratePersistedState(state: Partial<PersistedAppState>): Partial<PersistedAppState> {
  const resumes = Array.isArray(state.resumes)
    ? state.resumes.map(hydrateResume)
    : [];
  const currentResume = state.currentResume
    ? hydrateResume(state.currentResume)
    : null;
  const applications = Array.isArray(state.applications)
    ? state.applications.map(hydrateApplication)
    : [];
  const jobDescriptions = Array.isArray(state.jobDescriptions)
    ? state.jobDescriptions.map(hydrateJobDescription)
    : [];
  const currentJD = state.currentJD
    ? hydrateJobDescription(state.currentJD)
    : null;
  const candidateProfile = state.candidateProfile
    ? hydrateCandidateProfile(state.candidateProfile)
    : createDefaultCandidateRoleCard();
  const browserFillSessions = Array.isArray(state.browserFillSessions)
    ? state.browserFillSessions.map(hydrateBrowserFillSession)
    : [];

  return {
    ...state,
    resumes,
    currentResume,
    applications,
    jobDescriptions,
    currentJD,
    candidateProfile,
    browserFillSessions,
    rejectionRecovery: hydrateRejectionRecovery(state.rejectionRecovery),
    syncMeta: hydrateSyncMeta(
      state.syncMeta,
      [
        ...resumes.map((resume) => resume.id),
        ...jobDescriptions.map((jd) => jd.id),
        ...applications.map((application) => application.id),
      ]
    ),
    tombstones: hydrateTombstones(state.tombstones),
  };
}

async function loadPersistedState(): Promise<Partial<PersistedAppState>> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    await migrateWebStorageItemToNative(STORAGE_KEY);
    const stored = await getPlatformStorageItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as {
      version?: number;
      state?: Partial<PersistedAppState>;
    };

    return hydratePersistedState(parsed.state ?? {});
  } catch {
    return {};
  }
}

function persistState(state: AppState) {
  if (typeof window === "undefined") {
    return;
  }

  const persisted: PersistedAppState = {
    resumes: state.resumes,
    currentResume: state.currentResume,
    applications: state.applications,
    jobDescriptions: state.jobDescriptions,
    currentJD: state.currentJD,
    candidateProfile: state.candidateProfile,
    browserFillSessions: state.browserFillSessions,
    selectedTemplate: state.selectedTemplate,
    templateCustomization: state.templateCustomization,
    rejectionRecovery: state.rejectionRecovery,
    syncMeta: state.syncMeta,
    tombstones: state.tombstones,
  };

  const payload = JSON.stringify({
    version: STORAGE_VERSION,
    state: persisted,
  });

  // Synchronous mirror first: setPlatformStorageItem awaits dynamic imports
  // (platform probe) before touching storage, so a hard navigation/refresh
  // could previously outrun the write and the next page would rehydrate the
  // empty state — losing just-added data. The platform bridge then writes
  // the identical payload for native shells (idempotent).
  try {
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // Storage full or unavailable; the async bridge below is the fallback.
  }

  void setPlatformStorageItem(STORAGE_KEY, payload);
}

function clearPersistedState() {
  void removePlatformStorageItem(STORAGE_KEY);
}

// Main store without persistence for sensitive data
export const useAppStore = create<AppState>()((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  resumes: [],
  currentResume: null,
  selectedTemplate: "minimal",
  templateCustomization: {},
  applications: [],
  jobDescriptions: [],
  currentJD: null,
  candidateProfile: createDefaultCandidateRoleCard(),
  browserFillSessions: [],
  sidebarOpen: true,
  hasHydrated: false,
  rejectionRecovery: {},
  syncMeta: {},
  tombstones: [],

  // Auth actions
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user
    }),

  logout: () =>
    set((state) => {
      const nextState = {
        ...state,
        user: null,
        isAuthenticated: false,
        resumes: [],
        currentResume: null,
        applications: [],
        jobDescriptions: [],
        currentJD: null,
        rejectionRecovery: {},
        // Sync bookkeeping follows the entities it describes: the persisted
        // state is cleared below, so the in-memory slice resets too.
        syncMeta: {},
        tombstones: [],
      };
      clearPersistedState();
      return nextState;
    }),

  // Resume actions
  addResume: (resume) =>
    set((state) => {
      const nextState = {
        ...state,
        resumes: [...state.resumes, resume],
        currentResume: resume,
      };
      state.showToast?.({
        showSuccess: () => {},
        showError: () => {},
        showInfo: () => {},
      });
      persistState(nextState);
      return {
        resumes: nextState.resumes,
        currentResume: nextState.currentResume,
      };
    }),

  updateResume: (id, updates) =>
    set((state) => {
      // Resumes carry no updatedAt — uploadedAt is their only timestamp, so
      // updates bump it to keep entity-level LWW computable
      // (docs/STORE_API_SYNC_DESIGN.md §5.1/§2.4). Stamped once so the array
      // row and currentResume agree on the same instant.
      const uploadedAt = new Date();
      const resumes = state.resumes.map((r) =>
        r.id === id ? { ...r, ...updates, uploadedAt } : r
      );
      const currentResume =
        state.currentResume?.id === id
          ? { ...state.currentResume, ...updates, uploadedAt }
          : state.currentResume;
      persistState({ ...state, resumes, currentResume });
      return { resumes, currentResume };
    }),

  setResumes: (resumes: Resume[]) =>
    set((state) => {
      const currentResume =
        state.currentResume && resumes.some((resume) => resume.id === state.currentResume?.id)
          ? state.currentResume
          : null;
      persistState({ ...state, resumes, currentResume });
      return { resumes, currentResume };
    }),

  deleteResume: (id) =>
    set((state) => {
      const resumes = state.resumes.filter((r) => r.id !== id);
      const currentResume =
        state.currentResume?.id === id ? null : state.currentResume;
      persistState({ ...state, resumes, currentResume });
      return { resumes, currentResume };
    }),

  setCurrentResume: (resume) =>
    set((state) => {
      persistState({ ...state, currentResume: resume });
      return { currentResume: resume };
    }),

  // Template actions
  setSelectedTemplate: (templateId) => {
    set((state) => {
      persistState({ ...state, selectedTemplate: templateId });
      return { selectedTemplate: templateId };
    });
    void setPlatformStorageItem("selectedTemplate", templateId);
  },

  setTemplateCustomization: (customization) => {
    set((state) => {
      persistState({ ...state, templateCustomization: customization });
      return { templateCustomization: customization };
    });
    void setPlatformStorageItem(
      "templateCustomization",
      JSON.stringify(customization)
    );
  },

  saveTemplatePreferences: (templateId, customization) => {
    set((state) => {
      persistState({
        ...state,
        selectedTemplate: templateId,
        templateCustomization: customization,
      });
      return {
        selectedTemplate: templateId,
        templateCustomization: customization,
      };
    });
    void setPlatformStorageItem("selectedTemplate", templateId);
    void setPlatformStorageItem(
      "templateCustomization",
      JSON.stringify(customization)
    );
  },

  // Application actions
  addApplication: (application) =>
    set((state) => {
      const applications = [...state.applications, application];
      persistState({ ...state, applications });
      return { applications };
    }),

  setApplications: (applications) =>
    set((state) => {
      persistState({ ...state, applications });
      return { applications };
    }),

  updateApplication: (id, updates) =>
    set((state) => {
      // Stamped once so every touched field shares the same mutation instant.
      const updatedAt = new Date();
      const applications = state.applications.map((app) => {
        if (app.id !== id) return app;
        // updatedAt must actually move on update or entity-level LWW cannot
        // tell a local edit from a stale copy (docs/STORE_API_SYNC_DESIGN.md
        // §5.1).
        const next: JobApplication = { ...app, ...updates, updatedAt };
        // Measurement honesty (docs/DESIGN_ETHICS.md §4): stamp the moment a
        // status first proves the application was sent out, so 标记投递 is
        // dated by the transition, not approximated from updatedAt forever.
        if (updates.status && next.appliedAt == null && statusImpliesSent(next.status)) {
          next.appliedAt = updatedAt;
        }
        return next;
      });
      persistState({ ...state, applications });
      return { applications };
    }),

  deleteApplication: (id) =>
    set((state) => {
      const applications = state.applications.filter((app) => app.id !== id);
      persistState({ ...state, applications });
      return { applications };
    }),

  // Toast actions (optional - can be set by components to enable toast notifications)
  showToast: () => {},

  batchUpdateApplications: (ids, updates) =>
    set((state) => {
      // Same LWW stamp as updateApplication (§5.1), shared across the batch.
      const updatedAt = new Date();
      const applications = state.applications.map((app) => {
        if (!ids.includes(app.id)) return app;
        const next: JobApplication = { ...app, ...updates, updatedAt };
        if (updates.status && next.appliedAt == null && statusImpliesSent(next.status)) {
          next.appliedAt = updatedAt;
        }
        return next;
      });
      persistState({ ...state, applications });
      return { applications };
    }),

  batchDeleteApplications: (ids) =>
    set((state) => {
      const applications = state.applications.filter((app) => !ids.includes(app.id));
      persistState({ ...state, applications });
      return { applications };
    }),

  // Job description actions
  addJobDescription: (jd) =>
    set((state) => {
      const jobDescriptions = [...state.jobDescriptions, jd];
      const currentJD = jd;
      persistState({ ...state, jobDescriptions, currentJD });
      return { jobDescriptions, currentJD };
    }),

  setJobDescriptions: (jds) =>
    set((state) => {
      const currentJD =
        state.currentJD && jds.some((jd) => jd.id === state.currentJD?.id)
          ? state.currentJD
          : null;
      persistState({ ...state, jobDescriptions: jds, currentJD });
      return { jobDescriptions: jds, currentJD };
    }),

  setCurrentJD: (jd) =>
    set((state) => {
      persistState({ ...state, currentJD: jd });
      return { currentJD: jd };
    }),

  updateCandidateProfile: (updates) =>
    set((state) => {
      const candidateProfile = {
        ...state.candidateProfile,
        ...updates,
        skills: updates.skills ?? state.candidateProfile.skills,
        projects: updates.projects ?? state.candidateProfile.projects,
        updatedAt: new Date(),
      };
      persistState({ ...state, candidateProfile });
      return { candidateProfile };
    }),

  addBrowserFillSession: (session) =>
    set((state) => {
      const browserFillSessions = [session, ...state.browserFillSessions].slice(0, 12);
      persistState({ ...state, browserFillSessions });
      return { browserFillSessions };
    }),

  updateBrowserFillSession: (id, updates) =>
    set((state) => {
      const browserFillSessions = state.browserFillSessions.map((session) =>
        session.id === id ? { ...session, ...updates } : session
      );
      persistState({ ...state, browserFillSessions });
      return { browserFillSessions };
    }),

  approveProfileLearning: (sessionId, updates) =>
    set((state) => {
      const candidateProfile = applyApprovedProfileLearning(
        state.candidateProfile,
        updates
      );
      const browserFillSessions = state.browserFillSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              status: "learned" as const,
              learnedUpdates: updates,
            }
          : session
      );
      persistState({ ...state, candidateProfile, browserFillSessions });
      return { candidateProfile, browserFillSessions };
    }),

  // UI actions
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Rejection-recovery actions (additive slice; keyed by application id)
  dismissRejectionRecovery: (applicationId) =>
    set((state) => {
      const existing = state.rejectionRecovery[applicationId];
      const rejectionRecovery: Record<string, RejectionRecoveryEntry> = {
        ...state.rejectionRecovery,
        [applicationId]: {
          applicationId,
          dismissed: true,
          dismissedAt: new Date().toISOString(),
          chosenAction: existing?.chosenAction ?? null,
          chosenAt: existing?.chosenAt ?? null,
        },
      };
      persistState({ ...state, rejectionRecovery });
      return { rejectionRecovery };
    }),

  chooseRecoveryAction: (applicationId, action) =>
    set((state) => {
      const existing = state.rejectionRecovery[applicationId];
      const rejectionRecovery: Record<string, RejectionRecoveryEntry> = {
        ...state.rejectionRecovery,
        [applicationId]: {
          applicationId,
          dismissed: existing?.dismissed ?? false,
          dismissedAt: existing?.dismissedAt ?? null,
          chosenAction: action,
          chosenAt: new Date().toISOString(),
        },
      };
      persistState({ ...state, rejectionRecovery });
      return { rejectionRecovery };
    }),

  // Onboarding actions
  hydrateFromStorage: async () => {
    const persistedState = await loadPersistedState();

    set((state) => {
      if (state.hasHydrated) {
        return state;
      }

      return {
        resumes: persistedState.resumes ?? state.resumes,
        currentResume: persistedState.currentResume ?? state.currentResume,
        applications: persistedState.applications ?? state.applications,
        jobDescriptions: persistedState.jobDescriptions ?? state.jobDescriptions,
        currentJD: persistedState.currentJD ?? state.currentJD,
        candidateProfile: persistedState.candidateProfile ?? state.candidateProfile,
        browserFillSessions:
          persistedState.browserFillSessions ?? state.browserFillSessions,
        selectedTemplate: persistedState.selectedTemplate ?? state.selectedTemplate,
        templateCustomization:
          persistedState.templateCustomization ?? state.templateCustomization,
        rejectionRecovery:
          persistedState.rejectionRecovery ?? state.rejectionRecovery,
        syncMeta: persistedState.syncMeta ?? state.syncMeta,
        tombstones: persistedState.tombstones ?? state.tombstones,
        hasHydrated: true,
      };
    });
  },

}));

// Separate UI-only store with persistence for non-sensitive data
interface UIState {
  sidebarOpen: boolean;
  theme: "light" | "dark";
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;
}

// Note: useUIStore with persist middleware causes SSR issues
// Use useAppStore for now until proper SSR-safe persistence is implemented
export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  theme: "light",
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
}));
