"use client";

import { useState, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { ResumeUpload } from "@/components/resume-upload";
import { JDInput } from "@/components/jd-input";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Settings,
  LogOut,
  User,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Menu,
  X,
} from "lucide-react";

const steps = [
  { id: 1, name: "上传简历", icon: FileText, status: "current" },
  { id: 2, name: "输入职位描述", icon: Briefcase, status: "upcoming" },
  { id: 3, name: "AI 分析匹配", icon: TrendingUp, status: "upcoming" },
  { id: 4, name: "生成优化简历", icon: CheckCircle2, status: "upcoming" },
];

function DashboardPage() {
  const { resumes, currentJD, applications } = useAppStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Memoize stats to avoid recalculation on every render
  const stats = useMemo(() => [
    {
      name: "总申请数",
      value: applications.length,
      icon: Briefcase,
      color: "bg-blue-500",
    },
    {
      name: "面试邀请",
      value: applications.filter((a) => a.status === "interview").length,
      icon: CheckCircle2,
      color: "bg-green-500",
    },
    {
      name: "处理中",
      value: applications.filter((a) => a.status === "applied").length,
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      name: "已拒绝",
      value: applications.filter((a) => a.status === "rejected").length,
      icon: XCircle,
      color: "bg-red-500",
    },
  ], [applications]);

  // Memoize recent applications to avoid re-slicing on every render
  const recentApplications = useMemo(() => applications.slice(0, 5), [applications]);

  // Memoize sidebar toggle handler
  const toggleSidebar = useCallback(() => {
    setMobileSidebarOpen(prev => !prev);
  }, []);

  // Memoize close sidebar handler
  const closeSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  // Memoize step change handlers
  const goToStep1 = useCallback(() => setCurrentStep(1), []);
  const goToStep2 = useCallback(() => setCurrentStep(2), []);
  const goToStep3 = useCallback(() => setCurrentStep(3), []);
  const goToStep4 = useCallback(() => setCurrentStep(4), []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="flex flex-col md:flex-row">
        {/* Mobile menu button */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-16 z-40">
          <button
            onClick={toggleSidebar}
            className="flex items-center gap-2 text-gray-700 w-full px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            aria-expanded={mobileSidebarOpen}
            aria-label="切换菜单"
          >
            {mobileSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="font-medium">导航菜单</span>
          </button>
        </div>

        {/* Sidebar */}
        <aside
          className={cn(
            "bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] transition-all duration-300 ease-in-out",
            mobileSidebarOpen ? "w-full md:w-64" : "hidden md:w-64 md:block",
            "p-6"
          )}
          aria-label="主导航"
        >
          <nav className="space-y-2" aria-label="仪表盘导航">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-gray-900 rounded-lg bg-gray-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-inset min-h-[44px]"
              aria-current="page"
              onClick={closeSidebar}
            >
              <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              控制台
            </Link>
            <Link
              href="/dashboard/applications"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-inset min-h-[44px]"
              onClick={closeSidebar}
            >
              <Briefcase className="h-5 w-5" aria-hidden="true" />
              职位申请
            </Link>
            <Link
              href="/dashboard/resumes"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-inset min-h-[44px]"
              onClick={closeSidebar}
            >
              <FileText className="h-5 w-5" aria-hidden="true" />
              我的简历
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-inset min-h-[44px]"
              onClick={closeSidebar}
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
              设置
            </Link>
          </nav>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center gap-3 px-4 py-3" role="presentation">
              <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center" aria-hidden="true">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  用户
                </p>
                <p className="text-xs text-gray-600 truncate">
                  user@example.com
                </p>
              </div>
            </div>
            <button
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-inset min-h-[44px]"
              aria-label="退出登录"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              退出登录
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                欢迎回来
              </h1>
              <p className="mt-2 text-gray-700">
                开始您今天的求职旅程
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.name}
                  className="bg-white rounded-lg p-6 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Steps */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-8">
                <h2 id="steps-heading" className="text-xl font-semibold text-gray-900">
                  创建新申请
                </h2>
                <nav className="flex gap-2" aria-labelledby="steps-heading">
                  <ol className="flex gap-2" role="list">
                    {steps.map((step, idx) => (
                      <li key={step.id} className="flex items-center">
                        <span
                          className={`flex items-center justify-center w-8 h-8 rounded-full ${
                            currentStep >= step.id
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
                          aria-current={currentStep === step.id ? "step" : undefined}
                        >
                          {step.id}
                        </span>
                        {idx < steps.length - 1 && (
                          <div
                            className={`w-16 h-1 ${
                              currentStep > step.id ? "bg-blue-600" : "bg-gray-200"
                            }`}
                            aria-hidden="true"
                          />
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>

              <div className="space-y-8">
                {currentStep === 1 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      上传您的简历
                    </h3>
                    <ResumeUpload />
                    {resumes.length > 0 && (
                      <div className="mt-6 flex justify-end">
                        <Button onClick={goToStep2}>
                          下一步
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 2 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      输入职位描述
                    </h3>
                    <JDInput />
                    {currentJD && (
                      <div className="mt-6 flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={goToStep1}
                        >
                          上一步
                        </Button>
                        <Button onClick={goToStep3}>
                          下一步
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      AI 正在分析匹配度
                    </h3>
                    <p className="text-gray-700 mb-6">
                      这可能需要几秒钟时间...
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="outline"
                        onClick={goToStep2}
                      >
                        上一步
                      </Button>
                      <Button onClick={goToStep4}>
                        查看结果
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      分析完成！
                    </h3>
                    <p className="text-gray-700 mb-6">
                      您的简历与职位匹配度为 85%
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="outline"
                        onClick={goToStep1}
                      >
                        创建新申请
                      </Button>
                      <Button>
                        查看详细报告
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                最近活动
              </h2>
              {applications.length > 0 ? (
                <div className="space-y-4">
                  {recentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {app.position}
                        </p>
                        <p className="text-sm text-gray-700">
                          {app.companyName}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            app.status === "interview"
                              ? "bg-green-100 text-green-800"
                              : app.status === "applied"
                              ? "bg-blue-100 text-blue-800"
                              : app.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {app.status === "interview"
                            ? "面试中"
                            : app.status === "applied"
                            ? "已申请"
                            : app.status === "rejected"
                            ? "已拒绝"
                            : "草稿"}
                        </span>
                        <span className="text-sm text-gray-600">
                          {new Date(app.createdAt).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  暂无活动记录
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default memo(DashboardPage);
