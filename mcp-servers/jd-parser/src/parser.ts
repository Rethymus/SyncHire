/**
 * JD Parser - Core parsing logic
 *
 * Extracts structured information from job description text
 */

import type {
  JDStructure,
  JDSkill,
  JDRequirement,
  JDKeyword,
  ExperienceLevel,
  Responsibility,
  Benefit,
} from './types.js';

// Skill patterns for different categories
const TECHNICAL_PATTERNS = [
  // Programming languages
  /\b(TypeScript|JavaScript|Python|Java|Go|Rust|C\+\+|C#|PHP|Ruby|Swift|Kotlin|Scala|Dart|R)\b/gi,
  // Frontend
  /\b(React|Vue|Angular|Svelte|Next\.js|Nuxt\.js|ReactDOM|HTML|CSS|Tailwind|SASS|LESS|webpack|vite)\b/gi,
  // Backend
  /\b(Node\.js|Express|FastAPI|Django|Flask|Spring Boot|\.NET|NestJS|GraphQL|REST|gRPC|microservices)\b/gi,
  // Databases
  /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Cassandra|SQL|NoSQL|Firebase|Supabase)\b/gi,
  // Cloud & DevOps
  /\b(AWS|Azure|GCP|Docker|Kubernetes|Terraform|CI\/CD|Jenkins|GitHub Actions|GitLab|Linux|bash)\b/gi,
  // Data/AI
  /\b(Machine Learning|Deep Learning|AI|TensorFlow|PyTorch|scikit-learn|pandas|numpy|Apache Spark|Data Lake|ETL)\b/gi,
  // Other technical
  /\b(Git|Agile|Scrum|Jira|Confluence|API|OAuth|JWT|RESTful|microservices|serverless)\b/gi,
];

const SOFT_SKILL_PATTERNS = [
  /\b(communication|teamwork|leadership|problem.solving|critical thinking|adaptability|creativity|collaboration)\b/gi,
  /\b(time management|organization|attention to detail|analytical|strategic thinking|decision making)\b/gi,
  /\b(interpersonal|presentation|negotiation|mentoring|coaching|self.starter|proactive)\b/gi,
  /\b(cross.functional|stakeholder management|project management|agile|scrum)\b/gi,
];

interface ExperienceYearsPattern {
  pattern: RegExp;
  extract: (match: RegExpExecArray) => number;
}

interface ExperienceLevelPattern {
  pattern: RegExp;
  level: 'entry' | 'mid' | 'senior' | 'lead';
}

type ExperiencePattern = ExperienceYearsPattern | ExperienceLevelPattern;

const EXPERIENCE_PATTERNS: ExperiencePattern[] = [
  {
    pattern: /\b(\d+)\+?\s*years?\s*(of\s*)?(experience|work)\b/gi,
    extract: (match: RegExpExecArray) => parseInt(match[1]),
  },
  {
    pattern: /\b(entry.?level|junior|intern|trainee)\b/gi,
    level: 'entry',
  },
  {
    pattern: /\b(mid.?level|mid.?senior|intermediate)\b/gi,
    level: 'mid',
  },
  {
    pattern: /\b(senior|sr\.|lead|principal|staff)\b/gi,
    level: 'senior',
  },
  {
    pattern: /\b(manager|director|vp|head|chief)\b/gi,
    level: 'lead',
  },
];

function isYearsPattern(pattern: ExperiencePattern): pattern is ExperienceYearsPattern {
  return 'extract' in pattern;
}

function isLevelPattern(pattern: ExperiencePattern): pattern is ExperienceLevelPattern {
  return 'level' in pattern;
}

