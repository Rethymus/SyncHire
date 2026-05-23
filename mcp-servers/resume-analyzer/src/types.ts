/**
 * Resume Analyzer MCP Server - Type Definitions
 *
 * Defines the structure for parsed resume/CV data
 */

export interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  github?: string;
  website?: string;
}

export interface ResumeSkill {
  name: string;
  category: 'programming' | 'framework' | 'database' | 'tool' | 'soft' | 'language';
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsExperience?: number;
  lastUsed?: string;
}

export interface STARProject {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  skillsUsed: string[];
  timeframe?: string;
  impactMetric?: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  responsibilities: string[];
  achievements: string[];
  technologies: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  honors?: string[];
  coursework?: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  date?: string;
  credentialId?: string;
  url?: string;
}

export interface Language {
  name: string;
  proficiency: 'native' | 'fluent' | 'intermediate' | 'basic';
}

export interface ResumeStructure {
  // Core personal information
  personalInfo: PersonalInfo;

  // Skills (categorized)
  skills: ResumeSkill[];

  // Work experience (chronological)
  experience: WorkExperience[];

  // Education
  education: Education[];

  // Projects (STAR format)
  projects: STARProject[];

  // Certifications
  certifications: Certification[];

  // Languages
  languages: Language[];

  // Metadata
  rawText: string;
  source: 'pdf' | 'word' | 'text' | 'linkedin';
  parsedAt: string;
  confidence: number;

  // Summary
  summary?: string;

  // Total experience
  totalYearsExperience: number;

  // Career level
  careerLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
}

export interface ParseResumeOptions {
  extractProjectsOnly?: boolean;
  includeRawText?: boolean;
  skillCategories?: string[];
}
