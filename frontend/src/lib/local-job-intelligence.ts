import type { CandidateRoleCard } from "./browser-fill-assistant";
import type { JobApplication, JobDescription, Resume } from "./store";
import { getMatchLevel } from "./match-ranking";
import type { LiteLocale } from "./lite-i18n";

export interface LocalApplicationContext {
  application: JobApplication;
  resume?: Resume;
  jd?: JobDescription;
}

export interface LocalInterviewQuestion {
  question: string;
  category: "hr" | "technical" | "behavioral" | "situational";
  priority: "high" | "medium" | "low";
  suggestedAnswer?: string;
  talkingPoints: string[];
}

export interface LocalInterviewPrepData {
  hrQuestions: LocalInterviewQuestion[];
  technicalQuestions: LocalInterviewQuestion[];
  behavioralQuestions: LocalInterviewQuestion[];
  selfIntroduction: {
    hook: string;
    structure: string[];
    customization: {
      highlightFromResume: string[];
      connectToJD: string[];
      demonstrateCulturalFit: string[];
    };
    example: string;
  };
  reverseQuestions: Array<{
    question: string;
    category: "company" | "role" | "team" | "growth" | "culture";
    whenToAsk: string;
  }>;
  checklist: Array<{
    category: string;
    items: string[];
    completed: boolean;
  }>;
  generatedAt: string;
  targetRole: string;
  targetCompany?: string;
}

