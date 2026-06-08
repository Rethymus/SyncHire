"use client";

import { useMemo, useState } from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store";
import { useLiteCopy } from "@/lib/lite-i18n";
import {
  DEFAULT_BROWSER_FORM_FIELDS,
  buildReviewedFieldMap,
  collectProfileLearningUpdates,
  createBrowserAgentInstruction,
  createBrowserFillPlan,
  mergeReviewedFieldReport,
  parseBrowserReviewedFieldReport,
  type BrowserFillSession,
  type CandidateRoleCard,
} from "@/lib/browser-fill-assistant";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  IdCard,
  Lock,
  PencilLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type ProfileFormState = Omit<CandidateRoleCard, "updatedAt" | "skills" | "projects"> & {
  skills: string;
  projects: string;
};

type ProfileDraftState = {
  profileVersion: number;
  values: ProfileFormState;
};

const COPY = {
  "en-US": {
    title: "Role Card & Browser Fill Assistant",
    subtitle:
      "Keep your job-search identity local, generate reviewed fill plans, and let users approve every final submission.",
    privacy: "Local-only profile. No cloud storage. No automatic submission.",
    profileTitle: "Candidate role card",
    profileSubtitle:
      "This is the local source of truth SyncHire uses to personalize resumes and browser form filling.",
    saveProfile: "Save role card",
    fillTitle: "Browser fill plan",
    fillSubtitle:
      "Simulate an agent-assisted application form. SyncHire fills fields, stops before submit, and waits for user review.",
    targetUrl: "Target application URL",
    company: "Company",
    position: "Position",
    generatePlan: "Generate fill plan",
    runDemoFill: "Fill demo form",
    instructionTitle: "Agent instruction",
    instructionHint:
      "Use this policy with Kimi WebBridge or a similar local browser agent. It explicitly forbids submit actions.",
    reviewTitle: "User review and learning",
    reviewSubtitle:
      "Edit generated values as the user would. SyncHire learns only after explicit approval.",
    collectChanges: "Detect user edits",
    applyAgentReport: "Apply browser report",
    reportPlaceholder:
      'Paste the reviewed field report returned by the browser agent, for example {"fields":[{"fieldId":"phone","value":"+86 139 1111 2222"}]}',
    approveLearning: "Approve and update role card",
    noChanges: "No learnable user edits detected yet.",
    learned: "Role card updated from approved user edits.",
    confidence: "confidence",
    before: "Before",
    afterUserEdit: "After user edit",
    submitDisabled: "Submit disabled for manual user review",
    submitGuard:
      "Submit controls are intentionally excluded. The user must audit the page and submit manually.",
    recentSessions: "Recent local fill sessions",
    autoSubmit: "Auto submit",
    emptySessions: "No browser fill sessions yet.",
    demoForm: "Demo application form",
    demoNotice: "Filled values are staged for review only. Submit stays disabled.",
    fields: {
      fullName: "Full name",
      email: "Email",
      phone: "Phone",
      location: "Location",
      targetTitle: "Target role",
      education: "Education",
      school: "School",
      graduationYear: "Graduation year",
      portfolioUrl: "Portfolio URL",
      linkedinUrl: "LinkedIn URL",
      githubUrl: "GitHub URL",
      workAuthorization: "Work authorization",
      availability: "Availability",
      salaryExpectation: "Salary expectation",
      personalSummary: "Personal summary",
      skills: "Skills",
      projects: "Projects",
    },
  },
  "zh-CN": {
    title: "角色卡与浏览器填表助手",
    subtitle:
      "把个人信息留在本地，生成可审核的填表计划，让用户掌握最后提交权。",
    privacy: "个人信息仅本地保存。不上传云端。不自动提交。",
    profileTitle: "候选人角色卡",
    profileSubtitle:
      "这是 SyncHire 用于个性化简历和浏览器表单预填的本地事实来源。",
    saveProfile: "保存角色卡",
    fillTitle: "浏览器填表计划",
    fillSubtitle:
      "模拟 agent 辅助填写申请表：SyncHire 只填字段，提交前停止，等待用户审核。",
    targetUrl: "目标投递页面 URL",
    company: "公司",
    position: "职位",
    generatePlan: "生成填表计划",
    runDemoFill: "填入演示表单",
    instructionTitle: "Agent 执行指令",
    instructionHint:
      "可交给 Kimi WebBridge 或类似本地浏览器 agent 使用，策略明确禁止点击提交。",
    reviewTitle: "用户审核与学习",
    reviewSubtitle:
      "像真实用户一样修改预填内容。SyncHire 只有在明确同意后才学习更新。",
    collectChanges: "检测用户修改",
    applyAgentReport: "应用浏览器回传",
    reportPlaceholder:
      '粘贴浏览器 agent 返回的审核字段报告，例如 {"fields":[{"fieldId":"phone","value":"+86 139 1111 2222"}]}',
    approveLearning: "同意并更新角色卡",
    noChanges: "还没有检测到可学习的用户修改。",
    learned: "已根据用户同意的修改更新角色卡。",
    confidence: "置信度",
    before: "修改前",
    afterUserEdit: "用户修改后",
    submitDisabled: "提交已禁用，等待用户人工审核",
    submitGuard:
      "提交控件已被刻意排除。页面必须由用户审核后手动提交。",
    recentSessions: "最近本地填表会话",
    autoSubmit: "自动提交",
    emptySessions: "还没有浏览器填表会话。",
    demoForm: "演示申请表",
    demoNotice: "填入内容仅用于审核暂存，提交按钮保持禁用。",
    fields: {
      fullName: "姓名",
      email: "邮箱",
      phone: "手机号",
      location: "所在地",
      targetTitle: "目标岗位",
      education: "学历",
      school: "学校",
      graduationYear: "毕业年份",
      portfolioUrl: "作品集 URL",
      linkedinUrl: "LinkedIn URL",
      githubUrl: "GitHub URL",
      workAuthorization: "工作许可",
      availability: "到岗时间",
      salaryExpectation: "期望薪资",
      personalSummary: "个人简介",
      skills: "技能",
      projects: "项目经历",
    },
  },
};

