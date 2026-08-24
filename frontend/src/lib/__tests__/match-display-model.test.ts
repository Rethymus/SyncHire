import { describe, expect, it } from "vitest";
import type { MatchScoreResult } from "@/lib/api-client";
import {
  buildCategoryScore,
  toMatchDisplayModel,
} from "../match-display-model";

const FIXED_NOW = new Date("2026-01-15T08:30:00.000Z");

function makePayload(overrides: Partial<MatchScoreResult> = {}): MatchScoreResult {
  return {
    match_score: 72.5,
    match_details: {
      skills_match: 80,
      experience_match: 60,
      education_match: 40,
      missing_skills: ["kubernetes", "graphql"],
      recommendations: ["优先补强 Kubernetes 相关项目经验"],
    },
    ...overrides,
  };
}

describe("toMatchDisplayModel — typical payload", () => {
  const model = toMatchDisplayModel(makePayload(), FIXED_NOW);

  it("maps the overall score from match_score (clamped percentage scale)", () => {
    expect(model.overallScore).toBe(72.5);
    expect(model.overallPercentage).toBe(72.5);
  });

  it("derives matchLevel with the shared thresholds", () => {
    expect(model.matchLevel).toBe("good");
    expect(toMatchDisplayModel(makePayload({ match_score: 85 }), FIXED_NOW).matchLevel).toBe("excellent");
    expect(toMatchDisplayModel(makePayload({ match_score: 45 }), FIXED_NOW).matchLevel).toBe("fair");
    expect(toMatchDisplayModel(makePayload({ match_score: 20 }), FIXED_NOW).matchLevel).toBe("poor");
  });

  it("maps skills_match onto the hard-skills category (40-point weighting)", () => {
    expect(model.hardSkillsScore).toMatchObject({
      category: "硬技能",
      maxScore: 40,
      percentage: 80,
      score: 32,
    });
    expect(model.hardSkillsScore.details).toHaveLength(1);
  });

  it("maps experience_match and education_match onto their categories", () => {
    expect(model.experienceScore).toMatchObject({
      category: "项目经历",
      maxScore: 25,
      percentage: 60,
      score: 15,
    });
    expect(model.educationScore).toMatchObject({
      category: "教育背景",
      maxScore: 15,
      percentage: 40,
      score: 6,
    });
  });

  it("keeps soft skills visibly neutral (API has no soft-skills subscore)", () => {
    expect(model.softSkillsScore).toMatchObject({
      category: "软技能",
      maxScore: 20,
      percentage: 0,
      score: 0,
    });
    expect(model.softSkillsScore.details[0]).toContain("未返回");
  });

  it("passes missing_skills through and registers them as neutral missing entries", () => {
    expect(model.missingSkills).toEqual(["kubernetes", "graphql"]);
    expect(model.skillMatches).toEqual([
      { skill: "kubernetes", hasSkill: false, required: false, matchQuality: "missing" },
      { skill: "graphql", hasSkill: false, required: false, matchQuality: "missing" },
    ]);
  });

  it("defaults unknown required/optional and extra-skill fields to empty", () => {
    expect(model.missingRequiredSkills).toEqual([]);
    expect(model.additionalSkills).toEqual([]);
    expect(model.strengths).toEqual([]);
  });

  it("derives a single weakness line from the missing-skill count", () => {
    expect(model.weaknesses).toEqual(["缺少 2 项职位提及的技能"]);
  });

  it("passes recommendations through", () => {
    expect(model.recommendations).toEqual(["优先补强 Kubernetes 相关项目经验"]);
  });

  it("builds radar chart data from the API subscores with a neutral soft-skills axis", () => {
    expect(model.radarChartData).toEqual([
      { category: "硬技能", score: 80, maxScore: 100 },
      { category: "软技能", score: 0, maxScore: 100 },
      { category: "项目经历", score: 60, maxScore: 100 },
      { category: "教育背景", score: 40, maxScore: 100 },
    ]);
  });

  it("uses the fetch time and an unknown confidence flag", () => {
    expect(model.calculatedAt).toBe(FIXED_NOW.toISOString());
    expect(model.confidence).toBe(0);
  });
});

