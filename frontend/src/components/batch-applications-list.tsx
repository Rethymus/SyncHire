"use client";

import { useCallback, useMemo, memo, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ApplicationStatusManager } from "@/components/application-status-manager";
import { BatchOperationsToolbar } from "@/components/batch-operations-toolbar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Target,
  MessageSquare,
  TrendingUp,
  ChevronRight,
  ArrowUpDown,
  Tag as TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { rankApplications, getMatchLevel } from "@/lib/match-ranking";
import { JobApplication } from "@/lib/store";

const statusConfig: Record<string, {
  label: string;
  icon: any;
  color: string;
  borderColor: string;
}> = {
  draft: {
    label: "草稿",
    icon: FileText,
    color: "bg-gray-100 text-gray-800",
    borderColor: "border-gray-200",
  },
  applied: {
    label: "已申请",
    icon: Clock,
    color: "bg-blue-100 text-blue-800",
    borderColor: "border-blue-200",
  },
  interview: {
    label: "面试中",
    icon: MessageSquare,
    color: "bg-purple-100 text-purple-800",
    borderColor: "border-purple-200",
  },
  offer: {
    label: "已录用",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-800",
    borderColor: "border-green-200",
  },
  rejected: {
    label: "已拒绝",
    icon: XCircle,
    color: "bg-red-100 text-red-800",
    borderColor: "border-red-200",
  },
  optimized: {
    label: "已优化",
    icon: TrendingUp,
    color: "bg-green-100 text-green-800",
    borderColor: "border-green-200",
  },
  pending: {
    label: "处理中",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800",
    borderColor: "border-yellow-200",
  },
};

interface ApplicationItemProps {
  application: JobApplication & { rank?: number };
  isSelected: boolean;
  onSelectChange: (id: string, selected: boolean) => void;
  onStatusUpdate: (id: string, status: string) => void;
  sortBy: "matchScore" | "updatedAt";
}