const REQUIREMENT_PATTERNS = [
  {
    type: 'education' as const,
    patterns: [
      /\b(?:bachelor'?s?|bs|b\.s\.|master'?s?|ms|m\.s\.|phd?|doctorate|mba)\s*(?:degree)?\s*(?:in\s+[\w\s]+)?/gi,
      /\b(?:computer science|software engineering|information technology|related field)\b/gi,
    ],
  },
  {
    type: 'certification' as const,
    patterns: [
      /\b(AWS|Azure|GCP|Google|PMP|Scrum|CPA|CFA)\s*(?:Certified?|Certification?)/gi,
    ],
  },
];

function extractSkills(text: string, patterns: RegExp[], category: JDSkill['category']): JDSkill[] {
  const skills = new Map<string, JDSkill>();

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const skillName = match[1] || match[0];
      const normalizedName = skillName.toLowerCase();

      if (!skills.has(normalizedName)) {
        skills.set(normalizedName, {
          name: skillName,
          category,
          required: false,
        });
      }
    }
  }

  // Mark skills as required if found in requirements section
  const requirementsSection = text.match(/(?:requirements|qualifications|what you.?ll need)[:\s]+([^]*?)(?=\n\n|\n[a-z]|$)/i);
  if (requirementsSection) {
    const reqText = requirementsSection[1].toLowerCase();
    for (const skill of skills.values()) {
      if (reqText.includes(skill.name.toLowerCase())) {
        skill.required = true;
      }
    }
  }

  return Array.from(skills.values());
}

function extractExperience(text: string): ExperienceLevel {
  let level: ExperienceLevel['level'] = 'mid';
  let minYears: number | undefined;
  let maxYears: number | undefined;
  let confidence = 0.5;

  // Check for explicit years
  for (const patternData of EXPERIENCE_PATTERNS) {
    if (!isYearsPattern(patternData)) continue;
    const { pattern, extract } = patternData;
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const years = extract(match);
      if (!minYears || years < minYears) {
        minYears = years;
      }
      confidence = Math.max(confidence, 0.8);
    }
  }

  // Determine level from years
  if (minYears !== undefined) {
    if (minYears < 2) level = 'entry';
    else if (minYears < 5) level = 'mid';
    else if (minYears < 8) level = 'senior';
    else level = 'lead';
  }

  // Check for explicit level keywords
  for (const patternData of EXPERIENCE_PATTERNS) {
    if (!isLevelPattern(patternData)) continue;
    const { pattern, level: explicitLevel } = patternData;
    if (pattern.test(text)) {
      level = explicitLevel;
      confidence = Math.max(confidence, 0.9);
      break;
    }
  }

  // Check title for level hints
  const titleMatch = text.match(/^#+\s*(.*)$/m);
  if (titleMatch) {
    const title = titleMatch[1].toLowerCase();
    if (title.includes('senior') || title.includes('sr.')) {
      level = 'senior';
      confidence = Math.max(confidence, 0.7);
    } else if (title.includes('lead') || title.includes('principal')) {
      level = 'lead';
      confidence = Math.max(confidence, 0.7);
    } else if (title.includes('junior') || title.includes('entry')) {
      level = 'entry';
      confidence = Math.max(confidence, 0.7);
    }
  }

  return { level, minYears, maxYears, confidence };
}

function extractRequirements(text: string): JDRequirement[] {
  const requirements: JDRequirement[] = [];

  for (const { type, patterns } of REQUIREMENT_PATTERNS) {
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        requirements.push({
          type,
          description: match[0],
          required: true,
        });
      }
    }
  }

  return requirements;
}

