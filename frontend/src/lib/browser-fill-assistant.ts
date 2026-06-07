export type ProfileFieldKey =
  | "fullName"
  | "email"
  | "phone"
  | "location"
  | "targetTitle"
  | "education"
  | "school"
  | "graduationYear"
  | "portfolioUrl"
  | "linkedinUrl"
  | "githubUrl"
  | "workAuthorization"
  | "availability"
  | "salaryExpectation"
  | "personalSummary"
  | "skills"
  | "projects";

export interface CandidateRoleCard {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  targetTitle: string;
  education: string;
  school: string;
  graduationYear: string;
  portfolioUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  workAuthorization: string;
  availability: string;
  salaryExpectation: string;
  personalSummary: string;
  skills: string[];
  projects: string[];
  updatedAt: Date;
}

export interface BrowserFormField {
  id: string;
  label: string;
  inputName: string;
  kind: "text" | "email" | "tel" | "url" | "textarea" | "select";
  required?: boolean;
  options?: string[];
  isSubmitControl?: boolean;
}

export interface BrowserFillSuggestion {
  fieldId: string;
  fieldLabel: string;
  inputName: string;
  kind: BrowserFormField["kind"];
  value: string;
  source: ProfileFieldKey | "rolePitch" | "skillsPitch" | "empty";
  confidence: number;
  requiresUserReview: boolean;
  reason: string;
}

export interface BrowserFillSession {
  id: string;
  targetUrl: string;
  company: string;
  position: string;
  createdAt: Date;
  status: "planned" | "filled-awaiting-review" | "learned";
  suggestions: BrowserFillSuggestion[];
  learnedUpdates: ProfileLearningUpdate[];
}

export interface ProfileLearningUpdate {
  source: BrowserFillSuggestion["source"];
  profileKey: ProfileFieldKey;
  previousValue: string;
  reviewedValue: string;
  confidence: number;
}

const FIELD_MAP: Array<{
  key: ProfileFieldKey;
  labels: string[];
}> = [
  { key: "fullName", labels: ["full name", "name", "姓名", "真实姓名"] },
  { key: "email", labels: ["email", "e-mail", "邮箱", "电子邮件"] },
  { key: "phone", labels: ["phone", "mobile", "telephone", "手机号", "电话"] },
  { key: "location", labels: ["location", "city", "address", "所在地", "城市", "地址"] },
  { key: "targetTitle", labels: ["desired role", "target role", "position", "job title", "目标岗位", "应聘职位"] },
  { key: "education", labels: ["education", "degree", "学历", "学位"] },
  { key: "school", labels: ["school", "university", "college", "学校", "院校", "大学"] },
  { key: "graduationYear", labels: ["graduation", "graduate", "毕业", "毕业年份"] },
  { key: "portfolioUrl", labels: ["portfolio", "website", "personal site", "作品集", "个人网站"] },
  { key: "linkedinUrl", labels: ["linkedin", "领英"] },
  { key: "githubUrl", labels: ["github", "git hub"] },
  { key: "workAuthorization", labels: ["work authorization", "visa", "eligibility", "工作许可", "签证"] },
  { key: "availability", labels: ["availability", "start date", "available", "到岗", "入职"] },
  { key: "salaryExpectation", labels: ["salary", "compensation", "expected pay", "薪资", "期望薪资"] },
  { key: "personalSummary", labels: ["summary", "cover letter", "self introduction", "自我介绍", "个人简介"] },
  { key: "skills", labels: ["skills", "technical skills", "技能", "技术栈"] },
  { key: "projects", labels: ["projects", "experience", "project experience", "项目", "经历"] },
];

