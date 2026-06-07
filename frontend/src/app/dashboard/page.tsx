/**
 * Dashboard Page - Lightweight Version
 *
 * Simplified dashboard without authentication or user-specific data.
 */

"use client";

import { useState, useCallback, useMemo, memo, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation-lite";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client-lite";
import { logger, LogCategory } from "@/lib/logger";
import {
  FileText,
  Briefcase,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  FolderOpen,
} from "lucide-react";

interface Resume {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface JobDescription {
  id: string;
  title: string;
  company: string;
  description: string;
  created_at: string;
}

interface Application {
  id: string;
  resume_id: string;
  jd_id: string;
  status: string;
  created_at: string;
}

function DashboardPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);

  // Load all data in parallel on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [resumesData, jdsData, applicationsData] = await Promise.all([
          apiClient.resume.list(),
          apiClient.jd.list(),
          apiClient.application.list(),
        ]);

        setResumes(resumesData || []);
        setJobDescriptions(jdsData || []);
        setApplications(applicationsData || []);
      } catch (error) {
        logger.error(LogCategory.API, "Failed to load dashboard data", error as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Memoize stats to avoid recalculation on every render
  const stats = useMemo(() => [
    {
      name: "Resumes",
      value: resumes.length,
      icon: FileText,
      color: "bg-blue-500",
      href: "/resumes",
    },
    {
      name: "Job Descriptions",
      value: jobDescriptions.length,
      icon: Briefcase,
      color: "bg-green-500",
      href: "/job-descriptions",
    },
    {
      name: "Applications",
      value: applications.length,
      icon: BarChart3,
      color: "bg-purple-500",
      href: "/applications",
    },
    {
      name: "Interviews",
      value: applications.filter((a) => a.status === "interview").length,
      icon: CheckCircle2,
      color: "bg-emerald-500",
      href: "/applications?status=interview",
    },
  ], [resumes.length, jobDescriptions.length, applications]);

  // Memoize recent applications
  const recentApplications = useMemo(() => {
    return applications
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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
        return "Interview";
      case "applied":
        return "Applied";
      case "rejected":
        return "Rejected";
      case "offer":
        return "Offer";
      case "draft":
        return "Draft";
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
              Welcome to SyncHire Lite
            </h1>
            <p className="mt-2 text-gray-600">
              Your local AI-powered job application assistant
            </p>
          </div>
          <Button
            onClick={() => setApplicationDialogOpen(true)}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Application
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/resumes"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-700">Manage Resumes</span>
            </Link>
            <Link
              href="/job-descriptions"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Briefcase className="h-5 w-5 text-green-600" />
              <span className="font-medium text-gray-700">Job Descriptions</span>
            </Link>
            <Link
              href="/applications"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-gray-700">Track Applications</span>
            </Link>
          </div>
        </div>

        {/* Getting Started */}
        {(resumes.length === 0 || jobDescriptions.length === 0) && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Getting Started
            </h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Upload your resume</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Add your resume to get started. Use AI to optimize it for better ATS compatibility.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Add job descriptions</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Import job descriptions from URLs or paste content. AI will parse and structure the information.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Create applications</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Pair resumes with job descriptions and track your application status with AI-powered match scores.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Applications */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Applications
            </h2>
            {applications.length > 5 && (
              <Link href="/applications" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all
              </Link>
            )}
          </div>
          {recentApplications.length > 0 ? (
            <div className="space-y-4">
              {recentApplications.map((app) => {
                const resume = resumes.find((r) => r.id === app.resume_id);
                const jd = jobDescriptions.find((j) => j.id === app.jd_id);

                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {jd?.title || "Unknown Position"}
                      </p>
                      <p className="text-sm text-gray-700">
                        {jd?.company || "Unknown Company"} • {resume?.title || "Unknown Resume"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}
                      >
                        {getStatusLabel(app.status)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              No applications yet. Create your first application to get started.
            </div>
          )}
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/data"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FolderOpen className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-gray-700">Manage Data</p>
                <p className="text-sm text-gray-500">
                  Export, import, backup your data
                </p>
              </div>
            </Link>
            <Link
              href="/search"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="font-medium text-gray-700">Search</p>
                <p className="text-sm text-gray-500">
                  Full-text and semantic search
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
                SyncHire Lite - Local & Private
              </h3>
              <p className="text-sm text-blue-600 mt-1">
                All your data is stored locally on your machine. No cloud storage, no authentication
                required. Your resume and job search data stays private.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default memo(DashboardPage);
