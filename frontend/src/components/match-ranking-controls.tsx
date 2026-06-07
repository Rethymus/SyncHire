"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useLiteCopy } from "@/lib/lite-i18n";

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
  const { t } = useLiteCopy();
  const copy = t.matchControls;
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
    return rankApplications(applications, options);
  }, [applications, options]);

  useEffect(() => {
    onRankingChange(ranked);
  }, [onRankingChange, ranked]);

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
            <span className="text-xs text-gray-600">{copy.averageMatch}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.average}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-green-600" />
            <span className="text-xs text-gray-600">{copy.highestMatch}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.max}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-4 w-4 rounded-full bg-green-600" />
            <span className="text-xs text-gray-600">{copy.excellentMatch}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.excellent}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-4 w-4 rounded-full bg-blue-600" />
            <span className="text-xs text-gray-600">{copy.goodMatch}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.good}</div>
        </Card>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">{copy.sortAndFilter}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sort By */}
          <div className="space-y-2">
            <Label>{copy.sortBy}</Label>
            <Select
              value={options.sortBy}
              onValueChange={(value) =>
                updateOptions({ sortBy: value as MatchRankingOptions["sortBy"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={copy.sortByPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matchScore">{copy.sortOptions.matchScore}</SelectItem>
                <SelectItem value="updatedAt">{copy.sortOptions.updatedAt}</SelectItem>
                <SelectItem value="createdAt">{copy.sortOptions.createdAt}</SelectItem>
                <SelectItem value="position">{copy.sortOptions.position}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label>{copy.sortOrder}</Label>
            <Select
              value={options.sortOrder}
              onValueChange={(value) =>
                updateOptions({ sortOrder: value as "asc" | "desc" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={copy.sortOrderPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">{copy.descending}</SelectItem>
                <SelectItem value="asc">{copy.ascending}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Match Level Filter */}
          <div className="space-y-2">
            <Label>{copy.matchLevel}</Label>
            <Select
              value={options.filterBy?.matchLevel ?? "all"}
              onValueChange={(value) =>
                updateOptions({
                  filterBy: { matchLevel: value as any },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={copy.matchLevelPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.levels.all}</SelectItem>
                <SelectItem value="excellent">{copy.levels.excellent}</SelectItem>
                <SelectItem value="good">{copy.levels.good}</SelectItem>
                <SelectItem value="fair">{copy.levels.fair}</SelectItem>
                <SelectItem value="poor">{copy.levels.poor}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Minimum Match Score Slider */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label>{copy.minimumMatch}: {(options.filterBy?.minMatchScore ?? 0)}%</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateOptions({ filterBy: { minMatchScore: 0 } })}
            >
              {copy.reset}
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
              <span className="text-sm text-gray-600">{copy.activeFilters}</span>
              {options.filterBy?.matchLevel !== "all" && options.filterBy && (
                <Badge variant="secondary">
                  {copy.matchLevelFilter}: {options.filterBy.matchLevel}
                </Badge>
              )}
              {(options.filterBy?.minMatchScore ?? 0) > 0 && options.filterBy && (
                <Badge variant="secondary">
                  {copy.minimumMatchFilter}: {options.filterBy.minMatchScore}%
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
                {copy.clearFilters}
              </Button>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {copy.showing} <span className="font-semibold text-gray-900">{ranked.length}</span> {copy.results},
            {" "}{applications.length} {copy.total}
          </p>
        </div>
      </Card>

      {/* Custom Children */}
      {children}
    </div>
  );
}
