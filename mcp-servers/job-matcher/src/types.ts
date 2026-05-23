/**
 * Job Matcher MCP Server - Type Definitions
 */

export interface SkillMatch {
  skill: string;
  hasSkill: boolean;
  required: boolean;
  matchQuality: 'exact' | 'partial' | 'missing';
}

export interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  details: string[];
}

export interface MatchResult {
  // Overall match
  overallScore: number;
  overallPercentage: number;
  matchLevel: 'excellent' | 'good' | 'fair' | 'poor';

  // Category breakdowns
  hardSkillsScore: CategoryScore;
  softSkillsScore: CategoryScore;
  experienceScore: CategoryScore;
  educationScore: CategoryScore;

  // Skill matching details
  skillMatches: SkillMatch[];

  // Gaps analysis
  missingSkills: string[];
  missingRequiredSkills: string[];
  additionalSkills: string[];

  // Recommendations
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];

  // Radar chart data
  radarChartData: {
    category: string;
    score: number;
    maxScore: number;
  }[];

  // Metadata
  calculatedAt: string;
  confidence: number;
}

// Lightweight types for matching (avoiding circular dependencies)
export interface ResumeMatchInput {
  skills: Array<{ name: string; category: string }>;
  totalYearsExperience: number;
  careerLevel: string;
  experience: Array<{
    title: string;
    technologies: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
  }>;
}

export interface JDMatchInput {
  hardSkills: Array<{ name: string; required: boolean }>;
  softSkills: Array<{ name: string; required: boolean }>;
  allSkills: Array<{ name: string; category: string; required: boolean }>;
  experienceLevel: {
    level: string;
    minYears?: number;
    confidence: number;
  };
  requirements: Array<{
    type: string;
    description: string;
    required: boolean;
  }>;
  keywords: Array<{
    term: string;
    frequency: number;
    category: string;
  }>;
}
