"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Briefcase,
  GraduationCap,
  Award,
} from "lucide-react";

interface MatchAnalysisDisplayProps {
  matchData: {
    match_score: number;
    match_details?: {
      skills_match: number;
      experience_match: number;
      education_match: number;
      missing_skills: string[];
      recommendations: string[];
      skill_gaps?: Array<{
        skill: string;
        required: boolean;
        importance: "high" | "medium" | "low";
      }>;
      experience_gaps?: Array<{
        area: string;
        required_years: number;
        estimated_years: number;
      }>;
    };
  };
}

export function MatchAnalysisDisplay({ matchData }: MatchAnalysisDisplayProps) {
  const matchScore = matchData.match_score || 0;
  const matchDetails = matchData.match_details || {
    skills_match: 0,
    experience_match: 0,
    education_match: 0,
    missing_skills: [],
    recommendations: [],
    skill_gaps: [],
    experience_gaps: [],
  };

  const matchLevel = useMemo(() => {
    if (matchScore >= 80) return { level: "优秀", color: "text-green-600", bgColor: "bg-green-100" };
    if (matchScore >= 60) return { level: "良好", color: "text-blue-600", bgColor: "bg-blue-100" };
    if (matchScore >= 40) return { level: "一般", color: "text-yellow-600", bgColor: "bg-yellow-100" };
    return { level: "较差", color: "text-red-600", bgColor: "bg-red-100" };
  }, [matchScore]);

  const skillsMatch = matchDetails.skills_match || 0;
  const experienceMatch = matchDetails.experience_match || 0;
  const educationMatch = matchDetails.education_match || 0;
  const missingSkills = matchDetails.missing_skills || [];
  const recommendations = matchDetails.recommendations || [];
  const skillGaps = matchDetails.skill_gaps || [];
  const experienceGaps = matchDetails.experience_gaps || [];

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="text-center py-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="relative inline-block">
          <div className={`text-7xl font-bold ${matchLevel.color}`}>
            {Math.round(matchScore)}%
          </div>
          <div className={`text-lg font-medium ${matchLevel.color} mt-2`}>
            {matchLevel.level}匹配
          </div>
        </div>
        <p className="text-gray-600 mt-4">
          基于AI分析您的简历与职位要求的匹配程度
        </p>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">技能匹配</h3>
              <p className="text-sm text-gray-600">{Math.round(skillsMatch)}%</p>
            </div>
          </div>
          <Progress value={skillsMatch} className="h-2" />
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">经验匹配</h3>
              <p className="text-sm text-gray-600">{Math.round(experienceMatch)}%</p>
            </div>
          </div>
          <Progress value={experienceMatch} className="h-2" />
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <GraduationCap className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">教育匹配</h3>
              <p className="text-sm text-gray-600">{Math.round(educationMatch)}%</p>
            </div>
          </div>
          <Progress value={educationMatch} className="h-2" />
        </Card>
      </div>

      {/* Missing Skills */}
      {missingSkills.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">技能差距</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingSkills.map((skill: string, index: number) => (
              <Badge key={index} variant="outline" className="text-orange-700 border-orange-300">
                {skill}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-4">
            这些技能在职位要求中提及，但您的简历中未体现
          </p>
        </Card>
      )}

      {/* Skill Gaps Detailed */}
      {skillGaps.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">详细技能分析</h3>
          </div>
          <div className="space-y-3">
            {skillGaps.map((gap: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {gap.required ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="font-medium text-gray-900">{gap.skill}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      gap.importance === "high"
                        ? "border-red-300 text-red-700"
                        : gap.importance === "medium"
                        ? "border-yellow-300 text-yellow-700"
                        : "border-gray-300 text-gray-700"
                    }
                  >
                    {gap.importance === "high" ? "重要" : gap.importance === "medium" ? "中等" : "一般"}
                  </Badge>
                  {gap.required && (
                    <span className="text-xs text-red-600 font-medium">必需</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Experience Gaps */}
      {experienceGaps.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">经验差距分析</h3>
          </div>
          <div className="space-y-3">
            {experienceGaps.map((gap: any, index: number) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{gap.area}</span>
                  <Badge
                    variant="outline"
                    className={gap.estimated_years >= gap.required_years ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}
                  >
                    {gap.estimated_years >= gap.required_years ? "符合" : "不足"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>要求: {gap.required_years} 年</span>
                  <span>→</span>
                  <span>估计: {gap.estimated_years} 年</span>
                </div>
                {gap.estimated_years < gap.required_years && (
                  <div className="mt-2 text-sm text-red-600">
                    差距: {gap.required_years - gap.estimated_years} 年
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-gray-900">优化建议</h3>
          </div>
          <div className="space-y-3">
            {recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Overall Assessment */}
      <Card className="p-6 border-2 border-blue-200 bg-blue-50">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Award className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">综合评估</h3>
            <p className="text-sm text-gray-700">
              {matchScore >= 80 &&
                "您的简历与该职位高度匹配，建议立即申请。在申请时可以强调您的核心技能和相关经验。"}
              {matchScore >= 60 && matchScore < 80 &&
                "您的简历与该职位匹配度良好，建议在申请前针对技能差距进行优化，突出相关经验。"}
              {matchScore >= 40 && matchScore < 60 &&
                "您的简历与该职位存在一定差距，建议先提升相关技能和经验，或寻找更匹配的职位。"}
              {matchScore < 40 &&
                "您的简历与该职位匹配度较低，建议寻找更适合的职位，或大幅提升相关技能后再申请。"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
