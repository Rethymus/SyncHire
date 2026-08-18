"use client";

/**
 * Job Feed Page - ATS-sourced job postings
 *
 * Browses job descriptions ingested from subscribed ATS job sources,
 * newest first, with keyword/source/remote filters.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { jobSourceAPI, type JobSourceFeedItem } from "@/lib/api-client";
import { useLiteCopy } from "@/lib/lite-i18n";
import {
  ExternalLink,
  FormInput,
  Gauge,
  Globe,
  MapPin,
  RefreshCw,
  Rss,
  Search,
  SlidersHorizontal,
} from "lucide-react";

const PAGE_SIZE = 50;

type SortMode = "newest" | "match";

function scoreTier(score: number | null): { label: string; className: string } | null {
  if (score == null) return null;
  if (score >= 70)
    return { label: score.toFixed(0), className: "bg-green-100 text-green-700" };
  if (score >= 45)
    return { label: score.toFixed(0), className: "bg-amber-100 text-amber-700" };
  return { label: score.toFixed(0), className: "bg-muted text-muted-foreground" };
}

export default function JobFeedPage() {
  const { locale } = useLiteCopy();
  const [jobs, setJobs] = useState<JobSourceFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [remote, setRemote] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [scoring, setScoring] = useState(false);

  // Electron-only affordance: the desktop app's job browser with the
  // fill assistant panel (absent in plain web mode)
  const openInJobBrowser = (url: string) => {
    void (window as unknown as { electronAPI?: { openJobBrowser?: (url: string) => void } })
      .electronAPI?.openJobBrowser?.(url);
  };
  const canOpenJobBrowser =
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as { electronAPI?: { openJobBrowser?: unknown } }).electronAPI
        ?.openJobBrowser,
    );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await jobSourceAPI.feed({
        keyword: keyword || undefined,
        remote: remote || undefined,
        source: sourceFilter || undefined,
        sort,
        limit: PAGE_SIZE,
      });
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job feed");
    } finally {
      setLoading(false);
    }
  }, [keyword, remote, sourceFilter, sort]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const runScoring = async () => {
    setScoring(true);
    setNotice(null);
    try {
      const result = await jobSourceAPI.score();
      setNotice(
        result.resume_title
          ? locale === "zh-CN"
            ? `已按简历「${result.resume_title}」为 ${result.scored_count} 个岗位打分`
            : `Scored ${result.scored_count} jobs against "${result.resume_title}"`
          : locale === "zh-CN"
            ? "还没有简历，请先在「简历」页上传一份简历再打分"
            : "No resume yet — upload one on the Resumes page first"
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setScoring(false);
    }
  };

  const sourceOptions = useMemo(() => {
    const sources = new Set(jobs.map((job) => job.source).filter(Boolean));
    return Array.from(sources).sort() as string[];
  }, [jobs]);

  const t = {
    title: locale === "zh-CN" ? "岗位信息流" : "Job Feed",
    subtitle:
      locale === "zh-CN"
        ? "来自企业官方招聘渠道（ATS）实时同步的岗位"
        : "Postings synced directly from official ATS job boards",
    searchPlaceholder: locale === "zh-CN" ? "搜索岗位/公司…" : "Search jobs/companies…",
    allRemote: locale === "zh-CN" ? "全部办公模式" : "All workplace types",
    remote: locale === "zh-CN" ? "远程" : "Remote",
    hybrid: locale === "zh-CN" ? "混合" : "Hybrid",
    onsite: locale === "zh-CN" ? "坐班" : "Onsite",
    allSources: locale === "zh-CN" ? "全部来源" : "All sources",
    sortNewest: locale === "zh-CN" ? "最新" : "Newest",
    sortMatch: locale === "zh-CN" ? "最匹配" : "Best match",
    scoreAction: locale === "zh-CN" ? "按简历打分" : "Score vs resume",
    empty: locale === "zh-CN"
      ? "暂无同步到的岗位。先到「数据源」页添加并同步企业招聘页。"
      : "No synced jobs yet. Add and sync company recruiting pages on the Sources page first.",
    manageSources: locale === "zh-CN" ? "管理数据源" : "Manage sources",
    loading: locale === "zh-CN" ? "加载中…" : "Loading…",
    retry: locale === "zh-CN" ? "重试" : "Retry",
    newToday: locale === "zh-CN" ? "新" : "NEW",
  };

  // Captured once per mount: the "NEW" badge tolerates session staleness
  const [nowMs] = useState(() => Date.now());
  const isNew = (job: JobSourceFeedItem) => {
    const created = new Date(job.created_at).getTime();
    return nowMs - created < 24 * 3600 * 1000;
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Rss className="h-6 w-6 text-indigo-600" aria-hidden />
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <Link
          href="/job-sources"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/40"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {t.manageSources}
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80"
            aria-hidden
          />
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-md border border-input pl-9 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label={t.searchPlaceholder}
          />
        </div>
        <select
          value={remote}
          onChange={(e) => setRemote(e.target.value)}
          aria-label={t.allRemote}
          className="rounded-md border border-input px-3 py-2 text-sm bg-card focus:border-indigo-500 focus:outline-none"
        >
          <option value="">{t.allRemote}</option>
          <option value="remote">{t.remote}</option>
          <option value="hybrid">{t.hybrid}</option>
          <option value="onsite">{t.onsite}</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          aria-label={t.allSources}
          className="rounded-md border border-input px-3 py-2 text-sm bg-card focus:border-indigo-500 focus:outline-none"
        >
          <option value="">{t.allSources}</option>
          {sourceOptions.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label={sort === "match" ? t.sortMatch : t.sortNewest}
          className="rounded-md border border-input px-3 py-2 text-sm bg-card focus:border-indigo-500 focus:outline-none"
        >
          <option value="newest">{t.sortNewest}</option>
          <option value="match">{t.sortMatch}</option>
        </select>
        <button
          type="button"
          onClick={() => void runScoring()}
          disabled={scoring}
          className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
        >
          <Gauge className={`h-4 w-4 ${scoring ? "animate-pulse" : ""}`} aria-hidden />
          {t.scoreAction}
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          {t.retry}
        </button>
      </div>

      {notice && (
        <div role="status" className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {loading && jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">{t.loading}</p>
      ) : jobs.length === 0 && !error ? (
        <div className="rounded-lg border border-dashed border-input py-12 text-center">
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="rounded-lg border border-border bg-card p-4 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-foreground truncate">
                      {job.title}
                    </h2>
                    {isNew(job) && (
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">
                        {t.newToday}
                      </span>
                    )}
                    {scoreTier(job.match_score) && (
                      <span
                        title={
                          job.match_detail?.matched?.length
                            ? `${locale === "zh-CN" ? "命中技能" : "Matched"}: ${job.match_detail.matched.join(", ")}`
                            : undefined
                        }
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold ${scoreTier(job.match_score)!.className}`}
                      >
                        {scoreTier(job.match_score)!.label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {job.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        {job.location}
                      </span>
                    )}
                    {job.remote && job.remote !== "onsite" && (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" aria-hidden />
                        {job.remote}
                      </span>
                    )}
                    {job.employment_type && <span>{job.employment_type}</span>}
                    <span className="font-mono bg-muted rounded px-1.5 py-0.5">
                      {job.source}
                    </span>
                  </div>
                </div>
                {job.url && (
                  <div className="shrink-0 flex items-center gap-2">
                    {canOpenJobBrowser && (
                      <button
                        type="button"
                        onClick={() => openInJobBrowser(job.url!)}
                        title={locale === "zh-CN" ? "在求职浏览器中打开（带填表助手）" : "Open in Job Browser (with fill assistant)"}
                        className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        <FormInput className="h-4 w-4" aria-hidden />
                        {locale === "zh-CN" ? "填表" : "Fill"}
                      </button>
                    )}
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/40"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      {locale === "zh-CN" ? "查看" : "View"}
                    </a>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
