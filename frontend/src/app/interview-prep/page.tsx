"use client";

import { useCallback, useState, useMemo, memo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { applicationAPI } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import {
  buildLocalInterviewPrep,
  findLocalApplicationContext,
} from "@/lib/local-job-intelligence";
import { useLiteCopy } from "@/lib/lite-i18n";
import { logger, LogCategory } from "@/lib/logger";
import {
  FileText,
  Briefcase,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Brain,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  GraduationCap,
  Building,
  TrendingUp,
  BookOpen,
  Award,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InterviewReviewStudio } from "@/components/resume-builder/interview-review-studio";

interface InterviewQuestion {
  question: string;
  category: "hr" | "technical" | "behavioral" | "situational";
  priority: "high" | "medium" | "low";
  suggestedAnswer?: string;
  talkingPoints: string[];
}

interface SelfIntroTemplate {
  hook: string;
  structure: string[];
  customization: {
    highlightFromResume: string[];
    connectToJD: string[];
    demonstrateCulturalFit: string[];
  };
  example: string;
}

interface ReverseQuestion {
  question: string;
  category: "company" | "role" | "team" | "growth" | "culture";
  whenToAsk: string;
}

interface ChecklistItem {
  category: string;
  items: string[];
  completed: boolean;
}

interface InterviewPrepData {
  hrQuestions: InterviewQuestion[];
  technicalQuestions: InterviewQuestion[];
  behavioralQuestions: InterviewQuestion[];
  selfIntroduction: SelfIntroTemplate;
  reverseQuestions: ReverseQuestion[];
  checklist: ChecklistItem[];
  generatedAt: string;
  targetRole: string;
  targetCompany?: string;
}

// Category icon mapping
const categoryIcons = {
  hr: User,
  technical: Brain,
  behavioral: MessageSquare,
  situational: Target,
};

// Priority badge styles
const priorityStyles = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

const COPY = {
  "en-US": {
    missingTitle: "Missing Application ID",
    missingDescription:
      "Please access this page from an application to generate interview preparation materials.",
    localLoading: "Local data is still loading. Please try again in a moment.",
    missingId: "Missing application ID",
    title: "Interview Preparation",
    subtitle: "AI-generated questions and preparation materials for your interview",
    generate: "Generate Interview Prep",
    generating: "Generating...",
    analyzing: "Analyzing your resume and job description...",
    analyzingHint: "This may take a moment",
    totalQuestions: "Total Questions",
    highPriority: "High Priority",
    targetRole: "Target Role",
    questionCount: "questions",
    suggestedAnswer: "Suggested Answer:",
    talkingPoints: "Key Talking Points:",
    selfIntro: "Self-Introduction Template",
    hook: "Hook",
    structure: "Structure",
    fromResume: "From Resume",
    connectToJD: "Connect to JD",
    culturalFit: "Cultural Fit",
    example: "Example",
    reverseQuestions: "Questions to Ask Interviewer",
    checklist: "Preparation Checklist",
    hr: "HR Screening Questions",
    technical: "Technical Deep-Dive Questions",
    behavioral: "Behavioral Questions",
    regenerate: "Regenerate Interview Prep",
    priority: {
      high: "high",
      medium: "medium",
      low: "low",
    },
    categories: {
      hr: "HR",
      technical: "technical",
      behavioral: "behavioral",
      situational: "situational",
      company: "company",
      role: "role",
      team: "team",
      growth: "growth",
      culture: "culture",
    },
  },
  "zh-CN": {
    missingTitle: "缺少申请 ID",
    missingDescription: "请从具体申请进入本页面，以生成面向该岗位的面试准备材料。",
    localLoading: "本地数据仍在加载，请稍后重试。",
    missingId: "缺少申请 ID",
    title: "面试准备",
    subtitle: "基于简历、职位描述和角色卡生成针对性面试材料",
    generate: "生成面试准备",
    generating: "生成中...",
    analyzing: "正在分析你的简历和职位描述...",
    analyzingHint: "这可能需要一点时间",
    totalQuestions: "问题总数",
    highPriority: "高优先级",
    targetRole: "目标岗位",
    questionCount: "个问题",
    suggestedAnswer: "建议回答：",
    talkingPoints: "关键表达点：",
    selfIntro: "自我介绍模板",
    hook: "开场钩子",
    structure: "讲述结构",
    fromResume: "来自简历",
    connectToJD: "连接 JD",
    culturalFit: "文化匹配",
    example: "示例",
    reverseQuestions: "可向面试官提问",
    checklist: "面试准备清单",
    hr: "HR 初筛问题",
    technical: "技术深挖问题",
    behavioral: "行为面试问题",
    regenerate: "重新生成面试准备",
    priority: {
      high: "高",
      medium: "中",
      low: "低",
    },
    categories: {
      hr: "HR",
      technical: "技术",
      behavioral: "行为",
      situational: "情景",
      company: "公司",
      role: "岗位",
      team: "团队",
      growth: "成长",
      culture: "文化",
    },
  },
} as const;

type InterviewPrepCopy = (typeof COPY)[keyof typeof COPY];

// Question Category Component
const QuestionCategory = memo(function QuestionCategory({
  title,
  icon: Icon,
  questions,
  color,
  copy,
}: {
  title: string;
  icon: typeof Brain;
  questions: InterviewQuestion[];
  color: string;
  copy: InterviewPrepCopy;
}) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const toggleQuestion = useCallback((question: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(question)) {
        newSet.delete(question);
      } else {
        newSet.add(question);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={cn("px-6 py-4 border-b border-gray-200 flex items-center gap-3", color)}>
        <Icon className="h-5 w-5" />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="ml-auto text-sm text-gray-600">{questions.length} {copy.questionCount}</span>
      </div>
      <div className="divide-y divide-gray-100">
        {questions.map((q, idx) => {
          const isExpanded = expandedQuestions.has(q.question);
          const IconComponent = categoryIcons[q.category];
          return (
            <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
              <button
                onClick={() => toggleQuestion(q.question)}
                className="w-full text-left flex items-start gap-3"
                aria-expanded={isExpanded}
              >
                <div className="flex-shrink-0 mt-1">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 flex-1">{q.question}</span>
                    <span
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full border",
                        priorityStyles[q.priority]
                      )}
                    >
                      {copy.priority[q.priority]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <IconComponent className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-600">{copy.categories[q.category]}</span>
                  </div>
                </div>
              </button>
              {isExpanded && (
                <div className="mt-4 ml-7 space-y-3">
                  {q.suggestedAnswer && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-900 mb-2">{copy.suggestedAnswer}</p>
                      <p className="text-sm text-blue-800">{q.suggestedAnswer}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">{copy.talkingPoints}</p>
                    <ul className="space-y-1">
                      {q.talkingPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Self Introduction Component
const SelfIntroduction = memo(function SelfIntroduction({
  intro,
  copy,
}: {
  intro: SelfIntroTemplate;
  copy: InterviewPrepCopy;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3 bg-gradient-to-r from-purple-50 to-blue-50">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">{copy.selfIntro}</h3>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{copy.hook}</h4>
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{intro.hook}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{copy.structure}</h4>
          <div className="space-y-2">
            {intro.structure.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-semibold">
                  {i + 1}
                </div>
                <span className="text-sm text-gray-700">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {copy.fromResume}
            </h5>
            <ul className="space-y-1">
              {intro.customization.highlightFromResume.map((item, i) => (
                <li key={i} className="text-xs text-blue-800">{item}</li>
              ))}
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {copy.connectToJD}
            </h5>
            <ul className="space-y-1">
              {intro.customization.connectToJD.map((item, i) => (
                <li key={i} className="text-xs text-green-800">{item}</li>
              ))}
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <Award className="h-4 w-4" />
              {copy.culturalFit}
            </h5>
            <ul className="space-y-1">
              {intro.customization.demonstrateCulturalFit.map((item, i) => (
                <li key={i} className="text-xs text-purple-800">{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{copy.example}</h4>
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{intro.example}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

// Reverse Questions Component
const ReverseQuestions = memo(function ReverseQuestions({
  questions,
  copy,
}: {
  questions: ReverseQuestion[];
  copy: InterviewPrepCopy;
}) {
  const categoryIcons = {
    company: Building,
    role: Briefcase,
    team: User,
    growth: TrendingUp,
    culture: Sparkles,
  };

  const categoryColors = {
    company: "bg-blue-100 text-blue-800",
    role: "bg-green-100 text-green-800",
    team: "bg-purple-100 text-purple-800",
    growth: "bg-orange-100 text-orange-800",
    culture: "bg-pink-100 text-pink-800",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3 bg-gradient-to-r from-green-50 to-teal-50">
        <Lightbulb className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">{copy.reverseQuestions}</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {questions.map((q, idx) => {
          const IconComponent = categoryIcons[q.category];
          return (
            <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <IconComponent className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-1">{q.question}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("px-2 py-1 text-xs font-medium rounded-full", categoryColors[q.category])}>
                      {copy.categories[q.category]}
                    </span>
                    <span className="text-xs text-gray-600">{q.whenToAsk}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Checklist Component
const PreparationChecklist = memo(function PreparationChecklist({
  checklist,
  copy,
}: {
  checklist: ChecklistItem[];
  copy: InterviewPrepCopy;
}) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((category: string, item: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      const key = `${category}-${item}`;
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  const categoryIcons = {
    Research: BookOpen,
    Preparation: GraduationCap,
    Logistics: Clock,
    "Follow-up": CheckSquare,
  };

  const categoryColors = {
    Research: "bg-blue-50 border-blue-200",
    Preparation: "bg-purple-50 border-purple-200",
    Logistics: "bg-green-50 border-green-200",
    "Follow-up": "bg-orange-50 border-orange-200",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3 bg-gradient-to-r from-orange-50 to-yellow-50">
        <CheckSquare className="h-5 w-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">{copy.checklist}</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {checklist.map((section, idx) => {
          const IconComponent = categoryIcons[section.category as keyof typeof categoryIcons] || CheckSquare;
          return (
            <div key={idx} className={cn("p-4", categoryColors[section.category as keyof typeof categoryColors] || "bg-gray-50 border-gray-200")}>
              <div className="flex items-center gap-2 mb-3">
                <IconComponent className="h-4 w-4 text-gray-700" />
                <h4 className="text-sm font-semibold text-gray-900">{section.category}</h4>
              </div>
              <div className="space-y-2">
                {section.items.map((item, i) => {
                  const key = `${section.category}-${item}`;
                  const isChecked = checkedItems.has(key);
                  return (
                    <label
                      key={i}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all",
                        isChecked ? "bg-white bg-opacity-60" : "hover:bg-white hover:bg-opacity-30"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(section.category, item)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className={cn("text-sm", isChecked ? "line-through text-gray-500" : "text-gray-700")}>
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

function InterviewPrepContent() {
  const { locale } = useLiteCopy();
  const copy = COPY[locale];
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");
  const {
    applications,
    candidateProfile,
    hasHydrated,
    jobDescriptions,
    resumes,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepData, setPrepData] = useState<InterviewPrepData | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const generateInterviewPrep = useCallback(async () => {
    if (!applicationId) {
      setError(copy.missingId);
      return;
    }

    if (!hasHydrated) {
      setError(copy.localLoading);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const localContext = findLocalApplicationContext({
        applicationId,
        applications,
        resumes,
        jobDescriptions,
      });

      if (hasHydrated && localContext) {
        setPrepData(buildLocalInterviewPrep({
          context: localContext,
          profile: candidateProfile,
          locale,
        }));
        logger.info(LogCategory.API, "Local interview prep generated successfully");
        return;
      }

      const response = await applicationAPI.getInterviewPrep(applicationId);

      if (response.error) {
        setError(response.error);
        logger.error(LogCategory.API, "Failed to generate interview prep", new Error(response.error));
        return;
      }

      if (response.data) {
        setPrepData(response.data as InterviewPrepData);
        logger.info(LogCategory.API, "Interview prep generated successfully");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to generate interview prep";
      setError(errorMsg);
      logger.error(LogCategory.API, "Failed to generate interview prep", err as Error);
    } finally {
      setLoading(false);
    }
  }, [
    applicationId,
    applications,
    candidateProfile,
    hasHydrated,
    jobDescriptions,
    locale,
    copy,
    resumes,
  ]);

  // Memoize stats
  const totalQuestions = useMemo(() => {
    if (!prepData) return 0;
    return prepData.hrQuestions.length + prepData.technicalQuestions.length + prepData.behavioralQuestions.length;
  }, [prepData]);

  const highPriorityCount = useMemo(() => {
    if (!prepData) return 0;
    const allQuestions = [
      ...prepData.hrQuestions,
      ...prepData.technicalQuestions,
      ...prepData.behavioralQuestions,
    ];
    return allQuestions.filter(q => q.priority === "high").length;
  }, [prepData]);

  if (!applicationId) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900">{copy.missingTitle}</h3>
              <p className="mt-2 text-sm text-yellow-800">
                {copy.missingDescription}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{copy.title}</h1>
              <p className="mt-2 text-lg text-gray-700">
                {copy.subtitle}
              </p>
            </div>
            {!prepData && (
              <Button
                onClick={generateInterviewPrep}
                disabled={loading || !hasHydrated}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    {copy.generating}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {copy.generate}
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => setReviewOpen(true)}
              size="lg"
              variant="outline"
              className="border-gray-300 text-gray-800 hover:bg-gray-50"
            >
              <Brain className="h-4 w-4 mr-2" />
              {locale === "zh-CN" ? "面试复盘" : "Interview Review"}
            </Button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {loading && !prepData && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Clock className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-spin" />
            <p className="text-lg font-medium text-gray-900">{copy.analyzing}</p>
            <p className="mt-2 text-sm text-gray-600">{copy.analyzingHint}</p>
          </div>
        )}

        {prepData && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{copy.totalQuestions}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{totalQuestions}</p>
                  </div>
                  <MessageSquare className="h-10 w-10 text-purple-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{copy.highPriority}</p>
                    <p className="mt-2 text-3xl font-bold text-red-600">{highPriorityCount}</p>
                  </div>
                  <AlertCircle className="h-10 w-10 text-red-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{copy.targetRole}</p>
                    <p className="mt-2 text-xl font-bold text-gray-900">{prepData.targetRole}</p>
                    {prepData.targetCompany && (
                      <p className="text-sm text-gray-600">{prepData.targetCompany}</p>
                    )}
                  </div>
                  <Target className="h-10 w-10 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Self Introduction */}
            <div className="mb-8">
              <SelfIntroduction intro={prepData.selfIntroduction} copy={copy} />
            </div>

            {/* Questions */}
            <div className="space-y-8 mb-8">
              <QuestionCategory
                title={copy.hr}
                icon={User}
                questions={prepData.hrQuestions}
                color="bg-blue-50"
                copy={copy}
              />
              <QuestionCategory
                title={copy.technical}
                icon={Brain}
                questions={prepData.technicalQuestions}
                color="bg-purple-50"
                copy={copy}
              />
              <QuestionCategory
                title={copy.behavioral}
                icon={MessageSquare}
                questions={prepData.behavioralQuestions}
                color="bg-green-50"
                copy={copy}
              />
            </div>

            {/* Reverse Questions */}
            <div className="mb-8">
              <ReverseQuestions questions={prepData.reverseQuestions} copy={copy} />
            </div>

            {/* Checklist */}
            <div className="mb-8">
              <PreparationChecklist checklist={prepData.checklist} copy={copy} />
            </div>

            {/* Regenerate Button */}
            <div className="text-center">
              <Button
                onClick={generateInterviewPrep}
                disabled={loading}
                variant="outline"
                size="lg"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {copy.regenerate}
              </Button>
            </div>
          </>
        )}
      </div>

      <InterviewReviewStudio
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        targetRole={prepData?.targetRole}
        targetCompany={prepData?.targetCompany}
      />
    </div>
  );
}

function InterviewPrepPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Clock className="h-8 w-8 text-purple-600 animate-spin" /></div>}>
      <InterviewPrepContent />
    </Suspense>
  );
}

export default InterviewPrepPage;
