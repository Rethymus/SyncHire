"use client";

import { useCallback, useMemo, memo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
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
};

export const ApplicationsList = memo(function ApplicationsList() {
  const { applications } = useAppStore();

  const sortedApplications = useMemo(() => {
    return [...applications].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }, [applications]);

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
      {sortedApplications.map((application) => {
        const config = statusConfig[application.status];
        const StatusIcon = config.icon;

        return (
          <div
            key={application.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
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
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{application.companyName}</p>
                  <div className="flex items-center gap-4 text-sm">
                    {application.matchScore !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-blue-600" />
                        <span className="text-gray-700">
                          匹配度: <span className="font-semibold">{application.matchScore}%</span>
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
      })}
    </div>
  );
});