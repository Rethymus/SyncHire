import { JobApplication } from "@/lib/store";

export interface MatchRankingOptions {
  sortBy?: "matchScore" | "updatedAt" | "createdAt" | "position";
  sortOrder?: "asc" | "desc";
  filterBy?: {
    matchLevel?: "excellent" | "good" | "fair" | "poor" | "all";
    status?: string;
    minMatchScore?: number;
  };
}

export interface RankedApplication extends JobApplication {
  rank?: number;
  matchLevel?: "excellent" | "good" | "fair" | "poor";
  percentile?: number;
}

/**
 * Calculate match level from score
 */
export function getMatchLevel(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

/**
 * Rank and sort applications by match score
 */
export function rankApplications(
  applications: JobApplication[],
  options: MatchRankingOptions = {}
): RankedApplication[] {
  const {
    sortBy = "matchScore",
    sortOrder = "desc",
    filterBy = { matchLevel: "all" },
  } = options;

  // Filter applications
  let filtered = applications.filter((app) => {
    // Filter by match level
    if (filterBy.matchLevel && filterBy.matchLevel !== "all") {
      if (!app.matchScore) return false;
      const level = getMatchLevel(app.matchScore);
      if (level !== filterBy.matchLevel) return false;
    }

    // Filter by status
    if (filterBy.status && app.status !== filterBy.status) {
      return false;
    }

    // Filter by minimum match score
    if (filterBy.minMatchScore && (!app.matchScore || app.matchScore < filterBy.minMatchScore)) {
      return false;
    }

    return true;
  });

  // Sort applications
  const sorted = filtered.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "matchScore":
        // Put applications with match scores first
        const aScore = a.matchScore ?? -1;
        const bScore = b.matchScore ?? -1;
        comparison = aScore - bScore;
        break;
      case "updatedAt":
        comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
        break;
      case "createdAt":
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case "position":
        comparison = a.position.localeCompare(b.position);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Add ranking information
  const ranked = sorted.map((app, index) => {
    const matchScore = app.matchScore;
    const matchLevel = matchScore !== undefined ? getMatchLevel(matchScore) : undefined;

    // Calculate percentile among applications with match scores
    let percentile: number | undefined;
    if (matchScore !== undefined) {
      const appsWithScores = applications.filter((a) => a.matchScore !== undefined);
      const betterOrEqual = appsWithScores.filter((a) => (a.matchScore ?? 0) <= matchScore).length;
      percentile = (betterOrEqual / appsWithScores.length) * 100;
    }

    return {
      ...app,
      rank: sortBy === "matchScore" && matchScore !== undefined ? index + 1 : undefined,
      matchLevel,
      percentile,
    };
  });

  return ranked;
}

/**
 * Get match statistics for a group of applications
 */
export function getMatchStatistics(applications: JobApplication[]) {
  const withScores = applications.filter((app) => app.matchScore !== undefined);

  if (withScores.length === 0) {
    return {
      total: applications.length,
      withScores: 0,
      average: 0,
      median: 0,
      max: 0,
      min: 0,
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    };
  }

  const scores = withScores.map((app) => app.matchScore!);
  const sorted = [...scores].sort((a, b) => a - b);

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  const excellent = scores.filter((s) => s >= 80).length;
  const good = scores.filter((s) => s >= 60 && s < 80).length;
  const fair = scores.filter((s) => s >= 40 && s < 60).length;
  const poor = scores.filter((s) => s < 40).length;

  return {
    total: applications.length,
    withScores: withScores.length,
    average: Math.round(average * 10) / 10,
    median,
    max: Math.max(...scores),
    min: Math.min(...scores),
    excellent,
    good,
    fair,
    poor,
  };
}

/**
 * Get recommended applications based on match score and other factors
 */
export function getRecommendedApplications(
  applications: JobApplication[],
  limit = 5
): RankedApplication[] {
  const ranked = rankApplications(applications, {
    sortBy: "matchScore",
    sortOrder: "desc",
    filterBy: {
      minMatchScore: 60,
      matchLevel: "all",
    },
  });

  // Prioritize excellent matches, then good matches
  const prioritized = ranked.sort((a, b) => {
    const aLevel = a.matchLevel === "excellent" ? 3 : a.matchLevel === "good" ? 2 : 1;
    const bLevel = b.matchLevel === "excellent" ? 3 : b.matchLevel === "good" ? 2 : 1;

    if (aLevel !== bLevel) {
      return bLevel - aLevel;
    }

    // Within same level, sort by match score
    return (b.matchScore ?? 0) - (a.matchScore ?? 0);
  });

  return prioritized.slice(0, limit);
}
