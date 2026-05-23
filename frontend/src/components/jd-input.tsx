"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore, type JobDescription } from "@/lib/store";
import { Briefcase, Building2, Plus, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateJobDescription, containsXSSPatterns } from "@/lib/validation";
import { TIMING } from "@/lib/constants";

export function JDInput() {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const securityAlertTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { addJobDescription, currentJD, setCurrentJD, jobDescriptions } = useAppStore();

  // 清理定时器
  useEffect(() => {
    return () => {
      if (securityAlertTimerRef.current) {
        clearTimeout(securityAlertTimerRef.current);
      }
    };
  }, []);

  // Optimized handlers with useCallback
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (errors.title) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.title;
        return newErrors;
      });
    }
  }, [errors.title]);

  const handleCompanyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCompany(e.target.value);
    if (errors.company) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.company;
        return newErrors;
      });
    }
  }, [errors.company]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  }, []);

  const handleRequirementsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRequirements(e.target.value);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    const validationResult = validateJobDescription({
      title,
      company,
      description,
      requirements
    });

    if (!validationResult.valid) {
      setErrors(validationResult.errors);
      return;
    }

    // Check for XSS patterns
    const hasXSS = containsXSSPatterns(description) ||
                   containsXSSPatterns(requirements);

    if (hasXSS) {
      setShowSecurityAlert(true);
      // 清理之前的定时器
      if (securityAlertTimerRef.current) {
        clearTimeout(securityAlertTimerRef.current);
      }
      // 存储定时器ID以便清理
      securityAlertTimerRef.current = setTimeout(() => {
        setShowSecurityAlert(false);
        securityAlertTimerRef.current = null;
      }, TIMING.UI.SECURITY_ALERT);
      return;
    }

    const newJD: JobDescription = {
      id: crypto.randomUUID(),
      title: validationResult.sanitized.title,
      company: validationResult.sanitized.company,
      description: validationResult.sanitized.description,
      requirements: validationResult.sanitized.requirements,
      skills: [],
      createdAt: new Date(),
    };

    addJobDescription(newJD);

    // Reset form
    setTitle("");
    setCompany("");
    setDescription("");
    setRequirements("");
    setErrors({});
  }, [title, company, description, requirements, addJobDescription]);

  const handleClear = useCallback(() => {
    setCurrentJD(null);
  }, [setCurrentJD]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">职位描述</h2>
        <p className="mt-2 text-gray-700">
          输入职位描述信息，AI 将帮助您分析匹配度并优化简历
        </p>
      </div>

      {showSecurityAlert && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3" role="alert" aria-live="assertive">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 font-medium">安全警告</p>
            <p className="text-sm text-amber-700 mt-1">检测到潜在的不安全内容，已自动过滤。请勿在描述中输入脚本或特殊字符。</p>
          </div>
        </div>
      )}

      {currentJD ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {currentJD.title}
              </h3>
              <p className="text-gray-700 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {currentJD.company}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-10 w-10"
              aria-label="清除职位描述"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">职位描述</h4>
              <p className="text-gray-700 whitespace-pre-wrap">
                {currentJD.description}
              </p>
            </div>

            {currentJD.requirements.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">任职要求</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {currentJD.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                onChange={handleTitleChange}
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "title-error" : undefined}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]",
                  errors.title ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300"
                )}
                placeholder="例如：高级前端工程师"
                required
              />
              {errors.title && (
                <p id="title-error" className="text-sm text-red-600" role="alert">
                  {errors.title}
                </p>
              )}
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
                onChange={handleCompanyChange}
                aria-invalid={!!errors.company}
                aria-describedby={errors.company ? "company-error" : undefined}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]",
                  errors.company ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300"
                )}
                placeholder="例如：字节跳动"
                required
              />
              {errors.company && (
                <p id="company-error" className="text-sm text-red-600" role="alert">
                  {errors.company}
                </p>
              )}
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
              onChange={handleDescriptionChange}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="粘贴完整的职位描述..."
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="requirements"
              className="block text-sm font-medium text-gray-900"
            >
              任职要求
            </label>
            <textarea
              id="requirements"
              value={requirements}
              onChange={handleRequirementsChange}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="每行一个要求..."
            />
            <p className="text-xs text-gray-500">
              每行一个要求，例如：3 年以上前端开发经验
            </p>
          </div>

          <Button type="submit" size="lg" className="w-full">
            <Plus className="h-5 w-5 mr-2" />
            添加职位描述
          </Button>
        </form>
      )}

      {jobDescriptions.length > 0 && !currentJD && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">历史职位描述</h4>
          <div className="space-y-2">
            {jobDescriptions.map((jd) => (
              <button
                key={jd.id}
                onClick={() => setCurrentJD(jd)}
                className={cn(
                  "w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                )}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{jd.title}</p>
                    <p className="text-sm text-gray-700">{jd.company}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
