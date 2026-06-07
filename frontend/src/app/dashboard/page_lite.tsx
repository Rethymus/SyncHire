/**
 * Dashboard Page - Lightweight Version Example
 *
 * Simplified dashboard without authentication or user-specific data.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation-lite";
import { apiClient } from "@/lib/api-client-lite";
import {
  FileText,
  Briefcase,
  BarChart3,
  TrendingUp,
  Clock,
  FolderOpen,
  Search,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    resumes: 0,
    jobDescriptions: 0,
    applications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [resumes, jds, applications] = await Promise.all([
          apiClient.resume.list(),
          apiClient.jd.list(),
          apiClient.application.list(),
        ]);

        setStats({
          resumes: resumes.length || 0,
          jobDescriptions: jds.length || 0,
          applications: applications.length || 0,
        });
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const statsCards = [
    {
      title: "Resumes",
      value: stats.resumes,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/resumes",
    },
    {
      title: "Job Descriptions",
      value: stats.jobDescriptions,
      icon: Briefcase,
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: "/job-descriptions",
    },
    {
      title: "Applications",
      value: stats.applications,
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/applications",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to SyncHire Lite
          </h1>
          <p className="mt-2 text-gray-600">
            Your local AI-powered job application assistant
          </p>
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="mt-4 h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`${card.bgColor} rounded-lg shadow p-6 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <p className={`text-3xl font-bold ${card.color} mt-2`}>
                        {card.value}
                      </p>
                    </div>
                    <Icon className={`h-8 w-8 ${card.color} opacity-80`} />
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
              <span className="font-medium text-gray-700">Create Resume</span>
            </Link>
            <Link
              href="/job-descriptions"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Briefcase className="h-5 w-5 text-green-600" />
              <span className="font-medium text-gray-700">Add Job Description</span>
            </Link>
            <Link
              href="/applications"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-gray-700">Track Application</span>
            </Link>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Getting Started with SyncHire Lite
          </h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                1
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Create your resume</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Upload your resume or create one from scratch. Use AI to optimize it for
                  better ATS compatibility.
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
                  Import job descriptions from URLs or paste content. AI will parse and
                  structure the information.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                3
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Track applications</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Create applications by pairing resumes with job descriptions. Track
                  status and get AI-powered match scores.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                4
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Use AI features</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Leverage AI for resume optimization, job parsing, and intelligent
                  matching to find the best opportunities.
                </p>
              </div>
            </div>
          </div>
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
              <Search className="h-5 w-5 text-indigo-600" />
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
      </div>
    </div>
  );
}
