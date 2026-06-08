"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
} from "lucide-react";

interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  details: string[];
}

interface SkillMatch {
  skill: string;
  hasSkill: boolean;
  required: boolean;
  matchQuality: "exact" | "partial" | "missing";
}

interface MatchScoreBreakdownProps {
  overallScore: number;
  overallPercentage: number;
  matchLevel: "excellent" | "good" | "fair" | "poor";
  hardSkillsScore: CategoryScore;
  softSkillsScore: CategoryScore;
  experienceScore: CategoryScore;
  educationScore: CategoryScore;
  skillMatches: SkillMatch[];
  missingSkills: string[];
  missingRequiredSkills: string[];
  additionalSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

const matchLevelConfig = {
  excellent: {
    label: "优秀匹配",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: CheckCircle2,
  },
  good: {
    label: "良好匹配",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: TrendingUp,
  },
  fair: {
    label: "一般匹配",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    icon: AlertTriangle,
  },
  poor: {
    label: "较差匹配",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
  },
};

const categoryColors = {
  "Hard Skills": "bg-blue-500",
  "Soft Skills": "bg-purple-500",
  "Experience": "bg-green-500",
  "Education": "bg-orange-500",
  "硬技能": "bg-blue-500",
  "软技能": "bg-purple-500",
  "项目经历": "bg-green-500",
  "教育背景": "bg-orange-500",
};

export function MatchScoreBreakdown({
  overallScore,
  overallPercentage,
  matchLevel,
  hardSkillsScore,
  softSkillsScore,
  experienceScore,
  educationScore,
  skillMatches,
  missingSkills,
  missingRequiredSkills,
  additionalSkills,
  strengths,
  weaknesses,
  recommendations,
}: MatchScoreBreakdownProps) {
  const config = matchLevelConfig[matchLevel];
  const LevelIcon = config.icon;

  const categoryScores = useMemo(
    () => [hardSkillsScore, softSkillsScore, experienceScore, educationScore],
    [hardSkillsScore, softSkillsScore, experienceScore, educationScore]
  );

  const matchedSkills = skillMatches.filter((m) => m.hasSkill);
  const exactMatches = matchedSkills.filter((m) => m.matchQuality === "exact");
  const partialMatches = matchedSkills.filter((m) => m.matchQuality === "partial");

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card
        className={cn(
          "p-6 border-2",
          config.borderColor,
          config.bgColor
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <LevelIcon className={cn("h-8 w-8", config.color)} />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {overallPercentage.toFixed(1)}%
              </h3>
              <p className={cn("text-sm font-medium", config.color)}>
                {config.label}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">综合得分</p>
            <p className="text-lg font-semibold text-gray-900">
              {overallScore.toFixed(1)} 分
            </p>
          </div>
        </div>
        <Progress value={overallPercentage} className="h-3" />
      </Card>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoryScores.map((category) => (
          <Card key={category.category} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{category.category}</h4>
              <span className="text-sm text-gray-600">
                {category.score.toFixed(1)} / {category.maxScore}
              </span>
            </div>
            <Progress
              value={category.percentage}
              className={cn("h-2", categoryColors[category.category as keyof typeof categoryColors])}
            />
            <p className="text-xs text-gray-500 mt-2">{category.details[0]}</p>
          </Card>
        ))}
      </div>

      {/* Skill Matching Statistics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">技能匹配统计</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{exactMatches.length}</div>
            <p className="text-xs text-gray-600">完全匹配</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{partialMatches.length}</div>
            <p className="text-xs text-gray-600">部分匹配</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{missingSkills.length}</div>
            <p className="text-xs text-gray-600">缺失技能</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{additionalSkills.length}</div>
            <p className="text-xs text-gray-600">额外技能</p>
          </div>
        </div>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        {strengths.length > 0 && (
          <Card className="p-4 border-green-200 bg-green-50">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-900">优势</h4>
            </div>
            <ul className="space-y-2">
              {strengths.map((strength, index) => (
                <li key={index} className="text-sm text-green-800 flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h4 className="font-semibold text-red-900">劣势</h4>
            </div>
            <ul className="space-y-2">
              {weaknesses.map((weakness, index) => (
                <li key={index} className="text-sm text-red-800 flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">改进建议</h4>
          </div>
          <ul className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">{index + 1}.</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Missing Required Skills Alert */}
      {missingRequiredSkills.length > 0 && (
        <Card className="p-4 border-2 border-red-300 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-2">
                缺少必需技能
              </h4>
              <div className="flex flex-wrap gap-2">
                {missingRequiredSkills.map((skill) => (
                  <Badge key={skill} variant="destructive">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