const ApplicationItem = memo(function ApplicationItem({
  application,
  isSelected,
  onSelectChange,
  onStatusUpdate,
  sortBy,
}: ApplicationItemProps) {
  const config = statusConfig[application.status];
  const StatusIcon = config.icon;
  const tags = (application as any)?.tags || [];

  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border hover:shadow-md transition-all overflow-hidden",
        isSelected ? "border-2 border-blue-400 bg-blue-50" : "border-gray-200"
      )}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Selection Checkbox */}
          <div className="pt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) =>
                onSelectChange(application.id, checked as boolean)
              }
              aria-label={`Select ${application.position} at ${application.companyName}`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {application.position}
              </h3>
              <span
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full border flex items-center gap-1.5 flex-shrink-0",
                  config.color,
                  config.borderColor
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </span>
              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <TagIcon className="h-3 w-3 text-gray-500" />
                  <div className="flex gap-1">
                    {tags.slice(0, 2).map((tag: string, idx: number) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs px-2 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {tags.length > 2 && (
                      <Badge variant="outline" className="text-xs px-2 py-0">
                        +{tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">{application.companyName}</p>
            <div className="flex items-center gap-4 text-sm">
              {/* Rank Badge */}
              {sortBy === "matchScore" && application.matchScore !== undefined && application.rank && (
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    application.rank <= 3 ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white" : "bg-gray-200 text-gray-700"
                  )}>
                    {application.rank}
                  </div>
                </div>
              )}
              {application.matchScore !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-700">
                    匹配度: <span className="font-semibold">{application.matchScore}%</span>
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded",
                    getMatchLevel(application.matchScore) === "excellent" && "bg-green-100 text-green-800",
                    getMatchLevel(application.matchScore) === "good" && "bg-blue-100 text-blue-800",
                    getMatchLevel(application.matchScore) === "fair" && "bg-yellow-100 text-yellow-800",
                    getMatchLevel(application.matchScore) === "poor" && "bg-red-100 text-red-800"
                  )}>
                    {getMatchLevel(application.matchScore) === "excellent" && "优秀"}
                    {getMatchLevel(application.matchScore) === "good" && "良好"}
                    {getMatchLevel(application.matchScore) === "fair" && "一般"}
                    {getMatchLevel(application.matchScore) === "poor" && "较差"}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">
                  {application.updatedAt.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ApplicationStatusManager
              applicationId={application.id}
              currentStatus={application.status}
              onStatusUpdate={(newStatus) => onStatusUpdate(application.id, newStatus)}
            />
            <Link href={`/editor?applicationId=${application.id}`}>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                编辑简历
              </Button>
            </Link>
            <Link href={`/interview-prep?applicationId=${application.id}`}>
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <MessageSquare className="h-4 w-4 mr-2" />
                面试准备
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={`/applications/${application.id}`}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
          >
            查看详情
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/applications/${application.id}/match`}
            className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
          >
            查看匹配分析
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href={`/interview-prep?applicationId=${application.id}`}
            className="text-sm text-purple-600 hover:text-purple-800 transition-colors font-medium"
          >
            生成面试准备
          </Link>
        </div>
      </div>
    </div>
  );
});

export const BatchApplicationsList = memo(function BatchApplicationsList({
  showRanking = false,
}: { showRanking?: boolean }) {
  const { applications, updateApplication } = useAppStore();
  const [sortBy, setSortBy] = useState<"matchScore" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleStatusUpdate = useCallback(
    (applicationId: string, newStatus: string) => {
      updateApplication(applicationId, { status: newStatus as any });
    },
    [updateApplication]
  );

  const sortedApplications = useMemo(() => {
    const ranked = rankApplications(applications, {
      sortBy,
      sortOrder,
      filterBy: { matchLevel: "all" },
    });

    return ranked;
  }, [applications, sortBy, sortOrder]);

  const toggleSort = (field: "matchScore" | "updatedAt") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleSelectAll = useCallback(() => {
    const allSelected = selectedIds.size === sortedApplications.length;
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedApplications.map((app) => app.id)));
    }
  }, [selectedIds, sortedApplications]);

  const handleSelectionChange = useCallback(
    (id: string, selected: boolean) => {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
        return newSet;
      });
    },
    []
  );

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无申请</h3>
        <p className="text-sm text-gray-600 mb-6">
          创建您的第一个职位申请来开始求职之旅
        </p>
        <Button asChild>
          <Link href="/dashboard">创建申请</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sorting Controls */}
      {showRanking && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">排序方式:</span>
            <div className="flex gap-2">
              <Button
                variant={sortBy === "matchScore" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort("matchScore")}
              >
                <Target className="h-4 w-4 mr-2" />
                匹配度
                {sortBy === "matchScore" && (
                  <ArrowUpDown className="h-3 w-3 ml-2" />
                )}
              </Button>
              <Button
                variant={sortBy === "updatedAt" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort("updatedAt")}
              >
                <Clock className="h-4 w-4 mr-2" />
                更新时间
                {sortBy === "updatedAt" && (
                  <ArrowUpDown className="h-3 w-3 ml-2" />
                )}
              </Button>
            </div>
            <div className="ml-auto text-sm text-gray-600">
              显示 {sortedApplications.length} 个结果
            </div>
          </div>
        </div>
      )}

      {/* Batch Operations Toolbar */}
      <BatchOperationsToolbar
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onSelectionChange={(ids) => setSelectedIds(ids)}
        totalApplications={sortedApplications.length}
        applications={applications}
      />

      {/* Applications List */}
      {sortedApplications.map((application) => (
        <ApplicationItem
          key={application.id}
          application={application}
          isSelected={selectedIds.has(application.id)}
          onSelectChange={handleSelectionChange}
          onStatusUpdate={handleStatusUpdate}
          sortBy={sortBy}
        />
      ))}
    </div>
  );
});
