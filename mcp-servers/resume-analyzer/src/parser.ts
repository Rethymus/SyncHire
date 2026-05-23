/**
 * Resume Parser - Core parsing logic
 *
 * Extracts structured information from resume text (PDF, Word, LinkedIn)
 */

import fs from 'fs/promises';
import pdf from 'pdf-parse';
import type {
  ResumeStructure,
  PersonalInfo,
  ResumeSkill,
  WorkExperience,
  Education,
} from './types.js';

// Regex patterns for extracting information
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_PATTERN = /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
const LINKEDIN_PATTERN = /linkedin\.com\/in\/[\w-]+/gi;
const GITHUB_PATTERN = /github\.com\/[\w-]+/gi;
const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

const SKILL_PATTERNS = {
  programming: [
    /\b(TypeScript|JavaScript|Python|Java|Go|Rust|C\+\+|C#|PHP|Ruby|Swift|Kotlin|Scala|Dart|R|MATLAB)\b/gi,
    /\b(SQL|HTML|CSS|Bash|Shell|PowerShell|Assembly)\b/gi,
  ],
  framework: [
    /\b(React|Vue|Angular|Svelte|Next\.?js|Nuxt\.?js|Express|FastAPI|Django|Flask|Spring|\.NET|NestJS)\b/gi,
    /\b(TensorFlow|PyTorch|scikit-learn|pandas|numpy|ReactDOM|Redux|MobX)\b/gi,
  ],
  database: [
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Cassandra|Firebase|Supabase)\b/gi,
    /\b(Oracle|SQL Server|SQLite|MariaDB|CockroachDB)\b/gi,
  ],
  tool: [
    /\b(Git|Docker|Kubernetes|Terraform|AWS|Azure|GCP|Jenkins|GitHub|GitLab|CI\/CD)\b/gi,
    /\b(Linux|Unix|Windows|macOS|Jira|Confluence|Slack|VS Code|IntelliJ)\b/gi,
  ],
  soft: [
    /\b(Leadership|Communication|Teamwork|Problem.?solving|Agile|Scrum)\b/gi,
    /\b(Project.?management|Mentoring|Collaboration|Critical.?thinking)\b/gi,
  ],
  language: [
    /\b(English|Chinese|Mandarin|Spanish|French|German|Japanese|Korean|Russian|Portuguese)\b/gi,
  ],
};

const DATE_PATTERN = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?[\s\-]?\d{4}|(?:\d{1,2}[\s\/\-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?[\s\/\-]?\d{4})|(?:\d{4}[\s\-–to]+(?:present|current|now))|(?:\d{4}[\s\-–]+\d{4}))/gi;

/**
 * Extract personal information from resume text
 */
function extractPersonalInfo(text: string): PersonalInfo {
  const info: PersonalInfo = {};

  // Email
  const emailMatch = text.match(EMAIL_PATTERN);
  if (emailMatch) {
    info.email = emailMatch[0];
  }

  // Phone
  const phoneMatch = text.match(PHONE_PATTERN);
  if (phoneMatch) {
    info.phone = phoneMatch[0];
  }

  // LinkedIn
  const linkedinMatch = text.match(LINKEDIN_PATTERN);
  if (linkedinMatch) {
    info.linkedIn = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`;
  }

  // GitHub
  const githubMatch = text.match(GITHUB_PATTERN);
  if (githubMatch) {
    info.github = githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`;
  }

  // Website (non-GitHub, non-LinkedIn)
  const urlMatches = text.match(URL_PATTERN);
  if (urlMatches) {
    for (const url of urlMatches) {
      if (!url.includes('linkedin') && !url.includes('github')) {
        info.website = url;
        break;
      }
    }
  }

  // Name (usually at the top, first line)
  const lines = text.split('\n').filter(l => l.trim());
  for (const line of lines.slice(0, 5)) {
    const cleanLine = line.trim();
    if (cleanLine.length > 2 && cleanLine.length < 50 &&
        !cleanLine.includes('@') &&
        !cleanLine.match(/http|resume|cv|curriculum vitae/i)) {
      info.name = cleanLine;
      break;
    }
  }

  // Location
  const locationPatterns = [
    /(?:location|based in|address)[:\s]+([A-Z][A-Za-z\s]+?)(?:\.|\n|$)/i,
    /^([A-Z][A-Za-z\s]+?),\s*[A-Z]{2}(?:\s*\d{5})?$/m,
  ];
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      info.location = match[1].trim();
      break;
    }
  }

  return info;
}

