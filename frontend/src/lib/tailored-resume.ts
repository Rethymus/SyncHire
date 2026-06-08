import type { CandidateRoleCard } from "./browser-fill-assistant";
import type { JobDescription, Resume } from "./store";

function pickMatchedSkills(profile: CandidateRoleCard, jd?: JobDescription) {
  const jdText = `${jd?.description ?? ""} ${(jd?.requirements ?? []).join(" ")} ${(jd?.skills ?? []).join(" ")}`.toLowerCase();
  const matched = profile.skills.filter((skill) => jdText.includes(skill.toLowerCase()));

  return matched.length > 0 ? matched : profile.skills.slice(0, 6);
}

function inferChineseHighlights(profile: CandidateRoleCard, jd?: JobDescription) {
  const matchedSkills = pickMatchedSkills(profile, jd);
  const role = jd?.title || profile.targetTitle;
  const company = jd?.company ? `（${jd.company}）` : "";

  return [
    `围绕 ${role}${company} 强化 ${matchedSkills.slice(0, 4).join("、")} 等岗位相关能力。`,
    `优先呈现“${profile.projects[0] ?? "用户侧产品交付"}”等可验证项目证据，避免空泛自我评价。`,
    `可沟通到岗时间（${profile.availability}）与工作资格（${profile.workAuthorization}），便于招聘方快速判断匹配度。`,
  ];
}

function compactOriginalNotes(content?: string) {
  if (!content?.trim()) return [];

  return content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^#+\s*/.test(line))
    .slice(0, 6);
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
  const highlights = inferChineseHighlights(profile, jd);
  const originalNotes = compactOriginalNotes(resume?.content);
  const targetTitle = jd?.title || profile.targetTitle;
  const targetLine = `${targetTitle}${jd?.company ? ` - ${jd.company}` : ""}`;
  const projects = profile.projects.length > 0 ? profile.projects : ["课程项目或个人项目待补充"];

  return [
    `# ${profile.fullName}`,
    [profile.location, profile.phone, profile.email, profile.githubUrl, profile.linkedinUrl, profile.portfolioUrl]
      .filter(Boolean)
      .join(" | "),
    "",
    "## 求职意向",
    `${targetLine}，可围绕岗位要求展示项目、课程、实习和工程实践证据。`,
    "",
    "## 个人简介",
    `${profile.personalSummary} 本版本重点突出 ${matchedSkills.slice(0, 5).join("、")}，用于匹配 ${targetTitle}。`,
    "",
    "## 岗位匹配亮点",
    ...highlights.map((item) => `- ${item}`),
    "",
    "## 教育背景",
    `### ${profile.school} | ${profile.education}`,
    `${profile.graduationYear ? `${profile.graduationYear} 届` : "毕业时间待补充"}`,
    "- 建议补充 GPA、专业排名、核心课程、竞赛或论文等真实信息。",
    "",
    "## 专业技能",
    `- **岗位相关技能**：${matchedSkills.join("、")}`,
    `- **工程协作**：Git、代码评审、需求拆解、问题复盘、自动化测试`,
    "- **简历证据边界**：以下内容仅基于已有角色卡、简历和职位描述生成，请在投递前核对真实性。",
    "",
    "## 项目经历",
    ...projects.flatMap((project, index) => [
      `### ${project}`,
      `- 结合 ${targetTitle} 要求，描述你在项目中的具体职责、技术选择和交付结果。`,
      `- 建议补充可验证指标，例如性能提升、测试覆盖、用户规模、缺陷修复数量或交付周期。`,
      `- 用一句话说明该项目与 ${matchedSkills[index % matchedSkills.length] ?? "岗位技能"} 的关联，避免只罗列技术名词。`,
    ]),
    "",
    "## 实习 / 校园实践",
    "- 如有实习，请按“公司/团队 | 岗位 | 时间”补充，并用 2-3 条 bullet 说明任务、行动和结果。",
    "- 如暂无实习，可补充课程设计、社团技术职责、开源贡献、比赛或实验室项目。",
    originalNotes.length > 0 ? "" : "",
    originalNotes.length > 0 ? "## 原始简历可用证据" : "",
    ...originalNotes.map((item) => `- ${item}`),
  ]
    .filter((section) => section !== "")
    .join("\n");
}