describe("toMatchDisplayModel — clamping and rounding", () => {
  it("clamps out-of-range scores to [0, 100]", () => {
    const over = toMatchDisplayModel(
      makePayload({
        match_score: 150,
        match_details: {
          skills_match: 120,
          experience_match: -10,
          education_match: 200,
          missing_skills: [],
          recommendations: [],
        },
      }),
      FIXED_NOW
    );
    expect(over.overallPercentage).toBe(100);
    expect(over.hardSkillsScore.percentage).toBe(100);
    expect(over.hardSkillsScore.score).toBe(40);
    expect(over.experienceScore.percentage).toBe(0);
    expect(over.experienceScore.score).toBe(0);
    expect(over.educationScore.percentage).toBe(100);
    expect(over.educationScore.score).toBe(15);
  });

  it("rounds category scores to one decimal", () => {
    const model = toMatchDisplayModel(
      makePayload({
        match_details: {
          skills_match: 33.33,
          experience_match: 33.33,
          education_match: 33.33,
          missing_skills: [],
          recommendations: [],
        },
      }),
      FIXED_NOW
    );
    expect(model.hardSkillsScore.score).toBe(13.3);
    expect(model.experienceScore.score).toBe(8.3);
    expect(model.educationScore.score).toBe(5);
  });

  it("treats a null runtime match_score as 0 instead of NaN", () => {
    const payload = { ...makePayload(), match_score: null } as unknown as MatchScoreResult;
    const model = toMatchDisplayModel(payload, FIXED_NOW);
    expect(model.overallPercentage).toBe(0);
    expect(model.matchLevel).toBe("poor");
  });
});

describe("toMatchDisplayModel — missing fields", () => {
  it("defaults everything when match_details is absent", () => {
    const payload = { match_score: 50 } as MatchScoreResult;
    const model = toMatchDisplayModel(payload, FIXED_NOW);

    expect(model.overallPercentage).toBe(50);
    expect(model.hardSkillsScore.percentage).toBe(0);
    expect(model.softSkillsScore.percentage).toBe(0);
    expect(model.experienceScore.percentage).toBe(0);
    expect(model.educationScore.percentage).toBe(0);
    expect(model.skillMatches).toEqual([]);
    expect(model.missingSkills).toEqual([]);
    expect(model.missingRequiredSkills).toEqual([]);
    expect(model.additionalSkills).toEqual([]);
    expect(model.strengths).toEqual([]);
    expect(model.weaknesses).toEqual([]);
    expect(model.recommendations).toEqual([]);
    expect(model.radarChartData.map((axis) => axis.score)).toEqual([0, 0, 0, 0]);
  });

  it("trims, dedupes and filters empty missing-skill entries", () => {
    const model = toMatchDisplayModel(
      makePayload({
        match_details: {
          skills_match: 90,
          experience_match: 90,
          education_match: 90,
          missing_skills: [" React ", "React", "", "Go"],
          recommendations: [],
        },
      }),
      FIXED_NOW
    );
    expect(model.missingSkills).toEqual(["React", "Go"]);
    expect(model.skillMatches).toHaveLength(2);
    expect(model.weaknesses).toEqual(["缺少 2 项职位提及的技能"]);
  });
});

describe("buildCategoryScore", () => {
  it("clamps the percentage before rebasing onto maxScore", () => {
    expect(buildCategoryScore("硬技能", 40, 120, "d")).toMatchObject({
      percentage: 100,
      score: 40,
    });
    expect(buildCategoryScore("硬技能", 40, -5, "d")).toMatchObject({
      percentage: 0,
      score: 0,
    });
  });
});