function toFormState(profile: CandidateRoleCard): ProfileFormState {
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    targetTitle: profile.targetTitle,
    education: profile.education,
    school: profile.school,
    graduationYear: profile.graduationYear,
    portfolioUrl: profile.portfolioUrl,
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    workAuthorization: profile.workAuthorization,
    availability: profile.availability,
    salaryExpectation: profile.salaryExpectation,
    personalSummary: profile.personalSummary,
    skills: profile.skills.join(", "),
    projects: profile.projects.join("\n"),
  };
}

function getProfileVersion(profile: CandidateRoleCard) {
  return profile.updatedAt.getTime();
}

function parseList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProfilePage() {
  const { locale } = useLiteCopy();
  const copy = COPY[locale];
  const {
    candidateProfile,
    browserFillSessions,
    hasHydrated,
    updateCandidateProfile,
    addBrowserFillSession,
    updateBrowserFillSession,
    approveProfileLearning,
  } = useAppStore();
  const profileVersion = getProfileVersion(candidateProfile);
  const [profileDraft, setProfileDraft] = useState<ProfileDraftState>(() => ({
    profileVersion,
    values: toFormState(candidateProfile),
  }));
  const [targetUrl, setTargetUrl] = useState("https://jobs.example.com/apply/frontend-new-grad");
  const [company, setCompany] = useState(locale === "zh-CN" ? "北极星实验室" : "Northstar Labs");
  const [position, setPosition] = useState(locale === "zh-CN" ? "应届前端工程师" : "Graduate Frontend Engineer");
  const [activeSession, setActiveSession] = useState<BrowserFillSession | null>(null);
  const [reviewValues, setReviewValues] = useState<Record<string, string>>({});
  const [agentReport, setAgentReport] = useState("");
  const [learningMessage, setLearningMessage] = useState("");
  const formState =
    profileDraft.profileVersion === profileVersion
      ? profileDraft.values
      : toFormState(candidateProfile);

  const learningUpdates = useMemo(() => {
    if (!activeSession) {
      return [];
    }

    return collectProfileLearningUpdates(activeSession.suggestions, reviewValues);
  }, [activeSession, reviewValues]);

  const agentInstruction = useMemo(() => {
    if (!activeSession) {
      return "";
    }

    return createBrowserAgentInstruction(activeSession);
  }, [activeSession]);

  const updateField = (key: keyof ProfileFormState, value: string) => {
    setProfileDraft({
      profileVersion,
      values: { ...formState, [key]: value },
    });
  };

  const saveProfile = () => {
    updateCandidateProfile({
      ...formState,
      skills: parseList(formState.skills),
      projects: formState.projects
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    setLearningMessage("");
  };

  const buildNewSession = () => {
    const session = createBrowserFillPlan({
      profile: candidateProfile,
      fields: DEFAULT_BROWSER_FORM_FIELDS,
      targetUrl,
      company,
      position,
    });

    return session;
  };

  const activateSession = (session: BrowserFillSession) => {
    if (!hasHydrated) {
      return;
    }

    addBrowserFillSession(session);
    setActiveSession(session);
    setReviewValues(buildReviewedFieldMap(session.suggestions));
    setAgentReport("");
    setLearningMessage("");
  };

  const generatePlan = () => {
    if (!hasHydrated) {
      return;
    }

    activateSession(buildNewSession());
  };

  const runDemoFill = () => {
    if (!hasHydrated) {
      return;
    }

    const session = activeSession ?? buildNewSession();

    if (!activeSession) {
      addBrowserFillSession(session);
      setReviewValues(buildReviewedFieldMap(session.suggestions));
      setAgentReport("");
    }

    updateBrowserFillSession(session.id, {
      status: "filled-awaiting-review",
    });
    setActiveSession({
      ...session,
      status: "filled-awaiting-review",
    });
    setLearningMessage("");
  };

  const applyAgentReport = () => {
    if (!activeSession) {
      return;
    }

    const parsedReport = parseBrowserReviewedFieldReport(agentReport);
    const nextValues = mergeReviewedFieldReport(
      activeSession.suggestions,
      reviewValues,
      parsedReport
    );

    setReviewValues(nextValues);
    setLearningMessage("");
  };

  const approveLearning = () => {
    if (!activeSession) {
      return;
    }

    if (learningUpdates.length === 0) {
      setLearningMessage(copy.noChanges);
      return;
    }

    approveProfileLearning(activeSession.id, learningUpdates);
    setLearningMessage(copy.learned);
  };

  const fields = copy.fields;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Breadcrumb />
        </div>

        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
              <Lock className="h-4 w-4" />
              {copy.privacy}
            </div>
            <h1 className="text-3xl font-bold text-gray-950">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-gray-700">{copy.subtitle}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
            <div>
              <p className="text-2xl font-bold text-gray-950">{candidateProfile.skills.length}</p>
              <p className="text-xs text-gray-600">{fields.skills}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-950">{browserFillSessions.length}</p>
              <p className="text-xs text-gray-600">{copy.recentSessions}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-950">0</p>
              <p className="text-xs text-gray-600">{copy.autoSubmit}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <IdCard className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>{copy.profileTitle}</CardTitle>
                  <p className="mt-1 text-sm text-gray-600">{copy.profileSubtitle}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {([
                  ["fullName", fields.fullName],
                  ["email", fields.email],
                  ["phone", fields.phone],
                  ["location", fields.location],
                  ["targetTitle", fields.targetTitle],
                  ["education", fields.education],
                  ["school", fields.school],
                  ["graduationYear", fields.graduationYear],
                  ["portfolioUrl", fields.portfolioUrl],
                  ["linkedinUrl", fields.linkedinUrl],
                  ["githubUrl", fields.githubUrl],
                  ["workAuthorization", fields.workAuthorization],
                  ["availability", fields.availability],
                  ["salaryExpectation", fields.salaryExpectation],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      value={formState[key]}
                      onChange={(event) => updateField(key, event.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="personalSummary">{fields.personalSummary}</Label>
                  <Textarea
                    id="personalSummary"
                    rows={4}
                    value={formState.personalSummary}
                    onChange={(event) => updateField("personalSummary", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills">{fields.skills}</Label>
                  <Textarea
                    id="skills"
                    rows={3}
                    value={formState.skills}
                    onChange={(event) => updateField("skills", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projects">{fields.projects}</Label>
                  <Textarea
                    id="projects"
                    rows={4}
                    value={formState.projects}
                    onChange={(event) => updateField("projects", event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button type="button" onClick={saveProfile}>
                  <CheckCircle2 className="h-4 w-4" />
                  {copy.saveProfile}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{copy.fillTitle}</CardTitle>
                    <p className="mt-1 text-sm text-gray-600">{copy.fillSubtitle}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetUrl">{copy.targetUrl}</Label>
                    <Input
                      id="targetUrl"
                      type="url"
                      value={targetUrl}
                      onChange={(event) => setTargetUrl(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company">{copy.company}</Label>
                      <Input
                        id="company"
                        value={company}
                        onChange={(event) => setCompany(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">{copy.position}</Label>
                      <Input
                        id="position"
                        value={position}
                        onChange={(event) => setPosition(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                      <p>{copy.submitGuard}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={generatePlan}
                      disabled={!hasHydrated}
                      data-testid="generate-fill-plan"
                    >
                      <Sparkles className="h-4 w-4" />
                      {copy.generatePlan}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={runDemoFill}
                      disabled={!hasHydrated}
                      data-testid="fill-demo-form"
                    >
                      <PencilLine className="h-4 w-4" />
                      {copy.runDemoFill}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {activeSession && (
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{copy.instructionTitle}</CardTitle>
                      <p className="mt-1 text-sm text-gray-600">{copy.instructionHint}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-72 overflow-auto rounded-lg bg-gray-950 p-4 text-xs leading-relaxed text-gray-100">
                    {agentInstruction}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {activeSession && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{copy.demoForm}</CardTitle>
                    <p className="mt-1 text-sm text-gray-600">{copy.demoNotice}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeSession.suggestions.map((suggestion) => {
                    const value = reviewValues[suggestion.fieldId] ?? "";
                    const isTextarea = suggestion.kind === "textarea";

                    return (
                      <div key={suggestion.fieldId} className="space-y-2">
                        <Label htmlFor={`review-${suggestion.fieldId}`}>
                          {suggestion.fieldLabel}
                        </Label>
                        {isTextarea ? (
                          <Textarea
                            id={`review-${suggestion.fieldId}`}
                            rows={4}
                            value={value}
                            onChange={(event) =>
                              setReviewValues((current) => ({
                                ...current,
                                [suggestion.fieldId]: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          <Input
                            id={`review-${suggestion.fieldId}`}
                            value={value}
                            onChange={(event) =>
                              setReviewValues((current) => ({
                                ...current,
                                [suggestion.fieldId]: event.target.value,
                              }))
                            }
                          />
                        )}
                        <p className="text-xs text-gray-500">
                          {Math.round(suggestion.confidence * 100)}% {copy.confidence} - {suggestion.reason}
                        </p>
                      </div>
                    );
                  })}
                  <Button type="button" disabled className="w-full">
                    {copy.submitDisabled}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{copy.reviewTitle}</CardTitle>
                    <p className="mt-1 text-sm text-gray-600">{copy.reviewSubtitle}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-3">
                  <Button type="button" variant="outline" onClick={() => setLearningMessage("")}>
                    {copy.collectChanges}
                  </Button>
                  <Button type="button" variant="outline" onClick={applyAgentReport}>
                    {copy.applyAgentReport}
                  </Button>
                  <Button type="button" onClick={approveLearning}>
                    {copy.approveLearning}
                  </Button>
                </div>

                <div className="mb-4 space-y-2">
                  <Label htmlFor="agentReport">{copy.applyAgentReport}</Label>
                  <Textarea
                    id="agentReport"
                    rows={5}
                    value={agentReport}
                    onChange={(event) => setAgentReport(event.target.value)}
                    placeholder={copy.reportPlaceholder}
                  />
                </div>

                {learningMessage && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    {learningMessage}
                  </div>
                )}

                {learningUpdates.length > 0 ? (
                  <div className="space-y-3">
                    {learningUpdates.map((update) => (
                      <div
                        key={`${update.profileKey}-${update.reviewedValue}`}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {fields[update.profileKey]}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">{copy.before}</p>
                        <p className="text-sm text-gray-700">{update.previousValue}</p>
                        <p className="mt-2 text-xs text-gray-500">{copy.afterUserEdit}</p>
                        <p className="text-sm font-medium text-gray-950">{update.reviewedValue}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    {copy.noChanges}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{copy.recentSessions}</CardTitle>
          </CardHeader>
          <CardContent>
            {browserFillSessions.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {browserFillSessions.slice(0, 6).map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setActiveSession(session);
                      setReviewValues(buildReviewedFieldMap(session.suggestions));
                      setAgentReport("");
                      setLearningMessage("");
                    }}
                    className="rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <p className="font-semibold text-gray-950">{session.position || copy.position}</p>
                    <p className="text-sm text-gray-600">{session.company || copy.company}</p>
                    <p className="mt-2 text-xs text-gray-500">{session.targetUrl}</p>
                    <p className="mt-3 text-xs font-medium text-blue-700">{session.status}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">{copy.emptySessions}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
