"use client";

/**
 * Company Board Page - domestic recruiting site radar
 *
 * A curated directory of company career sites. Public article titles
 * ("XX 2027届秋招正式启动") act as hiring signals that pin companies
 * to the top with a dated batch badge. Paste a title or article URL
 * to scan; click through to the official career page to apply.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  companyAPI,
  signalFeedAPI,
  type CompanyEntry,
  type SignalFeed,
} from "@/lib/api-client-lite";
import { useLiteCopy } from "@/lib/lite-i18n";
import {
  Building2,
  ExternalLink,
  Link2,
  Radar,
  Rss,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

function daysAgo(iso: string | null, nowMs: number): string | null {
  if (!iso) return null;
  const diff = nowMs - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 30) return `${days}天前`;
  return `${Math.floor(days / 30)}个月前`;
}

export default function CompanyBoardPage() {
  const { locale } = useLiteCopy();
  const [companies, setCompanies] = useState<CompanyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [industry, setIndustry] = useState("");
  const [signalInput, setSignalInput] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  // RSS signal feeds (auto radar)
  const [feeds, setFeeds] = useState<SignalFeed[]>([]);
  const [feedUrl, setFeedUrl] = useState("");
  const [feedBusy, setFeedBusy] = useState(false);

  const loadFeeds = useCallback(async () => {
    try {
      setFeeds(await signalFeedAPI.list());
    } catch {
      setFeeds([]);
    }
  }, []);

  // Captured once per mount; badge staleness within a session is fine
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadFeeds());
    return () => window.cancelAnimationFrame(frame);
  }, [loadFeeds]);

  const addFeed = async () => {
    if (!feedUrl.trim()) return;
    setFeedBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signalFeedAPI.create(feedUrl.trim());
      setFeedUrl("");
      await loadFeeds();
      setNotice(locale === "zh-CN" ? "信号源已添加，点击同步立即生效" : "Feed added — sync to apply");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add feed failed");
    } finally {
      setFeedBusy(false);
    }
  };

  const syncFeed = async (id: string) => {
    setFeedBusy(true);
    try {
      const result = await signalFeedAPI.sync(id);
      setNotice(
        result.signals.length
          ? locale === "zh-CN"
            ? `命中信号：${result.signals.join("、")}`
            : `Signals: ${result.signals.join(", ")}`
          : locale === "zh-CN"
            ? "本批无新信号"
            : "No new signals in this batch"
      );
      await Promise.all([loadFeeds(), load()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setFeedBusy(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCompanies(
        await companyAPI.list({
          keyword: keyword || undefined,
          industry: industry || undefined,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [keyword, industry]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const signaled = useMemo(
    () => companies.filter((c) => c.signal_batch),
    [companies]
  );
  const quiet = useMemo(
    () => companies.filter((c) => !c.signal_batch),
    [companies]
  );

  const seed = async () => {
    setDetecting(true);
    try {
      const list = await companyAPI.seedDefaults();
      setCompanies(list);
      setNotice(
        locale === "zh-CN"
          ? `已导入内置企业目录（共 ${list.length} 家）`
          : `Seeded ${list.length} companies`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setDetecting(false);
    }
  };

  const detect = async () => {
    const raw = signalInput.trim();
    if (!raw) return;
    setDetecting(true);
    setNotice(null);
    setError(null);
    const isUrl = /^https?:\/\//i.test(raw);
    try {
      const result = await companyAPI.detectSignal(
        isUrl ? { url: raw } : { title: raw }
      );
      if (result.matched.length === 0) {
        setNotice(
          locale === "zh-CN"
            ? `未命中目录企业（标题：${result.used_title?.slice(0, 40) ?? ""}…）。可在下方手动添加该公司。`
            : `No directory match for "${(result.used_title ?? "").slice(0, 40)}…"`
        );
      } else {
        setNotice(
          locale === "zh-CN"
            ? `已置顶 ${result.matched.map((c) => `${c.name}·${c.signal_batch}`).join("、")}`
            : `Pinned: ${result.matched.map((c) => `${c.name}·${c.signal_batch}`).join(", ")}`
        );
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setDetecting(false);
    }
  };

  const addCompany = async () => {
    if (!newName.trim()) return;
    try {
      await companyAPI.create({
        name: newName.trim(),
        career_url: newUrl.trim() || undefined,
      });
      setNewName("");
      setNewUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    }
  };

  const industries = useMemo(
    () =>
      Array.from(
        new Set(companies.map((c) => c.industry).filter(Boolean) as string[])
      ).sort(),
    [companies]
  );

  const t = {
    title: locale === "zh-CN" ? "招聘雷达" : "Hiring Radar",
    subtitle:
      locale === "zh-CN"
        ? "企业招聘官网导航。检测到企业开始春招/秋招时自动置顶并标注日期——粘贴公众号推文标题或链接即可扫描"
        : "Company career-site directory. Hiring signals pin companies to the top with dates — paste an article title or URL to scan",
    signalPlaceholder:
      locale === "zh-CN"
        ? "粘贴推文标题或文章链接，如「腾讯2027届秋招正式启动」"
        : "Paste a post title or article URL",
    detect: locale === "zh-CN" ? "扫描信号" : "Scan",
    seed: locale === "zh-CN" ? "导入内置企业目录" : "Seed companies",
    searchPlaceholder: locale === "zh-CN" ? "搜索公司…" : "Search companies…",
    allIndustries: locale === "zh-CN" ? "全部行业" : "All industries",
    hiringNow: locale === "zh-CN" ? "招聘进行中" : "Hiring now",
    noSignal: locale === "zh-CN" ? "暂无信号" : "No signal",
    detected: locale === "zh-CN" ? "检测于" : "detected",
    addName: locale === "zh-CN" ? "公司名" : "Company name",
    addUrl: locale === "zh-CN" ? "招聘官网 URL（可选）" : "Career URL (optional)",
    add: locale === "zh-CN" ? "添加" : "Add",
    empty:
      locale === "zh-CN"
        ? "目录为空，点击「导入内置企业目录」开始（内置 20+ 家已验证官网）"
        : "Empty directory — seed the built-in companies to start",
    loading: locale === "zh-CN" ? "加载中…" : "Loading…",
    unverified: locale === "zh-CN" ? "链接未验证" : "unverified",
    source: locale === "zh-CN" ? "信号来源" : "source",
    feedsTitle: locale === "zh-CN" ? "自动信号源（RSS）" : "Auto signal feeds (RSS)",
    feedsHint:
      locale === "zh-CN"
        ? "接 WeWe RSS / wechat2rss 等公众号 RSS 桥接服务，企业号推文标题自动命中雷达，每 12 小时后台同步"
        : "Bridge WeChat feeds via WeWe RSS / wechat2rss; post titles auto-pin the radar, synced every 12h in the background",
    feedPlaceholder:
      locale === "zh-CN" ? "RSS 地址，如 http://localhost:4000/feeds/xxx.xml" : "RSS URL",
    feedAdd: locale === "zh-CN" ? "添加" : "Add",
    feedSync: locale === "zh-CN" ? "同步" : "Sync",
    feedEmpty: locale === "zh-CN" ? "暂无信号源" : "No feeds yet",
  };

  const card = (company: CompanyEntry, pinned: boolean) => (
    <li
      key={company.id}
      className={`rounded-lg border p-4 flex flex-wrap items-center gap-3 transition-colors ${
        pinned
          ? "border-indigo-300 bg-indigo-50/60"
          : "border-gray-200 bg-white hover:border-indigo-200"
      }`}
    >
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
          pinned ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
        }`}
        aria-hidden
      >
        {company.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-900">{company.name}</span>
          {pinned && company.signal_batch && (
            <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-semibold text-white">
              {company.signal_batch}
            </span>
          )}
          {!company.verified && (
            <span
              title={t.unverified}
              className="text-xs text-gray-400 border border-gray-200 rounded px-1"
            >
              ?
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {pinned && company.signal_detected_at
            ? `${t.detected} ${daysAgo(company.signal_detected_at, nowMs)}${
                company.signal_url ? " · " : ""
              }`
            : t.noSignal}
          {pinned && company.signal_url && (
            <a
              href={company.signal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              {t.source}
            </a>
          )}
        </p>
      </div>
      {company.career_url && (
        <a
          href={company.career_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          {locale === "zh-CN" ? "官网" : "Site"}
        </a>
      )}
    </li>
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Radar className="h-6 w-6 text-indigo-600" aria-hidden />
          {t.title}
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-3xl">{t.subtitle}</p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Link2
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              aria-hidden
            />
            <input
              type="text"
              value={signalInput}
              onChange={(e) => setSignalInput(e.target.value)}
              placeholder={t.signalPlaceholder}
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label={t.signalPlaceholder}
            />
          </div>
          <button
            type="button"
            onClick={() => void detect()}
            disabled={detecting || !signalInput.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${detecting ? "animate-pulse" : ""}`} aria-hidden />
            {t.detect}
          </button>
          <button
            type="button"
            onClick={() => void seed()}
            disabled={detecting}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Building2 className="h-4 w-4" aria-hidden />
            {t.seed}
          </button>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              aria-hidden
            />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              aria-label={t.searchPlaceholder}
            />
          </div>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            aria-label={t.allIndustries}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">{t.allIndustries}</option>
            {industries.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.addName}
            aria-label={t.addName}
            className="w-36 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder={t.addUrl}
            aria-label={t.addUrl}
            className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void addCompany()}
            disabled={!newName.trim()}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          >
            {t.add}
          </button>
        </div>
      </section>

      {notice && (
        <div role="status" className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
          <Rss className="h-4 w-4 text-indigo-600" aria-hidden />
          {t.feedsTitle}
        </h2>
        <p className="text-xs text-gray-500 mb-3">{t.feedsHint}</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void addFeed();
          }}
        >
          <input
            type="url"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            placeholder={t.feedPlaceholder}
            aria-label={t.feedPlaceholder}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={feedBusy || !feedUrl.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {t.feedAdd}
          </button>
        </form>
        {feeds.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {feeds.map((feed) => (
              <li
                key={feed.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    feed.last_status === "ok"
                      ? "bg-green-500"
                      : feed.last_status === "error"
                        ? "bg-red-500"
                        : "bg-gray-300"
                  }`}
                  aria-hidden
                />
                <span className="font-medium text-gray-800 truncate max-w-[240px]">
                  {feed.name}
                </span>
                <span className="text-xs text-gray-500 truncate flex-1">
                  {feed.last_fetched_at
                    ? `${new Date(feed.last_fetched_at).toLocaleString()} · ${feed.last_new_signals} 信号`
                    : t.feedEmpty}
                </span>
                <button
                  type="button"
                  onClick={() => void syncFeed(feed.id)}
                  disabled={feedBusy}
                  className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t.feedSync}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void signalFeedAPI
                      .update(feed.id, { enabled: !feed.enabled })
                      .then(loadFeeds)
                  }
                  className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {feed.enabled ? (locale === "zh-CN" ? "停用" : "Disable") : locale === "zh-CN" ? "启用" : "Enable"}
                </button>
                <button
                  type="button"
                  aria-label={`${t.feedSync} ${feed.name}`}
                  onClick={() => {
                    if (window.confirm(locale === "zh-CN" ? `删除信号源 ${feed.name}？` : `Remove ${feed.name}?`)) {
                      void signalFeedAPI.remove(feed.id).then(loadFeeds);
                    }
                  }}
                  className="rounded-md border border-red-200 p-1 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {loading && companies.length === 0 ? (
        <p className="text-sm text-gray-500 py-12 text-center">{t.loading}</p>
      ) : companies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">{t.empty}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {signaled.length > 0 && (
            <section aria-label={t.hiringNow}>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">
                {t.hiringNow}（{signaled.length}）
              </h2>
              <ul className="space-y-3">{signaled.map((c) => card(c, true))}</ul>
            </section>
          )}
          {quiet.length > 0 && (
            <section aria-label={t.noSignal}>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">
                {t.noSignal}（{quiet.length}）
              </h2>
              <ul className="space-y-3">{quiet.map((c) => card(c, false))}</ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
