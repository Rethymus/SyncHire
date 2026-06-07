import type { CandidateRoleCard } from "./browser-fill-assistant";
import type { JobDescription, Resume } from "./store";

function pickMatchedSkills(profile: CandidateRoleCard, jd?: JobDescription) {
  const jdText = `${jd?.description ?? ""} ${(jd?.requirements ?? []).join(" ")} ${(jd?.skills ?? []).join(" ")}`.toLowerCase();
  const matched = profile.skills.filter((skill) => jdText.includes(skill.toLowerCase()));

  return matched.length > 0 ? matched : profile.skills.slice(0, 6);
}

function inferHighlights(profile: CandidateRoleCard, jd?: JobDescription) {
  const matchedSkills = pickMatchedSkills(profile, jd);
  const role = jd?.title || profile.targetTitle;
  const company = jd?.company ? ` at ${jd.company}` : "";

  return [
    `Positioned for ${role}${company} with strongest evidence in ${matchedSkills.slice(0, 4).join(", ")}.`,
    `Built proof points around ${profile.projects[0] ?? "user-facing product delivery"}.`,
    `Ready to discuss role fit, availability (${profile.availability}), and work authorization (${profile.workAuthorization}).`,
  ];
}

export function generateTailoredResumeMarkdown({
  profile,
  resume,
  jd,
}: {
  profile: CandidateRoleCard;
  resume?: Resume;
  jd?: JobDescription;
}) {
  const matchedSkills = pickMatchedSkills(profile, jd);
  const highlights = inferHighlights(profile, jd);
  const originalContent = resume?.content?.trim();

  return [
    `# ${profile.fullName}`,
    `${profile.email} | ${profile.phone} | ${profile.location}`,
    profile.githubUrl,
    profile.linkedinUrl,
    profile.portfolioUrl,
    "",
    "## Target Role",
    `${jd?.title || profile.targetTitle}${jd?.company ? ` - ${jd.company}` : ""}`,
    "",
    "## Professional Summary",
    `${profile.personalSummary} This version is tailored to ${jd?.title || profile.targetTitle} by emphasizing ${matchedSkills.slice(0, 4).join(", ")}.`,
    "",
    "## Role Fit Highlights",
    ...highlights.map((item) => `- ${item}`),
    "",
    "## Skills",
    `- ${matchedSkills.join(", ")}`,
    "",
    "## Projects",
    ...profile.projects.map((project) => `- ${project}`),
    "",
    "## Education",
    `${profile.education}, ${profile.school}, ${profile.graduationYear}`,
    originalContent
      ? ["", "## Source Resume Notes", originalContent].join("\n")
      : "",
  ]
    .filter((section) => section !== "")
    .join("\n");
}
