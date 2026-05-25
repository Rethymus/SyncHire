/**
 * React Query Hooks
 * Custom hooks for data fetching with React Query
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { authAPI, resumeAPI, jdAPI, applicationAPI } from './api-client-consolidated';

// Helper to normalize error to string
function normalizeError(error: string | { message: string } | undefined): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  return error.message;
}

// Query keys for cache management
export const queryKeys = {
  auth: {
    user: () => ['auth', 'user'] as const,
    session: () => ['auth', 'session'] as const,
  },
  resumes: {
    all: () => ['resumes'] as const,
    detail: (id: string) => ['resumes', id] as const,
  },
  jobDescriptions: {
    all: () => ['jobDescriptions'] as const,
    detail: (id: string) => ['jobDescriptions', id] as const,
  },
  applications: {
    all: () => ['applications'] as const,
    detail: (id: string) => ['applications', id] as const,
  },
} as const;

// Auth hooks
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authAPI.login,
    onSuccess: (data) => {
      if (data.success && data.data?.token) {
        // Store token and update auth state
        queryClient.setQueryData(queryKeys.auth.session(), data);
      }
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authAPI.register,
    onSuccess: (data) => {
      if (data.success && data.data?.token) {
        queryClient.setQueryData(queryKeys.auth.session(), data);
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authAPI.logout,
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();
    },
  });
}

// Resume hooks
export function useResumes(options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.resumes.all(),
    queryFn: async () => {
      const result = await resumeAPI.list();
      if (!result.success) {
        throw new Error(normalizeError(result.error) || 'Failed to fetch resumes');
      }
      return result.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

export function useResume(id: string, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.resumes.detail(id),
    queryFn: async () => {
      const result = await resumeAPI.get(id);
      if (!result.success) {
        throw new Error(normalizeError(result.error) || 'Failed to fetch resume');
      }
      return result.data;
    },
    enabled: !!id,
    ...options,
  });
}

export function useCreateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeAPI.create,
    onSuccess: () => {
      // Invalidate and refetch resumes list
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all() });
    },
  });
}

export function useUpdateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => resumeAPI.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate both the list and specific resume
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.detail(variables.id) });
    },
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resumeAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all() });
    },
  });
}

// Job Description hooks
export function useAnalyzeJD() {
  return useMutation({
    mutationFn: jdAPI.analyze,
  });
}

export function useParseJD() {
  return useMutation({
    mutationFn: jdAPI.parse,
  });
}

// Application hooks
export function useApplications(options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.applications.all(),
    queryFn: async () => {
      const result = await applicationAPI.list();
      if (!result.success) {
        throw new Error(normalizeError(result.error) || 'Failed to fetch applications');
      }
      return result.data || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applicationAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applicationAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all() });
    },
  });
}
