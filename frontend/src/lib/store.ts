import { create } from "zustand";
import { UserData } from "./auth";

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
  status: "draft" | "applied" | "interview" | "offer" | "rejected" | "optimized" | "pending";
  jobId: string;
  resumeId: string;
  matchScore?: number;
  createdAt: Date;
  updatedAt: Date;
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

export interface OnboardingState {
  isOnboarded: boolean;
  currentStep: number;
  completedSteps: string[];
  skipped: boolean;
  startedAt?: Date;
  completedAt?: Date;
}

export type OnboardingStep =
  | "welcome"
  | "profile"
  | "resume-upload"
  | "first-jd"
  | "first-analysis"
  | "tutorial"
  | "complete";

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

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Onboarding state
  hasHydrated: boolean;
  hydrateFromStorage: () => void;
  onboarding: OnboardingState;
  setOnboardingStep: (step: number) => void;
  completeOnboardingStep: (step: string) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  startOnboarding: () => void;
  finishOnboarding: () => void;
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
  | "selectedTemplate"
  | "templateCustomization"
  | "onboarding"
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
  return {
    ...application,
    createdAt: parseDate(application.createdAt),
    updatedAt: parseDate(application.updatedAt),
  };
}

function hydrateJobDescription(jd: JobDescription): JobDescription {
  return {
    ...jd,
    createdAt: parseDate(jd.createdAt),
  };
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

  return {
    ...state,
    resumes,
    currentResume,
    applications,
    jobDescriptions,
    currentJD,
    onboarding: state.onboarding
      ? {
          ...state.onboarding,
          startedAt: state.onboarding.startedAt
            ? parseDate(state.onboarding.startedAt)
            : undefined,
          completedAt: state.onboarding.completedAt
            ? parseDate(state.onboarding.completedAt)
            : undefined,
        }
      : undefined,
  };
}

function loadPersistedState(): Partial<PersistedAppState> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
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
    selectedTemplate: state.selectedTemplate,
    templateCustomization: state.templateCustomization,
    onboarding: state.onboarding,
  };

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: STORAGE_VERSION,
      state: persisted,
    })
  );
}

function clearPersistedState() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
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
  sidebarOpen: true,
  hasHydrated: false,
  onboarding: {
    isOnboarded: false,
    currentStep: 0,
    completedSteps: [],
    skipped: false,
  },

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
      const resumes = state.resumes.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      );
      const currentResume =
        state.currentResume?.id === id
          ? { ...state.currentResume, ...updates }
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
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedTemplate', templateId);
    }
  },

  setTemplateCustomization: (customization) => {
    set((state) => {
      persistState({ ...state, templateCustomization: customization });
      return { templateCustomization: customization };
    });
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('templateCustomization', JSON.stringify(customization));
    }
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
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedTemplate', templateId);
      localStorage.setItem('templateCustomization', JSON.stringify(customization));
    }
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
      const applications = state.applications.map((app) =>
        app.id === id ? { ...app, ...updates } : app
      );
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
      const applications = state.applications.map((app) =>
        ids.includes(app.id) ? { ...app, ...updates } : app
      );
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

  // UI actions
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Onboarding actions
  hydrateFromStorage: () =>
    set((state) => {
      if (state.hasHydrated) {
        return state;
      }

      const persistedState = loadPersistedState();
      return {
        resumes: persistedState.resumes ?? state.resumes,
        currentResume: persistedState.currentResume ?? state.currentResume,
        applications: persistedState.applications ?? state.applications,
        jobDescriptions: persistedState.jobDescriptions ?? state.jobDescriptions,
        currentJD: persistedState.currentJD ?? state.currentJD,
        selectedTemplate: persistedState.selectedTemplate ?? state.selectedTemplate,
        templateCustomization:
          persistedState.templateCustomization ?? state.templateCustomization,
        onboarding: persistedState.onboarding ?? state.onboarding,
        hasHydrated: true,
      };
    }),

  setOnboardingStep: (step) =>
    set((state) => {
      const onboarding = { ...state.onboarding, currentStep: step };
      persistState({ ...state, onboarding });
      return { onboarding };
    }),

  completeOnboardingStep: (step) =>
    set((state) => {
      const onboarding = {
        ...state.onboarding,
        completedSteps: [...state.onboarding.completedSteps, step],
      };
      persistState({ ...state, onboarding });
      return { onboarding };
    }),

  skipOnboarding: () =>
    set((state) => {
      const onboarding = {
        ...state.onboarding,
        skipped: true,
        isOnboarded: true,
      };
      persistState({ ...state, onboarding });
      return { onboarding };
    }),

  resetOnboarding: () =>
    set((state) => {
      const onboarding = {
        isOnboarded: false,
        currentStep: 0,
        completedSteps: [],
        skipped: false,
      };
      persistState({ ...state, onboarding });
      return { onboarding };
    }),

  startOnboarding: () =>
    set((state) => {
      const onboarding = {
        ...state.onboarding,
        startedAt: new Date(),
        currentStep: 1,
      };
      persistState({ ...state, onboarding });
      return { onboarding };
    }),

  finishOnboarding: () =>
    set((state) => {
      const onboarding = {
        ...state.onboarding,
        isOnboarded: true,
        completedAt: new Date(),
        currentStep: 7,
      };
      persistState({ ...state, onboarding });
      return { onboarding };
    }),
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