export const DEFAULT_BROWSER_FORM_FIELDS: BrowserFormField[] = [
  { id: "full-name", label: "Full name", inputName: "full_name", kind: "text", required: true },
  { id: "email", label: "Email", inputName: "email", kind: "email", required: true },
  { id: "phone", label: "Phone", inputName: "phone", kind: "tel", required: true },
  { id: "location", label: "Location", inputName: "location", kind: "text" },
  { id: "portfolio", label: "Portfolio URL", inputName: "portfolio", kind: "url" },
  { id: "linkedin", label: "LinkedIn URL", inputName: "linkedin", kind: "url" },
  { id: "github", label: "GitHub URL", inputName: "github", kind: "url" },
  { id: "work-auth", label: "Work authorization", inputName: "work_authorization", kind: "text" },
  { id: "availability", label: "Availability", inputName: "availability", kind: "text" },
  { id: "skills", label: "Relevant skills", inputName: "skills", kind: "textarea" },
  { id: "summary", label: "Why are you a fit for this role?", inputName: "summary", kind: "textarea" },
  { id: "submit", label: "Submit application", inputName: "submit", kind: "text", isSubmitControl: true },
];

export function createDefaultCandidateRoleCard(): CandidateRoleCard {
  return {
    fullName: "Chen Yu",
    email: "chenyu@example.com",
    phone: "+86 138 0000 0000",
    location: "Shanghai, China",
    targetTitle: "Frontend Engineer",
    education: "B.S. Computer Science",
    school: "East China University of Science and Technology",
    graduationYear: "2026",
    portfolioUrl: "https://portfolio.example.com/chenyu",
    linkedinUrl: "https://www.linkedin.com/in/chenyu",
    githubUrl: "https://github.com/chenyu",
    workAuthorization: "Authorized to work locally; open to remote roles",
    availability: "Available within 2 weeks",
    salaryExpectation: "Open to discuss based on role scope",
    personalSummary:
      "Fresh graduate frontend engineer focused on React, TypeScript, accessibility, and reliable user workflows.",
    skills: ["React", "TypeScript", "Next.js", "Playwright", "Accessibility"],
    projects: [
      "Built a local-first job application tracker with resume, JD, and pipeline management.",
      "Implemented automated UI regression tests with Playwright and Vitest.",
    ],
    updatedAt: new Date(),
  };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").trim();
}

function readProfileValue(profile: CandidateRoleCard, key: ProfileFieldKey) {
  const value = profile[key];
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value;
}

function inferProfileKey(field: BrowserFormField): ProfileFieldKey | null {
  const haystack = normalize(`${field.label} ${field.inputName}`);

  for (const mapping of FIELD_MAP) {
    if (mapping.labels.some((label) => haystack.includes(normalize(label)))) {
      return mapping.key;
    }
  }

  return null;
}

function buildRolePitch(profile: CandidateRoleCard, company: string, position: string) {
  const companyPart = company ? ` at ${company}` : "";
  const positionPart = position || profile.targetTitle;
  const topSkills = profile.skills.slice(0, 4).join(", ");
  const project = profile.projects[0] ?? "shipping reliable user-facing products";

  return [
    `${profile.personalSummary} I am applying for ${positionPart}${companyPart}.`,
    `My strongest fit signals are ${topSkills}.`,
    `A recent proof point: ${project}`,
  ].join(" ");
}

function buildSkillsPitch(profile: CandidateRoleCard, position: string) {
  const prefix = position
    ? `Relevant skills for ${position}`
    : "Relevant skills";

  return `${prefix}: ${profile.skills.join(", ")}.`;
}

