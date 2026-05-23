"use client";

import { useState, useRef, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { useAppStore, type JobDescription } from "@/lib/store";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/lib/logger";
import { TIMING } from "@/lib/constants";
import {
  Briefcase,
  Building2,
  Plus,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function JDInputPage() {
  const router = useRouter();
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
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
    if (!url) {
      return;
    }

    setImporting(true);

    try {
      // Simulate importing from URL
      await new Promise((resolve) => setTimeout(resolve, TIMING.API_CALL.LONG));

      // In production, this would call your scraping API
      // TODO: Implement URL import API

      setImporting(false);
      setUrl("");
    } catch (error) {
      logger.error(LogCategory.API, "Import error", error as Error);
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
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            输入职位描述
          </h1>
          <p className="mt-2 text-lg text-gray-700">
            AI 将帮助您分析职位要求并优化您的简历
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
                  从招聘网站导入
                </h3>
                <p className="text-sm text-gray-700">
                  粘贴招聘网站的职位链接，自动提取职位信息
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.example.com/job/123456"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Button
                variant="outline"
                onClick={handleImportFromURL}
                disabled={!url || importing}
              >
                {importing ? "导入中..." : "导入"}
              </Button>
            </div>
          </div>

          {/* Manual Input Form */}
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">手动输入</h3>
                <p className="text-sm text-gray-700">
                  粘贴或输入职位描述信息
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
                    职位名称 *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如：高级前端工程师"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium text-gray-900"
                  >
                    公司名称 *
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如：字节跳动"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-900"
                >
                  职位描述 *
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="粘贴完整的职位描述，包括岗位职责、任职要求等..."
                  required
                />
                <p className="text-xs text-gray-500">
                  请尽可能提供完整的职位描述，以便更准确地分析匹配度
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="requirements"
                  className="block text-sm font-medium text-gray-900"
                >
                  任职要求（可选）
                </label>
                <textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="每行一个要求，例如：&#10;- 3年以上前端开发经验&#10;- 精通 React 和 TypeScript&#10;- 有大型项目经验"
                />
                <p className="text-xs text-gray-500">
                  每行一个要求，AI 将帮您逐一匹配
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? "处理中..." : "继续下一步"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/dashboard")}
                >
                  取消
                </Button>
              </div>
            </form>
          </div>

          {/* Saved JDs */}
          {jobDescriptions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                已保存的职位描述 ({jobDescriptions.length})
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
                  提示：如何获得最佳分析结果
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 提供完整的职位描述，不要遗漏任何信息</li>
                  <li>• 包含具体的技能要求和技术栈</li>
                  <li>• 添加公司福利和团队文化信息</li>
                  <li>• 如果有薪资范围，也一并提供</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
