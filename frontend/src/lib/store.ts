import { create } from "zustand";

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
  status: "draft" | "applied" | "interview" | "offer" | "rejected";
  jobId: string;
  resumeId: string;
  matchScore?: number;
  createdAt: Date;
  updatedAt: Date;
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

interface AppState {
  // Resume state
  resumes: Resume[];
  currentResume: Resume | null;
  addResume: (resume: Resume) => void;
  updateResume: (id: string, updates: Partial<Resume>) => void;
  deleteResume: (id: string) => void;
  setCurrentResume: (resume: Resume | null) => void;

  // Job application state
  applications: JobApplication[];
  addApplication: (application: JobApplication) => void;
  updateApplication: (id: string, updates: Partial<JobApplication>) => void;
  deleteApplication: (id: string) => void;

  // Job description state
  jobDescriptions: JobDescription[];
  currentJD: JobDescription | null;
  addJobDescription: (jd: JobDescription) => void;
  setCurrentJD: (jd: JobDescription | null) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

// Main store without persistence for sensitive data
export const useAppStore = create<AppState>()((set) => ({
  // Initial state
  resumes: [],
  currentResume: null,
  applications: [],
  jobDescriptions: [],
  currentJD: null,
  sidebarOpen: true,

  // Resume actions
  addResume: (resume) =>
    set((state) => ({
      resumes: [...state.resumes, resume],
      currentResume: resume,
    })),

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

  deleteResume: (id) =>
    set((state) => ({
      resumes: state.resumes.filter((r) => r.id !== id),
      currentResume:
        state.currentResume?.id === id ? null : state.currentResume,
    })),

  setCurrentResume: (resume) => set({ currentResume: resume }),

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

  // Job description actions
  addJobDescription: (jd) =>
    set((state) => ({
      jobDescriptions: [...state.jobDescriptions, jd],
      currentJD: jd,
    })),

  setCurrentJD: (jd) => set({ currentJD: jd }),

  // UI actions
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
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