/**
 * Extract skills from resume text
 */
function extractSkills(text: string): ResumeSkill[] {
  const skills = new Map<string, ResumeSkill>();

  for (const [category, patterns] of Object.entries(SKILL_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const skillName = match[1] || match[0];
        const normalizedName = skillName.toLowerCase();

        if (!skills.has(normalizedName)) {
          skills.set(normalizedName, {
            name: skillName,
            category: category as ResumeSkill['category'],
          });
        }
      }
    }
  }

  return Array.from(skills.values());
}

/**
 * Extract work experience from resume text
 */
function extractExperience(text: string): WorkExperience[] {
  const experiences: WorkExperience[] = [];

  // Look for experience section
  const expSectionMatch = text.match(/(?:experience|employment|work history)[:\s]+([^]*?)(?=\n\n[a-z]+:|\n\n[A-Z]{3,}|$)/i);
  if (!expSectionMatch) return experiences;

  const expText = expSectionMatch[1];

  // Split by company/title patterns
  const entries = expText.split(/\n\s*\n/).filter(e => e.trim().length > 20);

  for (const entry of entries) {
    const lines = entry.trim().split('\n').filter(l => l.trim());

    if (lines.length < 2) continue;

    // First line is usually Company / Title
    const firstLine = lines[0];
    const titleMatch = firstLine.match(/(.+?)\s+(?:at|@|–|-)\s+(.+?)(?:\s|\||$)/i);

    let company = '';
    let title = '';

    if (titleMatch) {
      title = titleMatch[1].trim();
      company = titleMatch[2].trim();
    } else {
      // Try reverse: Title at Company
      const reverseMatch = firstLine.match(/(.+?)(?:\s+–|\s+@|\s+at)\s+(.+)/i);
      if (reverseMatch) {
        company = reverseMatch[1].trim();
        title = reverseMatch[2].trim();
      } else {
        title = firstLine;
        company = lines[1] || '';
      }
    }

    // Extract dates
    const dateMatches = entry.match(DATE_PATTERN);
    const startDate = dateMatches?.[0] || '';
    const endDate = dateMatches?.[1] || (dateMatches?.[0]?.toLowerCase().includes('present') ? '' : undefined);

    // Extract responsibilities/achievements
    const bulletPoints = lines.slice(2).filter(l => l.trim().startsWith('•') || l.trim().startsWith('-'));

    const responsibilities: string[] = [];
    const achievements: string[] = [];
    const technologies: string[] = [];

    for (const point of bulletPoints) {
      const clean = point.replace(/^[•\-\s]+/, '').trim();
      if (clean.toLowerCase().includes('developed') || clean.toLowerCase().includes('built') || clean.toLowerCase().includes('created')) {
        achievements.push(clean);
      } else {
        responsibilities.push(clean);
      }

      // Extract tech stack
      const techMatch = clean.match(/\b(TypeScript|JavaScript|React|Python|AWS|Docker|Kubernetes|SQL|MongoDB|PostgreSQL|Redis|Node\.?js|Express)\b/gi);
      if (techMatch) {
        technologies.push(...techMatch);
      }
    }

    if (company || title) {
      experiences.push({
        company,
        title,
        startDate,
        endDate,
        current: !endDate || endDate.toLowerCase().includes('present'),
        responsibilities,
        achievements,
        technologies: [...new Set(technologies)],
      });
    }
  }

  return experiences;
}

/**
 * Extract education from resume text
 */