function extractKeywords(text: string): JDKeyword[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !['that', 'this', 'with', 'from', 'have', 'will'].includes(word));

  const frequency = new Map<string, number>();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }

  return Array.from(frequency.entries())
    .filter(([_, count]) => count > 1)
    .map(([term, frequency]) => ({
      term,
      frequency,
      category: 'general',
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 50);
}

function extractResponsibilities(text: string): Responsibility[] {
  const responsibilities: Responsibility[] = [];

  // Look for bullet points under sections like "Responsibilities", "What you'll do", etc.
  const sectionMatch = text.match(/(?:responsibilities|what you'?ll do|role|duties)[:\s]+([^]*?)(?=\n\n|\n[a-z]+:|$)/i);
  if (!sectionMatch) return responsibilities;

  const bulletPattern = /^[•\-\*]?\s*(.*?)(?:\.|$)/gm;
  const bullets = sectionMatch[1].match(bulletPattern) || [];

  for (const bullet of bullets) {
    const description = bullet.replace(/^[•\-\*]\s*/, '').trim();
    if (description.length > 10) {
      responsibilities.push({
        title: description.substring(0, 50) + (description.length > 50 ? '...' : ''),
        description,
        priority: description.toLowerCase().includes('lead') || description.toLowerCase().includes('own')
          ? 'core'
          : 'secondary',
      });
    }
  }

  return responsibilities;
}

function extractBenefits(text: string): Benefit[] {
  const benefits: Benefit[] = [];

  const sectionMatch = text.match(/(?:benefits|perks|compensation|what we offer)[:\s]+([^]*?)(?=\n\n|\n[a-z]+:|$)/i);
  if (!sectionMatch) return benefits;

  const benefitText = sectionMatch[1].toLowerCase();

  // Salary mentions
  if (benefitText.includes('salary') || benefitText.includes('compensation')) {
    const salaryMatch = benefitText.match(/\$?(\d{2,3}(?:,\d{3}|\d))k?\s*[-–to]\s*\$?(\d{2,3}(?:,\d{3}|\d))k?/);
    if (salaryMatch) {
      benefits.push({
        category: 'salary',
        description: salaryMatch[0],
      });
    }
  }

  // Equity
  if (benefitText.includes('equity') || benefitText.includes('stock') || benefitText.includes('options')) {
    benefits.push({
      category: 'equity',
      description: 'Equity/Stock options',
    });
  }

  // Healthcare
  if (benefitText.includes('health') || benefitText.includes('medical') || benefitText.includes('dental')) {
    benefits.push({
      category: 'healthcare',
      description: 'Health insurance',
    });
  }

  // Work-life balance
  if (benefitText.includes('remote') || benefitText.includes('flexible') || benefitText.includes('pto') || benefitText.includes('vacation')) {
    benefits.push({
      category: 'work_life_balance',
      description: 'Flexible work arrangements',
    });
  }

  return benefits;
}

export function parseJD(text: string): JDStructure {
  // Extract title
  const titleMatch = text.match(/^#+\s*(.*)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled Position';

  // Extract company
  const companyMatch = text.match(/(?:at|@)\s+([A-Z][A-Za-z\s]+?)(?:\s+is hiring|\s+\(|\.|$)/);
  const company = companyMatch ? companyMatch[1].trim() : undefined;

  // Extract location
  const locationMatch = text.match(/(?:location|based in)[:\s]+([A-Z][A-Za-z\s]+?)(?:\.|\n|$)/i);
  const location = locationMatch ? locationMatch[1].trim() : undefined;

  // Extract employment type
  const typeMatch = text.match(/(?:employment type|type)[:\s]+(full.?time|part.?time|contract|freelance)/i);
  const employmentType = typeMatch ? typeMatch[1].trim() : undefined;

  // Parse all components
  const hardSkills = extractSkills(text, TECHNICAL_PATTERNS, 'technical');
  const softSkills = extractSkills(text, SOFT_SKILL_PATTERNS, 'soft');
  const allSkills = [...hardSkills, ...softSkills];

  const requirements = extractRequirements(text);
  const keywords = extractKeywords(text);
  const experienceLevel = extractExperience(text);
  const responsibilities = extractResponsibilities(text);
  const benefits = extractBenefits(text);

  return {
    title,
    company,
    location,
    employmentType,
    hardSkills,
    softSkills,
    allSkills,
    requirements,
    keywords,
    experienceLevel,
    responsibilities,
    benefits,
    rawText: text,
    parsedAt: new Date().toISOString(),
    confidence: experienceLevel.confidence,
  };
}
