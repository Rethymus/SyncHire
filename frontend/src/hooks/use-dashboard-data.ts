/**
 * Custom hook for dashboard data fetching
 *
 * Separates data fetching logic from presentation logic
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client-unified";
import { logger, LogCategory } from "@/lib/logger";

export interface DashboardStats {
  resumes: number;
  jobDescriptions: number;
  applications: number;
  interviews: number;
}

export interface RecentApplication {
  id: string;
  position: string;
  company: string;
  status: string;
  created_at: string;
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>({
    resumes: 0,
    jobDescriptions: 0,
    applications: 0,
    interviews: 0,
  });
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [resumesData, jdsData, applicationsData] = await Promise.all([
        apiClient.resume.list(),
        apiClient.jd.list(),
        apiClient.application.list(),
      ]);

      // Calculate stats
      const interviewsCount = applicationsData.filter(
        (app: any) => app.status === "interview"
      ).length;

      setStats({
        resumes: resumesData.length || 0,
        jobDescriptions: jdsData.length || 0,
        applications: applicationsData.length || 0,
        interviews: interviewsCount,
      });

      // Get recent applications (sorted by date, top 5)
      const sorted = applicationsData
        .sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5);

      setRecentApplications(sorted);

      logger.info(LogCategory.API, "Dashboard data loaded successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(errorMessage);
      logger.error(LogCategory.API, "Failed to load dashboard data", err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      await loadData();
    };
    loadInitialData();
  }, [loadData]);

  return {
    stats,
    recentApplications,
    loading,
    error,
    refetch: loadData,
  };
}
