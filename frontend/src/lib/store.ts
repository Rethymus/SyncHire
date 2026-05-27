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
  onboarding: OnboardingState;
  setOnboardingStep: (step: number) => void;
  completeOnboardingStep: (step: string) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  startOnboarding: () => void;
  finishOnboarding: () => void;
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
    set({
      user: null,
      isAuthenticated: false,
      resumes: [],
      currentResume: null,
      applications: [],
      jobDescriptions: [],
      currentJD: null,
    }),

  // Resume actions
  addResume: (resume) =>
    set((state) => {
      state.showToast?.({
        showSuccess: () => {},
        showError: () => {},
        showInfo: () => {},
      });
      return {
        resumes: [...state.resumes, resume],
        currentResume: resume,
      };
    }),

  updateResume: (id, updates) =>
    set((state) => ({
      resumes: state.resumes.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
      currentResume:
        state.currentResume?.id === id
          ? { ...state.currentResume, ...updates }
          : state.currentResume,
    })),

  setResumes: (resumes: Resume[]) => set({ resumes }),

  deleteResume: (id) =>
    set((state) => ({
      resumes: state.resumes.filter((r) => r.id !== id),
      currentResume:
        state.currentResume?.id === id ? null : state.currentResume,
    })),

  setCurrentResume: (resume) => set({ currentResume: resume }),

  // Template actions
  setSelectedTemplate: (templateId) => {
    set({ selectedTemplate: templateId });
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedTemplate', templateId);
    }
  },

  setTemplateCustomization: (customization) => {
    set({ templateCustomization: customization });
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('templateCustomization', JSON.stringify(customization));
    }
  },

  saveTemplatePreferences: (templateId, customization) => {
    set({
      selectedTemplate: templateId,
      templateCustomization: customization
    });
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedTemplate', templateId);
      localStorage.setItem('templateCustomization', JSON.stringify(customization));
    }
  },

  // Application actions
  addApplication: (application) =>
    set((state) => ({
      applications: [...state.applications, application],
    })),

  updateApplication: (id, updates) =>
    set((state) => ({
      applications: state.applications.map((app) =>
        app.id === id ? { ...app, ...updates } : app
      ),
    })),

  deleteApplication: (id) =>
    set((state) => ({
      applications: state.applications.filter((app) => app.id !== id),
    })),

  // Toast actions (optional - can be set by components to enable toast notifications)
  showToast: () => {},

  batchUpdateApplications: (ids, updates) =>
    set((state) => ({
      applications: state.applications.map((app) =>
        ids.includes(app.id) ? { ...app, ...updates } : app
      ),
    })),

  batchDeleteApplications: (ids) =>
    set((state) => ({
      applications: state.applications.filter((app) => !ids.includes(app.id)),
    })),

  // Job description actions
  addJobDescription: (jd) =>
    set((state) => ({
      jobDescriptions: [...state.jobDescriptions, jd],
      currentJD: jd,
    })),

  setJobDescriptions: (jds) =>
    set({ jobDescriptions: jds }),

  setCurrentJD: (jd) => set({ currentJD: jd }),

  // UI actions
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Onboarding actions
  setOnboardingStep: (step) =>
    set((state) => ({
      onboarding: { ...state.onboarding, currentStep: step },
    })),

  completeOnboardingStep: (step) =>
    set((state) => ({
      onboarding: {
        ...state.onboarding,
        completedSteps: [...state.onboarding.completedSteps, step],
      },
    })),

  skipOnboarding: () =>
    set((state) => ({
      onboarding: {
        ...state.onboarding,
        skipped: true,
        isOnboarded: true,
      },
    })),

  resetOnboarding: () =>
    set({
      onboarding: {
        isOnboarded: false,
        currentStep: 0,
        completedSteps: [],
        skipped: false,
      },
    }),

  startOnboarding: () =>
    set((state) => ({
      onboarding: {
        ...state.onboarding,
        startedAt: new Date(),
        currentStep: 1,
      },
    })),

  finishOnboarding: () =>
    set((state) => ({
      onboarding: {
        ...state.onboarding,
        isOnboarded: true,
        completedAt: new Date(),
        currentStep: 7,
      },
    })),
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
