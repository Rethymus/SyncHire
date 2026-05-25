"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ExternalLink,
  Filter,
} from "lucide-react";

interface SkillMatch {
  skill: string;
  hasSkill: boolean;
  required: boolean;
  matchQuality: "exact" | "partial" | "missing";
}

interface SkillGapAnalysisProps {
  skillMatches: SkillMatch[];
  missingRequiredSkills: string[];
  missingOptionalSkills: string[];
  onSkillClick?: (skill: string) => void;
}

type FilterType = "all" | "missing-required" | "missing-optional" | "matched";

export function SkillGapAnalysis({
  skillMatches,
  missingRequiredSkills,
  missingOptionalSkills,
  onSkillClick,
}: SkillGapAnalysisProps) {
  const [filter, setFilter] = React.useState<FilterType>("all");

  const filteredSkills = useMemo(() => {
    switch (filter) {
      case "missing-required":
        return skillMatches.filter((m) => !m.hasSkill && m.required);
      case "missing-optional":
        return skillMatches.filter((m) => !m.hasSkill && !m.required);
      case "matched":
        return skillMatches.filter((m) => m.hasSkill);
      default:
        return skillMatches;
    }
  }, [skillMatches, filter]);

  const stats = useMemo(() => {
    const total = skillMatches.length;
    const matched = skillMatches.filter((m) => m.hasSkill).length;
    const missingRequired = skillMatches.filter((m) => !m.hasSkill && m.required).length;
    const missingOptional = skillMatches.filter((m) => !m.hasSkill && !m.required).length;

    return {
      total,
      matched,
      missingRequired,
      missingOptional,
      matchRate: total > 0 ? (matched / total) * 100 : 0,
    };
  }, [skillMatches]);

  const getSkillIcon = (match: SkillMatch) => {
    if (!match.hasSkill) {
      return match.required ? (
        <AlertCircle className="h-4 w-4 text-red-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
      );
    }
    return match.matchQuality === "exact" ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : (
      <CheckCircle2 className="h-4 w-4 text-blue-600" />
    );
  };

  const getSkillBadgeClass = (match: SkillMatch) => {
    if (!match.hasSkill) {
      return match.required
        ? "bg-red-100 text-red-800 border-red-200"
        : "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    return match.matchQuality === "exact"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-blue-100 text-blue-800 border-blue-200";
  };

  const getSkillLabel = (match: SkillMatch) => {
    if (!match.hasSkill) {
      return match.required ? "必需缺失" : "可选缺失";
    }
    return match.matchQuality === "exact" ? "完全匹配" : "部分匹配";
  };

  return (
    <div className="space-y-4">
      {/* Statistics Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">技能缺口概览</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-sm text-gray-600">总技能数</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.matched}</div>
            <p className="text-sm text-gray-600">已匹配</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{stats.missingRequired}</div>
            <p className="text-sm text-gray-600">必需缺失</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.missingOptional}</div>
            <p className="text-sm text-gray-600">可选缺失</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">整体匹配率</span>
            <span className="text-lg font-bold text-gray-900">
              {stats.matchRate.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-600 h-full transition-all duration-300"
              style={{ width: `${stats.matchRate}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Critical Missing Skills Alert */}
      {stats.missingRequired > 0 && (
        <Card className="p-4 border-2 border-red-300 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-2">
                紧急：缺少 {stats.missingRequired} 个必需技能
              </h4>
              <p className="text-sm text-red-800 mb-3">
                这些技能是该职位的核心要求，建议优先学习以提升匹配度。
              </p>
              <div className="flex flex-wrap gap-2">
                {missingRequiredSkills.slice(0, 5).map((skill) => (
                  <Badge key={skill} variant="destructive" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {missingRequiredSkills.length > 5 && (
                  <Badge variant="destructive" className="text-xs">
                    +{missingRequiredSkills.length - 5} 更多
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          <Filter className="h-4 w-4 mr-2" />
          全部 ({stats.total})
        </Button>
        <Button
          variant={filter === "matched" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("matched")}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          已匹配 ({stats.matched})
        </Button>
        <Button
          variant={filter === "missing-required" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("missing-required")}
          className="bg-red-600 hover:bg-red-700"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          必需缺失 ({stats.missingRequired})
        </Button>
        <Button
          variant={filter === "missing-optional" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("missing-optional")}
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          可选缺失 ({stats.missingOptional})
        </Button>
      </div>

      {/* Skill List */}
      <Card className="p-4">
        <div className="space-y-2">
          {filteredSkills.length === 0 ? (
            <p className="text-center text-gray-500 py-8">没有符合条件的技能</p>
          ) : (
            filteredSkills.map((match) => (
              <div
                key={match.skill}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  match.hasSkill
                    ? "bg-green-50 border-green-200"
                    : match.required
                    ? "bg-red-50 border-red-200"
                    : "bg-yellow-50 border-yellow-200"
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  {getSkillIcon(match)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-medium",
                          match.hasSkill ? "text-gray-900" : "text-gray-700"
                        )}
                      >
                        {match.skill}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", getSkillBadgeClass(match))}
                      >
                        {getSkillLabel(match)}
                      </Badge>
                      {match.required && (
                        <Badge variant="destructive" className="text-xs">
                          必需
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {!match.hasSkill && onSkillClick && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSkillClick(match.skill)}
                    className="ml-2"
                  >
                    <BookOpen className="h-4 w-4 mr-1" />
                    学习资源
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Learning Resources Section */}
      {stats.missingRequired > 0 && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">推荐学习资源</h4>
          </div>
          <p className="text-sm text-blue-800 mb-3">
            基于您的技能缺口，我们推荐以下学习资源：
          </p>
          <div className="space-y-2">
            {missingRequiredSkills.slice(0, 3).map((skill) => (
              <div
                key={skill}
                className="flex items-center justify-between p-2 bg-white rounded border border-blue-200"
              >
                <span className="text-sm font-medium text-gray-900">{skill}</span>
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(`${skill} course tutorial`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    搜索课程
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// Add React import
import React from "react";
