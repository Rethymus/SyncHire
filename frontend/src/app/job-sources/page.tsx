"use client";

/**
 * Job Sources Page - ATS recruiting page subscriptions
 *
 * Add company recruiting pages (URL auto-detects the ATS), sync them
 * on demand or on the backend schedule, and browse sync status.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { jobSourceAPI, type JobSource } from "@/lib/api-client";
import { JobSourceAddForm } from "@/components/job-source-add-form";
import { useLiteCopy } from "@/lib/lite-i18n";
import {
  CheckCircle2,
  CircleSlash,
  Library,
  Link2,
  RefreshCw,
  Rss,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";

const ATS_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  smartrecruiters: "SmartRecruiters",
};

export default function JobSourcesPage() {
  const { locale } = useLiteCopy();
  const [sources, setSources] = useState<JobSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncAllBusy, setSyncAllBusy] = useState(false);
  // Catalog search (15k+ overseas ATS boards from the open dataset)
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<
    Array<{ ats_type: string; org_key: string }>
  >([]);
  const [catalogSearching, setCatalogSearching] = useState(false);
  const [subscribedKeys, setSubscribedKeys] = useState<Set<string>>(new Set());

  const searchCatalog = useCallback(async () => {
    const query = catalogQuery.trim();
    if (!query) {
      setCatalogResults([]);
      return;
    }
    setCatalogSearching(true);
    setError(null);
    try {
      const result = await jobSourceAPI.searchCatalog(query, 12);
      setCatalogResults(result.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Catalog search failed");
    } finally {
      setCatalogSearching(false);
    }
  }, [catalogQuery]);

  const subscribeFromCatalog = async (
    atsType: string,
    orgKey: string
  ) => {
    const key = `${atsType}:${orgKey}`;
    if (subscribedKeys.has(key)) return;
    setSubscribedKeys((prev) => new Set(prev).add(key));
    try {
      await jobSourceAPI.importBoards(atsType, [orgKey], true);
      setNotice(
        locale === "zh-CN"
          ? `已订阅 ${orgKey}（${ATS_LABELS[atsType] ?? atsType}），可立即同步`
          : `Subscribed ${orgKey} (${ATS_LABELS[atsType] ?? atsType})`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscribe failed");
      setSubscribedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSources(await jobSourceAPI.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addSource = async ({ url, name }: { url: string; name: string }) => {
    if (!url.trim()) return;
    setAdding(true);
    setError(null);
    setNotice(null);
    try {
      const created = await jobSourceAPI.create({
        url: url.trim(),
        name: name.trim() || undefined,
      });
      setNotice(
        locale === "zh-CN"
          ? `已添加 ${created.name}（${ATS_LABELS[created.ats_type] ?? created.ats_type}）`
          : `Added ${created.name} (${ATS_LABELS[created.ats_type] ?? created.ats_type})`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add job source");
    } finally {
      setAdding(false);
    }
  };

  const seedDefaults = async () => {
    setAdding(true);
    setError(null);
    setNotice(null);
    try {
      await jobSourceAPI.seedDefaults();
      setNotice(
        locale === "zh-CN" ? "已添加示例数据源" : "Sample sources added"
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed sources");
    } finally {
      setAdding(false);
    }
  };

  const syncSource = async (id: string) => {
    setSyncingId(id);
    setError(null);
    setNotice(null);
    try {
      const result = await jobSourceAPI.sync(id);
      if (result.status === "error") {
        setError(`${result.source_name}: ${result.message ?? "sync failed"}`);
      } else {
        setNotice(
          locale === "zh-CN"
            ? `${result.source_name}：新增 ${result.new_count}，共 ${result.total_count} 个岗位`
            : `${result.source_name}: ${result.new_count} new, ${result.total_count} total`
        );
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  const syncAll = async () => {
    setSyncAllBusy(true);
    setError(null);
    setNotice(null);
    try {
      const results = await jobSourceAPI.syncAll();
      const totalNew = results.reduce((sum, r) => sum + r.new_count, 0);
      const failed = results.filter((r) => r.status === "error");
      setNotice(
        locale === "zh-CN"
          ? `同步完成：新增 ${totalNew} 个岗位${failed.length ? `，${failed.length} 个源失败` : ""}`
          : `Sync done: ${totalNew} new jobs${failed.length ? `, ${failed.length} source(s) failed` : ""}`
      );
      if (failed.length) {
        setError(failed.map((r) => `${r.source_name}: ${r.message}`).join("; "));
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncAllBusy(false);
    }
  };

  const toggleEnabled = async (source: JobSource) => {
    try {
      await jobSourceAPI.update(source.id, { enabled: !source.enabled });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const removeSource = async (source: JobSource) => {
    if (
      !window.confirm(
        locale === "zh-CN"
          ? `取消订阅 ${source.name}？（已同步的岗位会保留）`
          : `Unsubscribe ${source.name}? (synced jobs are kept)`
      )
    ) {
      return;
    }
    try {
      await jobSourceAPI.remove(source.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const t = {
    title: locale === "zh-CN" ? "岗位数据源" : "Job Sources",
    subtitle:
      locale === "zh-CN"
        ? "订阅企业官方招聘页（Greenhouse / Lever / Ashby / SmartRecruiters），岗位直接从源头同步"
        : "Subscribe to official company job boards (Greenhouse / Lever / Ashby / SmartRecruiters); jobs sync straight from the source",
    seed: locale === "zh-CN" ? "添加示例源" : "Add sample sources",
    syncAll: locale === "zh-CN" ? "全部同步" : "Sync all",
    catalogTitle:
      locale === "zh-CN" ? "从目录搜索订阅（15,000+ 海外公司看板）" : "Search the catalog (15,000+ boards)",
    catalogPlaceholder: locale === "zh-CN" ? "输入公司名，如 stripe、figma…" : "Company token, e.g. stripe, figma…",
    catalogSearch: locale === "zh-CN" ? "搜索" : "Search",
    subscribe: locale === "zh-CN" ? "订阅" : "Subscribe",
    subscribed: locale === "zh-CN" ? "已订阅" : "Subscribed",
    catalogEmpty:
      locale === "zh-CN" ? "输入关键词搜索后展示结果" : "Results appear after a search",
    viewFeed: locale === "zh-CN" ? "查看信息流" : "View feed",
    loading: locale === "zh-CN" ? "加载中…" : "Loading…",
    empty:
      locale === "zh-CN"
        ? "还没有数据源。粘贴任意 Greenhouse/Lever/Ashby/SmartRecruiters 招聘页链接开始。"
        : "No sources yet. Paste any Greenhouse/Lever/Ashby/SmartRecruiters job board URL to start.",
    lastSync: locale === "zh-CN" ? "上次同步" : "Last sync",
    never: locale === "zh-CN" ? "从未" : "never",
    jobs: locale === "zh-CN" ? "岗位" : "jobs",
    enable: locale === "zh-CN" ? "启用" : "Enable",
    disable: locale === "zh-CN" ? "停用" : "Disable",
    sync: locale === "zh-CN" ? "同步" : "Sync",
    delete: locale === "zh-CN" ? "删除" : "Delete",
    statusOk: locale === "zh-CN" ? "正常" : "OK",
    statusEmpty: locale === "zh-CN" ? "无岗位" : "Empty",
    statusError: locale === "zh-CN" ? "失败" : "Error",
    statusNever: locale === "zh-CN" ? "未同步" : "Not synced",
  };

  const statusIcon = (source: JobSource) => {
    if (!source.last_synced_at)
      return <CircleSlash className="h-4 w-4 text-muted-foreground/80" aria-label={t.statusNever} />;
    if (source.last_sync_status === "ok")
      return <CheckCircle2 className="h-4 w-4 text-green-600" aria-label={t.statusOk} />;
    if (source.last_sync_status === "empty")
      return <CircleSlash className="h-4 w-4 text-amber-500" aria-label={t.statusEmpty} />;
    return <XCircle className="h-4 w-4 text-red-600" aria-label={t.statusError} />;
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Rss className="h-6 w-6 text-indigo-600" aria-hidden />
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t.subtitle}</p>
        </div>
        <Link
          href="/job-feed"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/40"
        >
          <Link2 className="h-4 w-4" aria-hidden />
          {t.viewFeed}
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 mb-6">
        <JobSourceAddForm busy={adding} onAdd={addSource} />
        <div className="flex flex-wrap gap-3 mt-3">
          <button
            type="button"
            onClick={() => void seedDefaults()}
            disabled={adding}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {t.seed}
          </button>
          <button
            type="button"
            onClick={() => void syncAll()}
            disabled={syncAllBusy || sources.length === 0}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncAllBusy ? "animate-spin" : ""}`} aria-hidden />
            {t.syncAll}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Library className="h-4 w-4 text-indigo-600" aria-hidden />
          {t.catalogTitle}
        </h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void searchCatalog();
          }}
        >
          <input
            type="search"
            value={catalogQuery}
            onChange={(e) => setCatalogQuery(e.target.value)}
            placeholder={t.catalogPlaceholder}
            aria-label={t.catalogPlaceholder}
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={catalogSearching || !catalogQuery.trim()}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          >
            {t.catalogSearch}
          </button>
        </form>
        {catalogResults.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {catalogResults.map((hit) => {
              const key = `${hit.ats_type}:${hit.org_key}`;
              const done = subscribedKeys.has(key);
              return (
                <li
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {ATS_LABELS[hit.ats_type] ?? hit.ats_type}
                  </span>
                  <span className="font-medium text-gray-800">{hit.org_key}</span>
                  <button
                    type="button"
                    onClick={() => void subscribeFromCatalog(hit.ats_type, hit.org_key)}
                    disabled={done}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      done
                        ? "bg-green-100 text-green-700"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {done ? t.subscribed : t.subscribe}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground/80">{t.catalogEmpty}</p>
        )}
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

      {loading && sources.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">{t.loading}</p>
      ) : sources.length === 0 ? (
        <div className="rounded-lg border border-dashed border-input py-12 text-center">
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sources.map((source) => (
            <li
              key={source.id}
              className="rounded-lg border border-border bg-card p-4 flex flex-wrap items-center gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {statusIcon(source)}
                  <span className="font-semibold text-foreground">{source.name}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                    {ATS_LABELS[source.ats_type] ?? source.ats_type}:{source.org_key}
                  </span>
                  {!source.enabled && (
                    <span className="text-xs text-muted-foreground/80">
                      ({locale === "zh-CN" ? "已停用" : "disabled"})
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.lastSync}:{" "}
                  {source.last_synced_at
                    ? new Date(source.last_synced_at).toLocaleString()
                    : t.never}
                  {source.last_synced_at &&
                    ` · ${source.last_total_count} ${t.jobs} · +${source.last_new_count}`}
                </p>
                {source.last_sync_status === "error" && source.last_sync_message && (
                  <p className="text-xs text-red-600 mt-1 truncate" title={source.last_sync_message}>
                    {source.last_sync_message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void syncSource(source.id)}
                  disabled={syncingId === source.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${syncingId === source.id ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  {t.sync}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleEnabled(source)}
                  className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/40"
                >
                  {source.enabled ? t.disable : t.enable}
                </button>
                <button
                  type="button"
                  onClick={() => void removeSource(source)}
                  aria-label={`${t.delete} ${source.name}`}
                  className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
