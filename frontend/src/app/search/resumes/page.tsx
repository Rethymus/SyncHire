"use client";


import { useState, useCallback } from "react";
// import { Navigation } from "@/components/navigation";
import { UniversalSearch } from "@/components/universal-search";
import { SearchResults } from "@/components/search-results";
import { searchApi, SearchFilters as APISearchFilters, SearchResult } from "@/lib/api/search";
import { useAppStore } from "@/lib/store";
import { useLiteCopy } from "@/lib/lite-i18n";
import { FileText } from "lucide-react";

const SEARCH_COPY = {
  "en-US": {
    title: "Search Resumes",
    subtitle: "Find resumes by semantic similarity or keywords",
    placeholder: "Search for resumes by skills, experience, or keywords...",
    unknownResume: "Unknown Resume",
  },
  "zh-CN": {
    title: "搜索简历",
    subtitle: "按技能、经历或关键词查找简历",
    placeholder: "按技能、经历或关键词搜索简历...",
    unknownResume: "未知简历",
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

export default function ResumeSearchPage() {
  const { locale } = useLiteCopy();
  const copy = SEARCH_COPY[locale];
  const { resumes } = useAppStore();
  const [results, setResults] = useState<SearchResult[]>([]);
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
      const response = await searchApi.searchResumes(query, {
        ...filters,
        page: filters.page || 1,
        pageSize: filters.pageSize || 10,
      });

      setResults(response.results as SearchResult[]);
      setTotal(response.total);
      setPage(response.page);
    } catch (error) {
      const normalizedQuery = query.trim().toLowerCase();
      const requestedPage = filters.page || 1;
      const requestedPageSize = filters.pageSize || 10;
      const filteredResumes = resumes.filter((resume) => {
        const searchableText = [
          resume.name,
          resume.content,
          ...(resume.skills ?? []),
          ...(resume.experience ?? []),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      });

      setResults(filteredResumes
        .slice((requestedPage - 1) * requestedPageSize, requestedPage * requestedPageSize)
        .map((resume) => ({
          id: resume.id,
          title: resume.name,
          content: resume.content,
          similarity: 1,
          type: "resume",
          created_at: resume.uploadedAt.toISOString(),
          highlighted_content: resume.content,
        })));
      setTotal(filteredResumes.length);
      setPage(requestedPage);
    } finally {
      setLoading(false);
    }
  }, [resumes]);

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
              <FileText className="h-6 w-6 text-blue-600" />
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
            searchType="resume"
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
          searchType="resume"
          copy={searchResultsCopy(locale)}
        />
      </main>
    </div>
  );
}
