/**
 * Match display model + API mapping layer.
 *
 * The match-analysis page renders a rich camelCase display model
 * (overallScore / category scores / skillMatches / radarChartData ...).
 * The backend GET /applications/{id}/match endpoint returns a much smaller
 * snake_case payload (`MatchScoreResult`: `{match_score, match_details}` with
 * `{skills_match, experience_match, education_match, missing_skills[],
 * recommendations[]}`). This module owns the pure conversion from the API
 * payload to the display model so the page never treats the wire format as
 * the view model.
 *
 * Mapping policy:
 * - Fields the API provides are converted directly (snake_case percentage
 *   -> camelCase percentage, clamped to [0, 100]).
 * - Fields derivable from `match_details` are derived (e.g. missing-skills
 *   entries feed `skillMatches`).
 * - Fields the API cannot back are visibly neutral (0 / empty array /
 *   fetch-time timestamp) — never fabricated plausible-looking data.
 */

import type { MatchDetails, MatchScoreResult } from "@/lib/api-client";
import { getMatchLevel } from "@/lib/match-ranking";

/** One scored category rendered by MatchScoreBreakdown. */
export interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  details: string[];
}

/**
 * Rich display model consumed by the match-analysis page
 * (MatchScoreBreakdown / SkillGapAnalysis / export & share handlers).
 */
export interface MatchAnalysisDisplayModel {
  overallScore: number;
  overallPercentage: number;
  matchLevel: "excellent" | "good" | "fair" | "poor";
  hardSkillsScore: CategoryScore;
  softSkillsScore: CategoryScore;
  experienceScore: CategoryScore;
  educationScore: CategoryScore;
  skillMatches: Array<{
    skill: string;
    hasSkill: boolean;
    required: boolean;
    matchQuality: "exact" | "partial" | "missing";
  }>;
  missingSkills: string[];
  missingRequiredSkills: string[];
  additionalSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  radarChartData: Array<{
    category: string;
    score: number;
    maxScore: number;
  }>;
  calculatedAt: string;
  confidence: number;
}

/**
 * Build one category score entry from a 0-100 percentage. `score` is the
 * percentage rebased onto the category's own max score (rounded to one
 * decimal), mirroring how the local (offline) builder scores categories.
 */
export function buildCategoryScore(
  category: string,
  maxScore: number,
  percentage: number,
  detail: string
): CategoryScore {
  const boundedPercentage = Math.max(0, Math.min(100, percentage));

  return {
    category,
    maxScore,
    percentage: boundedPercentage,
    score: Math.round((boundedPercentage / 100) * maxScore * 10) / 10,
    details: [detail],
  };
}

/** Clamp an unknown runtime value to a finite 0-100 percentage (defaults 0). */
function toPercentage(value: number | null | undefined): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, numeric));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

/**
 * Map the GET /applications/{id}/match payload onto the display model.
 *
 * Field-by-field rules:
 * - overallScore / overallPercentage <- match_score (clamped 0-100).
 * - matchLevel                        <- getMatchLevel(overallPercentage),
 *                                       same thresholds as the local builder.
 * - hardSkillsScore                   <- match_details.skills_match
 *                                       (max 40, same weighting as local).
 * - experienceScore                   <- match_details.experience_match (max 25).
 * - educationScore                    <- match_details.education_match (max 15).
 * - softSkillsScore                   <- NOT provided by the API: 0 with a
 *       detail note saying so (never estimate from the overall score).
 * - missingSkills                     <- match_details.missing_skills (direct).
 * - skillMatches                      <- derived from missing_skills only:
 *       each missing skill becomes a `missing` entry. The API has no
 *       per-skill matched list and no required/optional flag, so `required`
 *       defaults to false (neutral "可选缺失" chip) instead of inventing a
 *       "必需" label, and matched counts render as 0.
 * - missingRequiredSkills             <- [] (API does not distinguish
 *       required vs optional missing skills).
 * - additionalSkills                  <- [] (would need the resume skill
 *       list, which the payload does not carry).
 * - strengths                         <- [] (nothing in the payload states
 *       strengths; the UI hides the card when empty).
 * - weaknesses                        <- derived: one line reporting the
 *       missing-skill count when missing_skills is non-empty.
 * - recommendations                   <- match_details.recommendations (direct).
 * - radarChartData                    <- the three API sub-scores plus a 0
 *       for 软技能, all on a 0-100 scale.
 * - calculatedAt                      <- the fetch time (`now`), because the
 *       payload has no computation timestamp. This is real client-side data
 *       (when the report was produced), not a fabricated backend time.
 * - confidence                        <- 0 = unknown; the API does not
 *       report confidence and the page does not render this field (it only
 *       appears in the exported JSON report).
 */
export function toMatchDisplayModel(
  api: MatchScoreResult,
  now: Date = new Date()
): MatchAnalysisDisplayModel {
  // match_details is typed required, but the full-stack backend can omit it;
  // treat it as an empty breakdown instead of crashing the mapping.
  const details: Partial<MatchDetails> = api?.match_details ?? {};

  const overallPercentage = toPercentage(api?.match_score);
  const skillsPercentage = toPercentage(details.skills_match);
  const experiencePercentage = toPercentage(details.experience_match);
  const educationPercentage = toPercentage(details.education_match);
  const missingSkills = unique(details.missing_skills ?? []);
  const recommendations = (details.recommendations ?? []).filter(
    (item) => typeof item === "string"
  );

  return {
    overallScore: overallPercentage,
    overallPercentage,
    matchLevel: getMatchLevel(overallPercentage),
    hardSkillsScore: buildCategoryScore(
      "硬技能",
      40,
      skillsPercentage,
      "硬技能子分来自后端匹配分析"
    ),
    softSkillsScore: buildCategoryScore(
      "软技能",
      20,
      0,
      "后端未返回软技能子分，暂无数据"
    ),
    experienceScore: buildCategoryScore(
      "项目经历",
      25,
      experiencePercentage,
      "经验子分来自后端匹配分析"
    ),
    educationScore: buildCategoryScore(
      "教育背景",
      15,
      educationPercentage,
      "教育子分来自后端匹配分析"
    ),
    skillMatches: missingSkills.map((skill) => ({
      skill,
      hasSkill: false,
      required: false,
      matchQuality: "missing" as const,
    })),
    missingSkills,
    missingRequiredSkills: [],
    additionalSkills: [],
    strengths: [],
    weaknesses:
      missingSkills.length > 0
        ? [`缺少 ${missingSkills.length} 项职位提及的技能`]
        : [],
    recommendations,
    radarChartData: [
      { category: "硬技能", score: skillsPercentage, maxScore: 100 },
      { category: "软技能", score: 0, maxScore: 100 },
      { category: "项目经历", score: experiencePercentage, maxScore: 100 },
      { category: "教育背景", score: educationPercentage, maxScore: 100 },
    ],
    calculatedAt: now.toISOString(),
    confidence: 0,
  };
}
