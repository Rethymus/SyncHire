"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore, type JobDescription } from "@/lib/store";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/lib/logger";
import { useLiteCopy } from "@/lib/lite-i18n";
import { apiClient } from "@/lib/api-client-unified";
import { isGithubPagesDeployment } from "@/lib/deployment-mode";
import {
  Briefcase,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Link as LinkIcon,
} from "lucide-react";

export default function JDInputPage() {
  const router = useRouter();
  const { t } = useLiteCopy();
  const jdCopy = t.jd;
  const pagesMode = isGithubPagesDeployment();
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const { addJobDescription, currentJD, setCurrentJD, jobDescriptions } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !company || !description) {
      return;
    }

    setLoading(true);

    try {
      const newJD: JobDescription = {
        id: crypto.randomUUID(),
        title,
        company,
        description,
        requirements: requirements
          .split("\n")
          .filter((r) => r.trim())
          .map((r) => r.trim()),
        skills: [],
        createdAt: new Date(),
      };

      addJobDescription(newJD);

      // Redirect to dashboard after submission
      redirectTimerRef.current = setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromURL = async () => {
    if (pagesMode) {
      setImportMessage("Pages 体验版不抓取岗位链接。请手动粘贴职位描述，内容会保存在当前浏览器中。");
      return;
    }
    if (!url.trim()) {
      return;
    }

    setImportMessage(null);
    setImporting(true);

    try {
      const result = await apiClient.jd.import(url.trim());
      const importedJD: JobDescription = {
        id: result.job_id || crypto.randomUUID(),
        title: result.title || "Imported job description",
        company: result.company || "Pending review",
        description: result.description || result.message || "Import is processing. Review the source URL and paste details if needed.",
        requirements: [],
        skills: [],
        createdAt: new Date(),
      };

      addJobDescription(importedJD);
      setImportMessage(jdCopy.importSuccess);
      redirectTimerRef.current = setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (error) {
      logger.error(LogCategory.API, "Import error", error as Error);
      setImportMessage(
        jdCopy.importFailed
      );
    } finally {
      setImporting(false);
    }
  };

  const handleSelectJD = (jd: JobDescription) => {
    setCurrentJD(jd);
    router.push("/dashboard");
  };

  // 清理 timer
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {jdCopy.title}
          </h1>
          <p className="mt-2 text-lg text-gray-700">
            {jdCopy.subtitle}
          </p>
        </div>

        <div className="space-y-8">
          {/* Import from URL */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <LinkIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {jdCopy.importTitle}
                </h3>
                <p className="text-sm text-gray-700">
                  {jdCopy.importSubtitle}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setImportMessage(null);
                }}
                placeholder={jdCopy.importPlaceholder}
                aria-describedby={importMessage ? "job-url-import-message" : undefined}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Button
                variant="outline"
                onClick={handleImportFromURL}
                disabled={pagesMode || !url.trim() || importing}
              >
                {pagesMode ? "Pages 版不可用" : importing ? jdCopy.importingButton : jdCopy.importButton}
              </Button>
            </div>
            {pagesMode ? (
              <p className="mt-3 text-sm text-amber-800">
                静态 Pages 没有受控抓取后端；请在下方手动录入职位内容。
              </p>
            ) : null}
            {importMessage && (
              <p
                id="job-url-import-message"
                role="status"
                aria-live="polite"
                className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                {importMessage}
              </p>
            )}
          </div>

          {/* Manual Input Form */}
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{jdCopy.manualTitle}</h3>
                <p className="text-sm text-gray-700">
                  {jdCopy.manualSubtitle}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-900"
                  >
                    {jdCopy.titleLabel}
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={jdCopy.titlePlaceholder}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium text-gray-900"
                  >
                    {jdCopy.companyLabel}
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={jdCopy.companyPlaceholder}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-900"
                >
                  {jdCopy.descriptionLabel}
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder={jdCopy.descriptionPlaceholder}
                  required
                />
                <p className="text-xs text-gray-600">
                  {jdCopy.descriptionHelp}
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="requirements"
                  className="block text-sm font-medium text-gray-900"
                >
                  {jdCopy.requirementsLabel}
                </label>
                <textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder={jdCopy.requirementsPlaceholder}
                />
                <p className="text-xs text-gray-600">
                  {jdCopy.requirementsHelp}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? jdCopy.loading : jdCopy.submit}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/dashboard")}
                >
                  {jdCopy.cancel}
                </Button>
              </div>
            </form>
          </div>

          {/* Saved JDs */}
          {jobDescriptions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {jdCopy.savedTitle} ({jobDescriptions.length})
              </h2>

              <div className="space-y-3">
                {jobDescriptions.map((jd) => (
                  <button
                    key={jd.id}
                    onClick={() => handleSelectJD(jd)}
                    className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Briefcase className="h-5 w-5 text-gray-700" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{jd.title}</p>
                          <p className="text-sm text-gray-700">{jd.company}</p>
                        </div>
                      </div>

                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">
                  {jdCopy.tipsTitle}
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {jdCopy.tips.map((tip) => (
                    <li key={tip}>• {tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
