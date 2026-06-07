/**
 * Dashboard Page - Lightweight Version
 *
 * Simplified dashboard without authentication or user-specific data.
 */

"use client";

import { useState, useMemo, memo } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button } from "@/components/ui/button";
import { ApplicationCreateDialog } from "@/components/application-create-dialog";
import { useAppStore } from "@/lib/store";
import { formatLiteDate, useLiteCopy } from "@/lib/lite-i18n";
import {
  FileText,
  Briefcase,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Plus,
  FolderOpen,
} from "lucide-react";

function DashboardPage() {
  const { resumes, jobDescriptions, applications } = useAppStore();
  const { locale, t } = useLiteCopy();
  const dashboard = t.dashboard;
  const loading = false;
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);

  // Memoize stats to avoid recalculation on every render
  const stats = useMemo(() => [
    {
      name: dashboard.stats.resumes,
      value: resumes.length,
      icon: FileText,
      color: "bg-blue-500",
      href: "/upload",
    },
    {
      name: dashboard.stats.jobDescriptions,
      value: jobDescriptions.length,
      icon: Briefcase,
      color: "bg-green-500",
      href: "/jd-input",
    },
    {
      name: dashboard.stats.applications,
      value: applications.length,
      icon: BarChart3,
      color: "bg-purple-500",
      href: "/applications",
    },
    {
      name: dashboard.stats.interviews,
      value: applications.filter((a) => a.status === "interview").length,
      icon: CheckCircle2,
      color: "bg-emerald-500",
      href: "/applications?status=interview",
    },
  ], [resumes.length, jobDescriptions.length, applications, dashboard.stats]);

  // Memoize recent applications
  const recentApplications = useMemo(() => {
    return applications
      .toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [applications]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "interview":
        return "bg-green-100 text-green-800";
      case "applied":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "offer":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "interview":
        return t.applicationStatus.interview;
      case "applied":
        return t.applicationStatus.applied;
      case "rejected":
        return t.applicationStatus.rejected;
      case "offer":
        return t.applicationStatus.offer;
      case "draft":
        return t.applicationStatus.draft;
      case "pending":
        return t.applicationStatus.pending;
      case "optimized":
        return t.applicationStatus.optimized;
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Breadcrumb />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {dashboard.welcome}
            </h1>
            <p className="mt-2 text-gray-600">
              {dashboard.subtitle}
            </p>
          </div>
          <Button
            onClick={() => setApplicationDialogOpen(true)}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            {dashboard.newApplication}
          </Button>
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="mt-4 h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={stat.name}
                  href={stat.href}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{dashboard.quickActions}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/upload"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-700">{dashboard.manageResumes}</span>
            </Link>
            <Link
              href="/jd-input"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Briefcase className="h-5 w-5 text-green-600" />
              <span className="font-medium text-gray-700">{dashboard.stats.jobDescriptions}</span>
            </Link>
            <Link
              href="/applications"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-gray-700">{dashboard.trackApplications}</span>
            </Link>
          </div>
        </div>

        {/* Getting Started */}
        {(resumes.length === 0 || jobDescriptions.length === 0) && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {dashboard.gettingStarted}
            </h2>
            <div className="space-y-4">
              {dashboard.steps.map((step, index) => (
                <div key={step.title} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Applications */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {dashboard.recentApplications}
            </h2>
            {applications.length > 5 && (
              <Link href="/applications" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                {dashboard.viewAll}
              </Link>
            )}
          </div>
          {recentApplications.length > 0 ? (
            <div className="space-y-4">
              {recentApplications.map((app) => {
                const resume = resumes.find((r) => r.id === app.resumeId);
                const jd = jobDescriptions.find((j) => j.id === app.jobId);

                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {jd?.title || dashboard.unknownPosition}
                      </p>
                      <p className="text-sm text-gray-700">
                        {jd?.company || dashboard.unknownCompany} • {resume?.name || dashboard.unknownResume}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}
                      >
                        {getStatusLabel(app.status)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatLiteDate(app.createdAt, locale)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              {dashboard.emptyApplications}
            </div>
          )}
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{dashboard.dataManagement}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/data"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FolderOpen className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-gray-700">{dashboard.manageData}</p>
                <p className="text-sm text-gray-500">
                  {dashboard.manageDataDescription}
                </p>
              </div>
            </Link>
            <Link
              href="/search"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="font-medium text-gray-700">{dashboard.search}</p>
                <p className="text-sm text-gray-500">
                  {dashboard.searchDescription}
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
              <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  {dashboard.privacyTitle}
                </h3>
                <p className="text-sm text-blue-600 mt-1">
                  {dashboard.privacyDescription}
                </p>
              </div>
            </div>
        </div>
        <ApplicationCreateDialog
          open={applicationDialogOpen}
          onOpenChange={setApplicationDialogOpen}
        />
      </main>
    </div>
  );
}

export default memo(DashboardPage);
