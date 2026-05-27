"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { JobApplication } from "@/lib/store";
import { rankApplications, getMatchStatistics, type MatchRankingOptions } from "@/lib/match-ranking";
import { ArrowUpDown, Filter, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchRankingControlsProps {
  applications: JobApplication[];
  onRankingChange: (ranked: ReturnType<typeof rankApplications>) => void;
  children?: React.ReactNode;
}

export function MatchRankingControls({
  applications,
  onRankingChange,
  children,
}: MatchRankingControlsProps) {
  const [options, setOptions] = useState<MatchRankingOptions>({
    sortBy: "matchScore",
    sortOrder: "desc",
    filterBy: {
      matchLevel: "all",
      minMatchScore: 0,
    },
  });

  const stats = useMemo(() => getMatchStatistics(applications), [applications]);

  const ranked = useMemo(() => {
    const result = rankApplications(applications, options);
    onRankingChange(result);
    return result;
  }, [applications, options, onRankingChange]);

  const updateOptions = (updates: Partial<MatchRankingOptions>) => {
    setOptions((prev) => ({
      ...prev,
      ...updates,
      filterBy: {
        ...prev.filterBy,
        ...updates.filterBy,
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-gray-600">平均匹配度</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.average}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-green-600" />
            <span className="text-xs text-gray-600">最高匹配度</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.max}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-4 w-4 rounded-full bg-green-600" />
            <span className="text-xs text-gray-600">优秀匹配</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.excellent}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-4 w-4 rounded-full bg-blue-600" />
            <span className="text-xs text-gray-600">良好匹配</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.good}</div>
        </Card>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">排序和筛选</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sort By */}
          <div className="space-y-2">
            <Label>排序方式</Label>
            <Select
              value={options.sortBy}
              onValueChange={(value) =>
                updateOptions({ sortBy: value as MatchRankingOptions["sortBy"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matchScore">匹配度</SelectItem>
                <SelectItem value="updatedAt">更新时间</SelectItem>
                <SelectItem value="createdAt">创建时间</SelectItem>
                <SelectItem value="position">职位名称</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label>排序顺序</Label>
            <Select
              value={options.sortOrder}
              onValueChange={(value) =>
                updateOptions({ sortOrder: value as "asc" | "desc" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="排序顺序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">降序</SelectItem>
                <SelectItem value="asc">升序</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Match Level Filter */}
          <div className="space-y-2">
            <Label>匹配等级</Label>
            <Select
              value={options.filterBy?.matchLevel ?? "all"}
              onValueChange={(value) =>
                updateOptions({
                  filterBy: { matchLevel: value as any },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="匹配等级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="excellent">优秀 (80%+)</SelectItem>
                <SelectItem value="good">良好 (60%+)</SelectItem>
                <SelectItem value="fair">一般 (40%+)</SelectItem>
                <SelectItem value="poor">较差 (&lt;40%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Minimum Match Score Slider */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label>最低匹配度: {(options.filterBy?.minMatchScore ?? 0)}%</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateOptions({ filterBy: { minMatchScore: 0 } })}
            >
              重置
            </Button>
          </div>
          <Slider
            value={[options.filterBy?.minMatchScore ?? 0]}
            onValueChange={([value]: number[]) =>
              updateOptions({ filterBy: { minMatchScore: value } })
            }
            max={100}
            step={5}
            className="mt-2"
          />
        </div>

        {/* Active Filters */}
        {(options.filterBy?.matchLevel !== "all" ||
          (options.filterBy?.minMatchScore ?? 0) > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">活跃筛选:</span>
              {options.filterBy?.matchLevel !== "all" && options.filterBy && (
                <Badge variant="secondary">
                  匹配等级: {options.filterBy.matchLevel}
                </Badge>
              )}
              {(options.filterBy?.minMatchScore ?? 0) > 0 && options.filterBy && (
                <Badge variant="secondary">
                  最低匹配度: {options.filterBy.minMatchScore}%
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateOptions({
                    filterBy: { matchLevel: "all", minMatchScore: 0 },
                  })
                }
              >
                清除筛选
              </Button>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            显示 <span className="font-semibold text-gray-900">{ranked.length}</span> 个结果，
            共 {applications.length} 个申请
          </p>
        </div>
      </Card>

      {/* Custom Children */}
      {children}
    </div>
  );
}
