/**
 * Interview Prep MCP Server - Type Definitions
 */

export interface InterviewQuestion {
  question: string;
  category: 'hr' | 'technical' | 'behavioral' | 'situational';
  priority: 'high' | 'medium' | 'low';
  suggestedAnswer?: string;
  talkingPoints: string[];
}

export interface SelfIntroTemplate {
  hook: string;
  structure: string[];
  customization: {
    highlightFromResume: string[];
    connectToJD: string[];
    demonstrateCulturalFit: string[];
  };
  example: string;
}

export interface ReverseQuestion {
  question: string;
  category: 'company' | 'role' | 'team' | 'growth' | 'culture';
  whenToAsk: string;
}

export interface InterviewPrep {
  // HR screening questions
  hrQuestions: InterviewQuestion[];

  // Technical deep-dive questions
  technicalQuestions: InterviewQuestion[];

  // Behavioral questions
  behavioralQuestions: InterviewQuestion[];

  // Self-introduction template
  selfIntroduction: SelfIntroTemplate;

  // Questions for candidate to ask interviewer
  reverseQuestions: ReverseQuestion[];

  // Preparation checklist
  checklist: {
    category: string;
    items: string[];
    completed: boolean;
  }[];

  // Metadata
  generatedAt: string;
  targetRole: string;
  targetCompany?: string;
}

// Lightweight input types
export interface ResumePrepInput {
  personalInfo: {
    name?: string;
    email?: string;
  };
  skills: Array<{ name: string; category: string }>;
  experience: Array<{
    title: string;
    company: string;
    achievements: string[];
    technologies: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
  }>;
  projects?: Array<{
    title: string;
    result: string;
    skillsUsed: string[];
  }>;
  careerLevel: string;
  totalYearsExperience: number;
}

export interface JDPrepInput {
  title: string;
  company?: string;
  hardSkills: Array<{ name: string; required: boolean }>;
  softSkills: Array<{ name: string; required: boolean }>;
  responsibilities: Array<{
    title: string;
    description: string;
    priority: string;
  }>;
  experienceLevel: {
    level: string;
    minYears?: number;
  };
}
