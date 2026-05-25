"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Navigation } from "@/components/navigation";
import { useAppStore } from "@/lib/store";
import { apiClient } from "@/lib/api-client";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Lightbulb,
  Calendar,
  Award,
  Target,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface StatsOverview {
  total_applications: number;
  total_resumes: number;
  total_jds: number;
  active_applications: number;
  interview_count: number;
  offer_count: number;
  rejection_count: number;
  pending_count: number;
}

interface SuccessRateMetrics {
  application_to_interview_rate: number;
  interview_to_offer_rate: number;
  overall_success_rate: number;
  average_match_score: number;
  total_applications: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

interface ActivityDataPoint {
  date: string;
  applications: number;
  interviews: number;
  offers: number;
  rejections: number;
}

interface TrendData {
  period: string;
  applications: number;
  success_rate: number;
  avg_match_score: number;
}

interface Insight {
  type: string;
  title: string;
  description: string;
  actionable: boolean;
  priority: string;
}

interface AnalyticsResponse {
  overview: StatsOverview;
  success_rates: SuccessRateMetrics;
  status_distribution: StatusDistribution[];
  recent_activity: ActivityDataPoint[];
  trends: TrendData[];
  insights: Insight[];
  generated_at: string;
}

const COLORS = {
  pending: "#3B82F6",
  applied: "#10B981",
  interview: "#F59E0B",
  offer: "#8B5CF6",
  rejected: "#EF4444",
  draft: "#6B7280",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "处理中",
  applied: "已申请",
  interview: "面试中",
  offer: "录用",
  rejected: "已拒绝",
  draft: "草稿",
};

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  success: CheckCircle2,
  warning: AlertCircle,
  opportunity: Lightbulb,
  info: Clock,
};

const INSIGHT_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  opportunity: "bg-blue-100 text-blue-800 border-blue-200",
  info: "bg-gray-100 text-gray-800 border-gray-200",
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: number;
}

function StatCard({ title, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend > 0 ? (
                <ArrowUp className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const { isAuthenticated } = useAppStore();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30);

  const fetchAnalytics = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<AnalyticsResponse>(
        `/analytics?days=${timeRange}`
      );
      setAnalytics(response.data ?? null);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, timeRange]);

  useEffect(() => {
    const loadData = async () => {
      await fetchAnalytics();
    };
    loadData();
  }, [fetchAnalytics]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              请先登录
            </h1>
            <p className="text-gray-600">
              您需要登录才能查看分析数据
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-lg font-medium text-red-900">加载失败</h3>
                <p className="text-red-700 mt-1">{error || "无法加载分析数据"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">数据分析</h1>
            <p className="mt-2 text-gray-600">
              追踪您的求职进度和成功率
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="timeRange" className="text-sm text-gray-600">
              时间范围:
            </label>
            <select
              id="timeRange"
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={7}>最近 7 天</option>
              <option value={30}>最近 30 天</option>
              <option value={90}>最近 90 天</option>
            </select>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="总申请数"
            value={analytics.overview.total_applications}
            icon={Briefcase}
            color="bg-blue-500"
          />
          <StatCard
            title="面试邀请"
            value={analytics.overview.interview_count}
            icon={CheckCircle2}
            color="bg-green-500"
          />
          <StatCard
            title="录用通知"
            value={analytics.overview.offer_count}
            icon={Award}
            color="bg-purple-500"
          />
          <StatCard
            title="活跃申请"
            value={analytics.overview.active_applications}
            icon={Clock}
            color="bg-yellow-500"
          />
        </div>

        {/* Success Rates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                面试邀请率
              </h3>
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {analytics.success_rates.application_to_interview_rate}%
            </div>
            <p className="text-sm text-gray-600">
              {analytics.success_rates.total_applications} 份申请中有{" "}
              {analytics.overview.interview_count} 份面试
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                面试成功率
              </h3>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {analytics.success_rates.interview_to_offer_rate}%
            </div>
            <p className="text-sm text-gray-600">
              面试中获得录用的比例
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                平均匹配度
              </h3>
              <Award className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {analytics.success_rates.average_match_score}%
            </div>
            <p className="text-sm text-gray-600">
              AI 分析的平均匹配分数
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Timeline */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              活动趋势
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.recent_activity.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string | number) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value: any) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("zh-CN");
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke="#3B82F6"
                  name="申请数"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="interviews"
                  stroke="#10B981"
                  name="面试"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              状态分布
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.status_distribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) =>
                    `${STATUS_LABELS[entry.status] || entry.status}: ${entry.percentage}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.status_distribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.status as keyof typeof COLORS] || "#6B7280"}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: any, props: any) => [
                  value,
                  STATUS_LABELS[props.payload?.status] || props.payload?.status || name
                ]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Trends */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            周度趋势分析
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="applications"
                fill="#3B82F6"
                name="申请数"
              />
              <Bar
                yAxisId="right"
                dataKey="success_rate"
                fill="#10B981"
                name="成功率 (%)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        {analytics.insights.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              智能洞察
            </h3>
            <div className="space-y-4">
              {analytics.insights.map((insight, index) => {
                const Icon = INSIGHT_ICONS[insight.type] || Lightbulb;
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      INSIGHT_COLORS[insight.type] || "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{insight.title}</h4>
                          {insight.actionable && (
                            <span className="text-xs px-2 py-1 bg-white rounded-full">
                              可操作
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-1">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          数据更新时间:{" "}
          {new Date(analytics.generated_at).toLocaleString("zh-CN")}
        </div>
      </main>
    </div>
  );
}

export default AnalyticsPage;
