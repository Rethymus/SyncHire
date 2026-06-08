"use client";

import { useState, useCallback } from "react";
import { UniversalSearch } from "@/components/universal-search";
import { SearchResults } from "@/components/search-results";
import { searchApi, SearchFilters as APISearchFilters } from "@/lib/api/search";
import { useAppStore } from "@/lib/store";
import { useLiteCopy } from "@/lib/lite-i18n";
import { Briefcase } from "lucide-react";

const SEARCH_COPY = {
  "en-US": {
    title: "Search Job Descriptions",
    subtitle: "Find job descriptions by semantic similarity or keywords",
    placeholder: "Search for job descriptions by skills, requirements, or keywords...",
  },
  "zh-CN": {
    title: "搜索职位描述",
    subtitle: "按技能、要求或关键词查找职位描述",
    placeholder: "按技能、岗位要求或关键词搜索职位描述...",
  },
} as const;

function universalSearchCopy(locale: "en-US" | "zh-CN") {
  return locale === "zh-CN"
    ? {
        ariaLabel: "搜索",
        clearSearch: "清空搜索",
        recentSearches: "最近搜索",
        filters: "筛选",
        active: "已启用",
        clearFilters: "清除筛选",
        sortBy: "排序:",
        recent: "最近更新",
        created: "创建时间",
        matchScore: "匹配度",
        title: "标题",
        descending: "降序",
        ascending: "升序",
        status: "状态",
        allStatuses: "全部状态",
        draft: "草稿",
        applied: "已申请",
        interview: "面试中",
        offer: "已录用",
        rejected: "已拒绝",
        matchScoreFilter: "匹配度",
        minPercent: "最低 %",
        maxPercent: "最高 %",
        dateRange: "日期范围",
        to: "至",
      }
    : undefined;
}

function searchResultsCopy(locale: "en-US" | "zh-CN") {
  return locale === "zh-CN"
    ? {
        noResults: "没有找到结果",
        noQuery: "输入搜索词以查找结果。",
        noQueryPrefix: "没有结果匹配",
        noQuerySuffix: "请尝试不同关键词或筛选条件。",
        found: "找到",
        result: "个结果",
        results: "个结果",
        forQuery: "关于",
        match: "匹配度",
        resume: "简历",
        view: "查看",
        details: "详情",
        prep: "准备",
        previous: "上一页",
        next: "下一页",
        page: "第",
        of: "共",
        status: {
          draft: "草稿",
          applied: "已申请",
          interview: "面试中",
          offer: "已录用",
          rejected: "已拒绝",
          pending: "处理中",
          optimized: "已优化",
        },
      }
    : undefined;
}

export default function JDSearchPage() {
  const { locale } = useLiteCopy();
  const copy = SEARCH_COPY[locale];
  const { jobDescriptions } = useAppStore();
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentFilters, setCurrentFilters] = useState<APISearchFilters>({
    page: 1,
    pageSize: 10,
    sortBy: "similarity",
    sortOrder: "desc",
  });

  const handleSearch = useCallback(async (query: string, filters: APISearchFilters) => {
    if (query.trim().length < 1) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setCurrentQuery(query);
    setCurrentFilters(filters);

    try {
      const response = await searchApi.searchJDs(query, {
        ...filters,
        page: filters.page || 1,
        pageSize: filters.pageSize || 10,
      });

      setResults(response.results);
      setTotal(response.total);
      setPage(response.page);
    } catch (error) {
      const normalizedQuery = query.trim().toLowerCase();
      const requestedPage = filters.page || 1;
      const requestedPageSize = filters.pageSize || 10;
      const filteredJds = jobDescriptions.filter((jd) => {
        const searchableText = [
          jd.title,
          jd.company,
          jd.description,
          ...jd.requirements,
          ...jd.skills,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      });

      setResults(filteredJds
        .slice((requestedPage - 1) * requestedPageSize, requestedPage * requestedPageSize)
        .map((jd) => ({
          id: jd.id,
          title: jd.title,
          content: jd.description,
          similarity: 1,
          type: "jd",
          created_at: jd.createdAt.toISOString(),
          highlighted_content: jd.description,
        })));
      setTotal(filteredJds.length);
      setPage(requestedPage);
    } finally {
      setLoading(false);
    }
  }, [jobDescriptions]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      await handleSearch(currentQuery, {
        ...currentFilters,
        page: newPage,
      });
    },
    [currentQuery, currentFilters, handleSearch]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {copy.title}
              </h1>
              <p className="text-sm text-gray-600">
                {copy.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <UniversalSearch
            onSearch={handleSearch}
            placeholder={copy.placeholder}
            searchType="jd"
            showFilters={true}
            copy={universalSearchCopy(locale)}
          />
        </div>

        {/* Results */}
        <SearchResults
          results={results}
          total={total}
          page={page}
          pageSize={currentFilters.pageSize || 10}
          query={currentQuery}
          onPageChange={handlePageChange}
          loading={loading}
          searchType="jd"
          copy={searchResultsCopy(locale)}
        />
      </main>
    </div>
  );
}