export interface LocalAnalyticsResponse {
  overview: {
    total_applications: number;
    total_resumes: number;
    total_jds: number;
    active_applications: number;
    interview_count: number;
    offer_count: number;
    rejection_count: number;
    pending_count: number;
  };
  success_rates: {
    application_to_interview_rate: number;
    interview_to_offer_rate: number;
    overall_success_rate: number;
    average_match_score: number;
    total_applications: number;
  };
  status_distribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  recent_activity: Array<{
    date: string;
    applications: number;
    interviews: number;
    offers: number;
    rejections: number;
  }>;
  trends: Array<{
    period: string;
    applications: number;
    success_rate: number;
    avg_match_score: number;
  }>;
  insights: Array<{
    type: string;
    title: string;
    description: string;
    actionable: boolean;
    priority: string;
  }>;
  generated_at: string;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function percent(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMatchLevel(score: number, locale: LiteLocale) {
  const level = getMatchLevel(score);

  if (locale !== "zh-CN") {
    return level;
  }

  return {
    excellent: "优秀",
    good: "良好",
    fair: "一般",
    poor: "较低",
  }[level];
}

export function findLocalApplicationContext({
  applicationId,
  applications,
  resumes,
  jobDescriptions,
}: {
  applicationId: string;
  applications: JobApplication[];
  resumes: Resume[];
  jobDescriptions: JobDescription[];
}): LocalApplicationContext | null {
  const application = applications.find((item) => item.id === applicationId);

  if (!application) {
    return null;
  }

  return {
    application,
    resume: resumes.find((item) => item.id === application.resumeId),
    jd: jobDescriptions.find((item) => item.id === application.jobId),
  };
}

export function buildLocalInterviewPrep({
  context,
  profile,
  now = new Date(),
  locale = "en-US",
}: {
  context: LocalApplicationContext;
  profile: CandidateRoleCard;
  now?: Date;
  locale?: LiteLocale;
}): LocalInterviewPrepData {
  const { application, jd, resume } = context;
  const role = jd?.title || application.position || profile.targetTitle;
  const company = jd?.company || application.companyName;
  const jdSkills = unique([...(jd?.skills ?? []), ...(jd?.requirements ?? [])]).slice(0, 6);
  const profileSkills = unique(profile.skills).slice(0, 6);
  const highlightedSkills = unique([...jdSkills, ...profileSkills]).slice(0, 5);
  const projectProof = profile.projects[0] || resume?.experience?.[0] || "a local-first job application workflow";

  if (locale === "zh-CN") {
    const hrQuestions: LocalInterviewQuestion[] = [
      {
        question: `为什么你对 ${company} 感兴趣？`,
        category: "hr",
        priority: "high",
        suggestedAnswer: `把 ${company} 的 ${role} 岗位与你希望构建可靠用户产品的目标连接起来，并引用 ${projectProof} 作为证据。`,
        talkingPoints: [
          `目标岗位：${role}`,
          `候选人定位：${profile.personalSummary}`,
          "说明这是一个清晰的下一步，而不是随便投递的机会。",
        ],
      },
      {
        question: "请做一个自我介绍。",
        category: "hr",
        priority: "high",
        suggestedAnswer: `${profile.fullName} 是一名 ${profile.targetTitle} 候选人，优势集中在 ${profileSkills.slice(0, 4).join("、")}。`,
        talkingPoints: [
          profile.education,
          profile.personalSummary,
          projectProof,
        ],
      },
    ];

    const technicalQuestions: LocalInterviewQuestion[] = highlightedSkills.slice(0, 4).map((skill, index) => ({
      question: `你在真实项目中如何使用 ${skill}？`,
      category: "technical" as const,
      priority: index < 2 ? "high" as const : "medium" as const,
      suggestedAnswer: `用 ${projectProof} 项目作为证据，说明设计决策、权衡和结果。`,
      talkingPoints: [
        `展示你对 ${skill} 的具体实践。`,
        "说明实现边界和测试方式。",
        "补充下一轮你会如何改进。",
      ],
    }));

    const behavioralQuestions: LocalInterviewQuestion[] = [
      {
        question: "讲一次你根据用户反馈改进工作流的经历。",
        category: "behavioral",
        priority: "high",
        suggestedAnswer: "使用 STAR 结构：背景、任务、行动、结果。把答案落到已交付项目和用户痛点上。",
        talkingPoints: [
          "先讲清楚用户痛点。",
          "说明你负责的改动。",
          "用可观察的改善或复盘收尾。",
        ],
      },
      {
        question: "讲一次你处理不确定性的经历。",
        category: "behavioral",
        priority: "medium",
        talkingPoints: [
          "列出你澄清了哪些未知问题。",
          "说明你如何用小实验降低风险。",
          "解释收集证据后做出的决定。",
        ],
      },
    ];

    return {
      hrQuestions,
      technicalQuestions,
      behavioralQuestions,
      selfIntroduction: {
        hook: `${profile.fullName} 是 ${profile.graduationYear} 届毕业生，目标是 ${role}，实践重点包括 ${profileSkills.slice(0, 3).join("、")}。`,
        structure: [
          "用目标岗位和最强技术身份开场。",
          "给出一个与 JD 对应的项目证据。",
          "把动机连接到公司和团队。",
          "以入职 90 天能贡献什么收尾。",
        ],
        customization: {
          highlightFromResume: profileSkills.slice(0, 4),
          connectToJD: jdSkills.slice(0, 4),
          demonstrateCulturalFit: [
            "本地优先的隐私意识",
            "基于证据持续迭代",
            "对可靠用户工作流负责",
          ],
        },
        example: `你好，我是 ${profile.fullName}。我是一名 ${profile.targetTitle} 候选人，专注于 ${profileSkills.slice(0, 4).join("、")}。我最近最能证明能力的项目是 ${projectProof}。针对 ${company} 的 ${role} 岗位，我能带来本地优先的产品意识、扎实的测试习惯，以及持续改善真实用户流程的执行力。`,
      },
      reverseQuestions: [
        {
          question: "这个岗位入职前 90 天的成功标准是什么？",
          category: "role",
          whenToAsk: "业务或主管面",
        },
        {
          question: "团队这个季度最关注改善哪条用户流程或产品指标？",
          category: "team",
          whenToAsk: "技术或产品面",
        },
        {
          question: "团队在交付候选人侧功能时，如何平衡速度、可靠性和隐私？",
          category: "culture",
          whenToAsk: "终面",
        },
      ],
      checklist: [
        {
          category: "公司研究",
          items: [
            `复盘 ${company} 的产品和近期招聘背景。`,
            "把每条岗位要求映射到一个简历证据。",
            "准备一个关于团队优先级的问题。",
          ],
          completed: false,
        },
        {
          category: "面试准备",
          items: [
            "大声练习自我介绍两遍。",
            `准备 ${highlightedSkills.slice(0, 3).join("、")} 的项目例子。`,
            "准备一个失败复盘故事和一个改进故事。",
          ],
          completed: false,
        },
        {
          category: "跟进",
          items: [
            "记录面试官姓名和后续跟进时间。",
            "面试后更新 SyncHire 申请备注。",
          ],
          completed: false,
        },
      ],
      generatedAt: now.toISOString(),
      targetRole: role,
      targetCompany: company,
    };
  }

  const hrQuestions: LocalInterviewQuestion[] = [
    {
      question: `Why are you interested in ${company}?`,
      category: "hr",
      priority: "high",
      suggestedAnswer: `Connect ${company}'s ${role} opportunity to your goal of building reliable user-facing products and your recent work on ${projectProof}.`,
      talkingPoints: [
        `Target role: ${role}`,
        `Candidate positioning: ${profile.personalSummary}`,
        "Explain why this team is a strong next step, not just any opening.",
      ],
    },
    {
      question: "Tell me about yourself.",
      category: "hr",
      priority: "high",
      suggestedAnswer: `${profile.fullName} is a ${profile.targetTitle} candidate with strengths in ${profileSkills.slice(0, 4).join(", ")}.`,
      talkingPoints: [
        profile.education,
        profile.personalSummary,
        projectProof,
      ],
    },
  ];

  const technicalQuestions: LocalInterviewQuestion[] = highlightedSkills.slice(0, 4).map((skill, index) => ({
    question: `How have you used ${skill} in a real project?`,
    category: "technical" as const,
    priority: index < 2 ? "high" as const : "medium" as const,
    suggestedAnswer: `Use the ${projectProof} project as evidence, then explain the design decision, tradeoff, and measurable result.`,
    talkingPoints: [
      `Show concrete experience with ${skill}.`,
      "Explain the implementation boundary and testing approach.",
      "Mention what you would improve in the next iteration.",
    ],
  }));

  const behavioralQuestions: LocalInterviewQuestion[] = [
    {
      question: "Describe a time you improved a workflow after user feedback.",
      category: "behavioral",
      priority: "high",
      suggestedAnswer: "Use STAR: situation, task, action, result. Anchor the answer in a shipped project and a user pain point.",
      talkingPoints: [
        "Start with the user pain point.",
        "Explain the change you owned.",
        "Close with measurable improvement or learning.",
      ],
    },
    {
      question: "Tell me about a time you handled ambiguity.",
      category: "behavioral",
      priority: "medium",
      talkingPoints: [
        "Define the unknowns you clarified.",
        "Show how you reduced risk with a small experiment.",
        "Explain the decision you made after collecting evidence.",
      ],
    },
  ];

  return {
    hrQuestions,
    technicalQuestions,
    behavioralQuestions,
    selfIntroduction: {
      hook: `${profile.fullName} is a ${profile.graduationYear} graduate targeting ${role} roles with a practical focus on ${profileSkills.slice(0, 3).join(", ")}.`,
      structure: [
        "Open with target role and strongest technical identity.",
        "Show one project proof point tied to the job description.",
        "Connect your motivation to the company and team.",
        "Close with what you can contribute in the first 90 days.",
      ],
      customization: {
        highlightFromResume: profileSkills.slice(0, 4),
        connectToJD: jdSkills.slice(0, 4),
        demonstrateCulturalFit: [
          "Local-first privacy mindset",
          "Evidence-driven iteration",
          "Reliable user workflow ownership",
        ],
      },
      example: `Hi, I am ${profile.fullName}. I am a ${profile.targetTitle} candidate focused on ${profileSkills.slice(0, 4).join(", ")}. My strongest recent proof point is ${projectProof}. For ${company}'s ${role} role, I would bring a local-first product mindset, strong testing habits, and a bias toward improving real user workflows.`,
    },
    reverseQuestions: [
      {
        question: "What does success look like for this role in the first 90 days?",
        category: "role",
        whenToAsk: "Hiring manager round",
      },
      {
        question: "Which user workflow or product metric is the team most focused on improving this quarter?",
        category: "team",
        whenToAsk: "Technical or product round",
      },
      {
        question: "How does the team balance speed, reliability, and privacy when shipping candidate-facing features?",
        category: "culture",
        whenToAsk: "Final round",
      },
    ],
    checklist: [
      {
        category: "Research",
        items: [
          `Review ${company}'s product and recent hiring context.`,
          `Map each listed requirement to one resume proof point.`,
          "Prepare one question about team priorities.",
        ],
        completed: false,
      },
      {
        category: "Preparation",
        items: [
          "Practice the self-introduction out loud twice.",
          `Prepare examples for ${highlightedSkills.slice(0, 3).join(", ")}.`,
          "Prepare one failure story and one improvement story.",
        ],
        completed: false,
      },
      {
        category: "Follow-up",
        items: [
          "Record interviewer names and follow-up timing.",
          "Update SyncHire application notes after the interview.",
        ],
        completed: false,
      },
    ],
    generatedAt: now.toISOString(),
    targetRole: role,
    targetCompany: company,
  };
}

export function buildLocalAnalytics({
  applications,
  resumes,
  jobDescriptions,
  now = new Date(),
  locale = "en-US",
}: {
  applications: JobApplication[];
  resumes: Resume[];
  jobDescriptions: JobDescription[];
  now?: Date;
  locale?: LiteLocale;
}): LocalAnalyticsResponse {
  const totalApplications = applications.length;
  const interviewCount = applications.filter((item) => item.status === "interview").length;
  const offerCount = applications.filter((item) => item.status === "offer").length;
  const rejectionCount = applications.filter((item) => item.status === "rejected").length;
  const pendingCount = applications.filter((item) => ["draft", "pending", "optimized", "applied"].includes(item.status)).length;
  const activeApplications = applications.filter((item) => !["rejected", "offer"].includes(item.status)).length;
  const scored = applications
    .map((item) => item.matchScore)
    .filter((score): score is number => typeof score === "number");
  const averageMatch = scored.length > 0
    ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
    : 0;
  const statuses = unique([
    "draft",
    "optimized",
    "applied",
    "interview",
    "offer",
    "rejected",
    "pending",
    ...applications.map((item) => item.status),
  ]);
  const statusDistribution = statuses
    .map((status) => {
      const count = applications.filter((item) => item.status === status).length;

      return {
        status,
        count,
        percentage: percent(count, totalApplications),
      };
    })
    .filter((item) => item.count > 0);
  const recentActivity = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (13 - index));
    const key = formatDateKey(date);
    const dayApplications = applications.filter((item) => formatDateKey(item.createdAt) === key);

    return {
      date: key,
      applications: dayApplications.length,
      interviews: dayApplications.filter((item) => item.status === "interview").length,
      offers: dayApplications.filter((item) => item.status === "offer").length,
      rejections: dayApplications.filter((item) => item.status === "rejected").length,
    };
  });
  const trends = Array.from({ length: 4 }, (_, index) => {
    const period = `W${index + 1}`;
    const weekApplications = applications.filter((item) => {
      const age = Math.floor((now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return age >= (3 - index) * 7 && age < (4 - index) * 7;
    });
    const weekScores = weekApplications
      .map((item) => item.matchScore)
      .filter((score): score is number => typeof score === "number");

    return {
      period,
      applications: weekApplications.length,
      success_rate: percent(weekApplications.filter((item) => ["interview", "offer"].includes(item.status)).length, weekApplications.length),
      avg_match_score: weekScores.length > 0
        ? Math.round(weekScores.reduce((sum, score) => sum + score, 0) / weekScores.length)
        : 0,
    };
  });
  const bestApplication = applications
    .filter((item) => typeof item.matchScore === "number")
    .toSorted((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))[0];
  const zh = locale === "zh-CN";
  const insights = [
    bestApplication
      ? {
          type: "success",
          title: zh ? "最高匹配机会" : "Highest-fit opportunity",
          description: zh
            ? `${bestApplication.companyName} - ${bestApplication.position} 当前匹配等级为${formatMatchLevel(bestApplication.matchScore ?? 0, locale)}，分数 ${bestApplication.matchScore}%。投递前请先审核岗位化简历。`
            : `${bestApplication.companyName} - ${bestApplication.position} is a ${getMatchLevel(bestApplication.matchScore ?? 0)} match at ${bestApplication.matchScore}%. Review the tailored resume before applying.`,
          actionable: true,
          priority: "high",
        }
      : null,
    pendingCount > 0
      ? {
          type: "opportunity",
          title: zh ? "申请管线需要推进" : "Pipeline needs follow-through",
          description: zh
            ? `${pendingCount} 条申请仍在等待下一步动作。请把已优化草稿转化为人工审核后的正式投递。`
            : `${pendingCount} applications are still waiting for a next action. Convert optimized drafts into reviewed manual submissions.`,
          actionable: true,
          priority: "medium",
        }
      : null,
    rejectionCount > 0
      ? {
          type: "info",
          title: zh ? "复用已关闭岗位的经验" : "Reuse lessons from closed roles",
          description: zh
            ? "记录未转化岗位的原因，并把经验反馈到后续角色卡和简历定位中。"
            : "Capture why rejected roles did not convert and feed the learning back into future role cards and resume positioning.",
          actionable: true,
          priority: "low",
        }
      : null,
  ].filter((item): item is LocalAnalyticsResponse["insights"][number] => item !== null);

  return {
    overview: {
      total_applications: totalApplications,
      total_resumes: resumes.length,
      total_jds: jobDescriptions.length,
      active_applications: activeApplications,
      interview_count: interviewCount,
      offer_count: offerCount,
      rejection_count: rejectionCount,
      pending_count: pendingCount,
    },
    success_rates: {
      application_to_interview_rate: percent(interviewCount + offerCount, totalApplications),
      interview_to_offer_rate: percent(offerCount, interviewCount + offerCount),
      overall_success_rate: percent(offerCount, totalApplications),
      average_match_score: averageMatch,
      total_applications: totalApplications,
    },
    status_distribution: statusDistribution,
    recent_activity: recentActivity,
    trends,
    insights,
    generated_at: now.toISOString(),
  };
}