function extractEducation(text: string): Education[] {
  const education: Education[] = [];

  const eduSectionMatch = text.match(/(?:education|academic|degrees?)[:\s]+([^]*?)(?=\n\n[a-z]+:|\n\n[A-Z]{3,}|$)/i);
  if (!eduSectionMatch) return education;

  const eduText = eduSectionMatch[1];
  const entries = eduText.split(/\n\s*\n/).filter(e => e.trim().length > 10);

  for (const entry of entries) {
    const lines = entry.trim().split('\n').filter(l => l.trim());

    if (lines.length === 0) continue;

    // Degree and institution
    const degreePattern = /(?:Bachelor'?s?|Master'?s?|PhD?|Doctorate|MBA|B\.S\.|M\.S\.|B\.A\.|M\.A\.)/i;
    let degree = '';
    let institution = '';

    for (const line of lines) {
      if (degreePattern.test(line)) {
        degree = line;
        break;
      }
    }

    if (!degree) {
      degree = lines[0];
    }

    institution = lines[1] || '';

    // Dates
    const dateMatches = entry.match(DATE_PATTERN);
    const endDate = dateMatches?.[dateMatches.length - 1] || '';

    // GPA
    const gpaMatch = entry.match(/GPA[:\s]+([0-9]\.?\d*)/i);
    const gpa = gpaMatch ? gpaMatch[1] : undefined;

    education.push({
      institution,
      degree,
      endDate,
      gpa,
    });
  }

  return education;
}

/**
 * Calculate total years of experience
 */
function calculateTotalYears(experience: WorkExperience[]): number {
  let totalYears = 0;

  for (const exp of experience) {
    const startYear = parseInt(exp.startDate.match(/\d{4}/)?.[0] || '0');
    const endYear = exp.endDate
      ? parseInt(exp.endDate.match(/\d{4}/)?.[0] || new Date().getFullYear().toString())
      : new Date().getFullYear();

    if (startYear > 0) {
      totalYears += endYear - startYear;
    }
  }

  return totalYears;
}

/**
 * Determine career level
 */
function determineCareerLevel(totalYears: number, titles: string[]): 'entry' | 'mid' | 'senior' | 'lead' | 'executive' {
  const titlesLower = titles.join(' ').toLowerCase();

  if (titlesLower.includes('intern') || titlesLower.includes('junior') || totalYears < 2) {
    return 'entry';
  }
  if (titlesLower.includes('lead') || titlesLower.includes('principal') || titlesLower.includes('staff')) {
    return 'lead';
  }
  if (titlesLower.includes('manager') || titlesLower.includes('director') || titlesLower.includes('vp') || titlesLower.includes('head')) {
    return 'executive';
  }
  if (totalYears >= 5 || titlesLower.includes('senior') || titlesLower.includes('sr.')) {
    return 'senior';
  }
  return 'mid';
}

/**
 * Parse resume from text
 */
export function parseResume(text: string, source: ResumeStructure['source'] = 'text'): ResumeStructure {
  const personalInfo = extractPersonalInfo(text);
  const skills = extractSkills(text);
  const experience = extractExperience(text);
  const education = extractEducation(text);

  const totalYearsExperience = calculateTotalYears(experience);
  const titles = experience.map(e => e.title);
  const careerLevel = determineCareerLevel(totalYearsExperience, titles);

  // Extract summary (usually at top)
  const summaryMatch = text.match(/(?:summary|profile|about|objective)[:\s]+([^]*?)(?=\n\n|\n[A-Z]{3,}|$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : undefined;

  return {
    personalInfo,
    skills,
    experience,
    education,
    projects: [], // To be enhanced with AI
    certifications: [], // To be enhanced with AI
    languages: [],
    rawText: text,
    source,
    parsedAt: new Date().toISOString(),
    confidence: 0.7,
    summary,
    totalYearsExperience,
    careerLevel,
  };
}

/**
 * Parse resume from PDF file
 */
export async function parseResumeFromPDF(filePath: string): Promise<ResumeStructure> {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdf(dataBuffer);
  return parseResume(data.text, 'pdf');
}

/**
 * Parse resume from text file
 */
export async function parseResumeFromText(filePath: string): Promise<ResumeStructure> {
  const text = await fs.readFile(filePath, 'utf-8');
  return parseResume(text, 'text');
}
