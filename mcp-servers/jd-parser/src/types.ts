/**
 * JD Parser MCP Server - Type Definitions
 *
 * Defines the structure for parsed job descriptions
 */

export interface JDSkill {
  name: string;
  category: 'technical' | 'soft' | 'domain' | 'language';
  level?: 'junior' | 'intermediate' | 'senior' | 'expert';
  required: boolean;
}

export interface JDRequirement {
  type: 'education' | 'experience' | 'certification' | 'location' | 'other';
  description: string;
  required: boolean;
}

export interface JDKeyword {
  term: string;
  frequency: number;
  category: string;
}

export interface ExperienceLevel {
  level: 'entry' | 'mid' | 'senior' | 'lead';
  minYears?: number;
  maxYears?: number;
  confidence: number;
}

export interface Responsibility {
  title: string;
  description: string;
  priority: 'core' | 'secondary' | 'optional';
}

export interface Benefit {
  category: 'salary' | 'equity' | 'healthcare' | 'perks' | 'work_life_balance';
  description: string;
}

export interface JDStructure {
  // Core job information
  title: string;
  company?: string;
  location?: string;
  employmentType?: string;

  // Skills analysis
  hardSkills: JDSkill[];
  softSkills: JDSkill[];
  allSkills: JDSkill[];

  // Requirements
  requirements: JDRequirement[];

  // Keywords for matching
  keywords: JDKeyword[];

  // Experience level
  experienceLevel: ExperienceLevel;

  // Job responsibilities
  responsibilities: Responsibility[];

  // Benefits/perks
  benefits: Benefit[];

  // Metadata
  rawText: string;
  parsedAt: string;
  confidence: number;
}

export interface ParseJDOptions {
  includeRawText?: boolean;
  skillCategories?: string[];
  extractBenefits?: boolean;
}
