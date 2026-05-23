import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import {
  FileText,
  Target,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Zap,
  Shield,
  Users,
} from "lucide-react";
import React from "react";

const features = [
  {
    name: "智能简历优化",
    description: "AI 驱动的简历分析，针对每个职位自动优化您的简历内容",
    icon: Sparkles,
  },
  {
    name: "职位匹配分析",
    description: "深度解析职位描述，计算您的匹配度并提供改进建议",
    icon: Target,
  },
  {
    name: "一键生成简历",
    description: "根据职位要求快速生成针对性简历，节省 90% 编辑时间",
    icon: FileText,
  },
  {
    name: "实时预览",
    description: "所见即所得的简历编辑器，实时查看修改效果",
    icon: Zap,
  },
  {
    name: "数据洞察",
    description: "可视化展示您的技能与职位需求的匹配情况",
    icon: BarChart3,
  },
  {
    name: "安全可靠",
    description: "企业级数据加密，保护您的隐私和求职信息安全",
    icon: Shield,
  },
];

const benefits = [
  "提高面试邀请率 3 倍",
  "节省简历准备时间 90%",
  "支持 PDF、Word、LinkedIn 导入",
  "中英文双语支持",
  "无限次简历生成",
  "7×24 小时 AI 助手",
];

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navigation />

      <main>
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden pt-14">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.100),white)] opacity-20" />
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-400 to-blue-600 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>

          <div className="py-24 sm:py-32 lg:pb-40">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  让每一次求职，
                  <br />
                  都是一场
                  <span className="text-blue-600">被看见的</span>
                  <br />
                  知遇之恩
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-700">
                  SyncHire 知遇用 AI 为您的求职之路赋能。智能匹配职位需求，自动优化简历内容，
                  让您在众多求职者中脱颖而出，找到理想的工作机会。
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Button size="lg" className="text-base" asChild>
                    <Link href="/signup">
                      免费开始使用
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-base" asChild>
                    <Link href="/demo">查看演示</Link>
                  </Button>
                </div>
                <div className="mt-8 flex items-center justify-center gap-x-6 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>已有 10,000+ 求职者使用</span>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3">
                  {benefits.map((benefit) => (
                    <div key={benefit} className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-500" />
                      <dd className="text-sm font-medium leading-6 text-gray-900">
                        {benefit}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 sm:py-32 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-base font-semibold leading-7 text-blue-600">
                核心功能
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                一站式 AI 求职助手
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-700">
                从简历优化到职位匹配，我们提供全流程的 AI 支持，让求职变得简单高效
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3">
                {features.map((feature) => (
                  <div key={feature.name} className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                        <feature.icon
                          className="h-6 w-6 text-white"
                          aria-hidden="true"
                        />
                      </div>
                      {feature.name}
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-700">
                      {feature.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative isolate overflow-hidden bg-blue-600 py-24 sm:py-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.400),white)] opacity-20" />
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-400 to-blue-600 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>

          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                准备好开启您的求职之旅了吗？
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
                立即注册，获得专业的 AI 求职建议，让您的简历在众多候选人中脱颖而出
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button size="lg" variant="secondary" className="text-base" asChild>
                  <Link href="/signup">
                    免费注册
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">SyncHire 知遇</span>
            </div>
            <div className="mt-4 md:mt-0 text-sm text-gray-700">
              © 2024 SyncHire. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Memoize HomePage to prevent unnecessary re-renders
export default React.memo(Home);