export function createBrowserFillPlan({
  profile,
  fields = DEFAULT_BROWSER_FORM_FIELDS,
  targetUrl,
  company = "",
  position = "",
}: {
  profile: CandidateRoleCard;
  fields?: BrowserFormField[];
  targetUrl: string;
  company?: string;
  position?: string;
}): BrowserFillSession {
  const suggestions = fields
    .filter((field) => !field.isSubmitControl)
    .map<BrowserFillSuggestion>((field) => {
      const key = inferProfileKey(field);

      if (key) {
        return {
          fieldId: field.id,
          fieldLabel: field.label,
          inputName: field.inputName,
          kind: field.kind,
          value: readProfileValue(profile, key),
          source: key,
          confidence: field.required ? 0.94 : 0.86,
          requiresUserReview: true,
          reason: `Matched "${field.label}" to role-card field "${key}".`,
        };
      }

      if (normalize(field.label).includes("fit") || normalize(field.label).includes("why")) {
        return {
          fieldId: field.id,
          fieldLabel: field.label,
          inputName: field.inputName,
          kind: field.kind,
          value: buildRolePitch(profile, company, position),
          source: "rolePitch",
          confidence: 0.78,
          requiresUserReview: true,
          reason: "Generated a role-specific pitch from the role card and selected job.",
        };
      }

      return {
        fieldId: field.id,
        fieldLabel: field.label,
        inputName: field.inputName,
        kind: field.kind,
        value: "",
        source: "empty",
        confidence: 0.2,
        requiresUserReview: true,
        reason: "No reliable role-card match. Leave this field for manual review.",
      };
    })
    .map((suggestion) => {
      if (suggestion.source === "skills" && suggestion.value.length < 20) {
        return {
          ...suggestion,
          value: buildSkillsPitch(profile, position),
        };
      }

      return suggestion;
    });

  return {
    id: `fill-${Date.now()}`,
    targetUrl,
    company,
    position,
    createdAt: new Date(),
    status: "planned",
    suggestions,
    learnedUpdates: [],
  };
}

export function buildReviewedFieldMap(suggestions: BrowserFillSuggestion[]) {
  return Object.fromEntries(
    suggestions.map((suggestion) => [suggestion.fieldId, suggestion.value])
  );
}

const LEARNABLE_SOURCES = new Set<BrowserFillSuggestion["source"]>([
  "fullName",
  "email",
  "phone",
  "location",
  "targetTitle",
  "education",
  "school",
  "graduationYear",
  "portfolioUrl",
  "linkedinUrl",
  "githubUrl",
  "workAuthorization",
  "availability",
  "salaryExpectation",
  "personalSummary",
]);

export function collectProfileLearningUpdates(
  suggestions: BrowserFillSuggestion[],
  reviewedValues: Record<string, string>
): ProfileLearningUpdate[] {
  return suggestions.flatMap((suggestion) => {
    const reviewedValue = reviewedValues[suggestion.fieldId]?.trim() ?? "";
    const previousValue = suggestion.value.trim();

    if (
      !reviewedValue ||
      reviewedValue === previousValue ||
      !LEARNABLE_SOURCES.has(suggestion.source)
    ) {
      return [];
    }

    return [{
      source: suggestion.source,
      profileKey: suggestion.source as ProfileFieldKey,
      previousValue,
      reviewedValue,
      confidence: Math.min(0.95, Math.max(0.6, suggestion.confidence)),
    }];
  });
}

export function applyApprovedProfileLearning(
  profile: CandidateRoleCard,
  updates: ProfileLearningUpdate[]
): CandidateRoleCard {
  const nextProfile: CandidateRoleCard = {
    ...profile,
    skills: [...profile.skills],
    projects: [...profile.projects],
    updatedAt: new Date(),
  };

  for (const update of updates) {
    if (update.profileKey === "skills" || update.profileKey === "projects") {
      continue;
    }

    nextProfile[update.profileKey] = update.reviewedValue;
  }

  return nextProfile;
}

export function createBrowserAgentInstruction(session: BrowserFillSession) {
  const lines = [
    "SyncHire Browser Fill Assistant Policy:",
    "1. Fill only the fields listed below.",
    "2. Never click Submit, Apply, Send, Finish, Next step, or any destructive/irreversible control.",
    "3. Stop after filling fields and leave the page for user review.",
    "4. If a value is missing or confidence is low, leave the field unchanged.",
    "",
    `Target URL: ${session.targetUrl}`,
    `Role: ${session.position || "Not specified"}`,
    `Company: ${session.company || "Not specified"}`,
    "",
    "Fields:",
    ...session.suggestions.map(
      (suggestion) =>
        `- ${suggestion.fieldLabel} (${suggestion.inputName}): ${suggestion.value}`
    ),
  ];

  return lines.join("\n");
}
