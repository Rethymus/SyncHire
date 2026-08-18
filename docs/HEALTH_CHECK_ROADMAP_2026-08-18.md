# SyncHire 健康复查与优化路线图（2026-08-18）

> 在四个修复批次（`97ac572`…`ea3e7f0`）之后做的一轮全量体检：生产构建、约定文件、CI、依赖、e2e、i18n、水合模式、Electron 构建。本文记录**仍然存在的问题**与**后续优化的可实施方案**，供排期决策。

## 一、体检结果

### 通过项
- **生产构建**：`next build` 成功，44 个静态页，编译 6.7s；`/resumes`、`/job-descriptions` 为规范的兼容重定向。
- **i18n 键位**：`lite-i18n` 的 en-US / zh-CN 深度键位 100% 对齐（无缺失键）。
- **Electron**：`npm run build:fill-engine` 正常产出注入脚本（`form-fill-engine.ts` 保留决策正确）。
- **CI**：`ci.yml` 含前端 lint/test/build + 后端 pytest（health 端点子集）。
- **水合安全**：全库 localStorage 读取均发生在 effect/callback 内；`job-feed` 页 render 期 `electronAPI` 探测是唯一剩余分支，但仅 Electron 环境与 SSR 取值不同，web 端无影响。

### 发现的问题（按优先级）

| # | 问题 | 影响 | 工作量 |
|---|------|------|--------|
| P1-1 | **无 Next 错误边界约定文件**（`app/error.tsx`、`global-error.tsx` 均不存在；旧手写 error-boundary 家族已随死代码删除） | 任何页面渲染异常 → 用户看到 Next 默认英文错误页，无导航、无恢复操作 | ~0.5h |
| P1-2 | **e2e 全面漂移且未接 CI**：4 个 spec（共 1333 行）针对旧 UI 编写（英文断言如 "AI Runtime Settings"、"Save AI settings"），当前默认中文且文案已改版；CI 从不执行 e2e，属"僵尸测试" | 回归防护为零；误导贡献者 | smoke 0.5d，全量修复 2-3d |
| P2-1 | **僵尸路由 `/saved-searches`**：515 行完整功能页，全库无任何链接指向它 | 死功能；维护负担 | 接入搜索页入口 0.5h，或删除 0.5h |
| P2-2 | **依赖残留**：`@dnd-kit/core|sortable|utilities`、`@radix-ui/react-accordion` 零引用；`api-integration-test.ts` 文件名不匹配 vitest include（`*.test.*`），从未运行却参与 tsc | 安装体积、认知噪音 | 1h |
| P2-3 | **next-intl 整链仅服务已删除的 [locale] 体系**：root 依赖 + `src/i18n/`（3 文件）+ `src/locales/`（32K）+ `next.config.ts` 插件行，无任何页面消费 | 依赖与构建插件死重量 | 1h（含验证 build-pages） |
| P3-1 | `/data` 开发模式 script-tag 警告（next-themes × React 19.2 dev 噪音，生产零错误，已在审计文档记录） | 仅开发者体验 | 已接受 |
| P3-2 | `unifiedClient` 各 API 组返回类型全部 `any`（JobSource 一组除外） | 类型安全缺口，逐步收紧 | 渐进 |

## 二、优化路线图（按批次给出可实施方案）

### 批次 A：稳定性补课（建议最先做）
- **A1 错误边界**（对应 P1-1）：新增 `src/app/error.tsx`（client 组件，签名 `{ error, reset }`）与 `src/app/global-error.tsx`。视觉复用 `EmptyState`（图标 + 双语标题 + 描述），操作区放「重试」（调 `reset()`）与「返回仪表盘」（Link）。可另加 `app/loading.tsx` 骨架（复用 ui/skeleton）。
- **A2 e2e 复活**（对应 P1-2）：
  1. 新写 `e2e/smoke.spec.ts`：遍历 16 个路由断言 200 + `role="navigation"` 可见 + 收集 console error 为空（过滤已知 dev 噪音）；
  2. CI 增 job：`npx playwright install --with-deps chromium` + `npm run test:e2e -- --project=chromium`，与 dev server（`npm run dev` + lite 后端）用 `webServer` 配置拉起；
  3. 旧 4 个 spec：修复断言到当前文案/IA，暂无法稳定者标 `test.fixme` 并建 issue。

### 批次 B：瘦身（低风险纯删除）
- **B1**：移除 next-intl 链——`next.config.ts` 删 `createNextIntlPlugin` 行、删 `src/i18n/`、`src/locales/`、root `package.json` 的 `next-intl`；跑 `build:pages` 验证静态导出不依赖。
- **B2**：卸载 `@dnd-kit/*`×3、`@radix-ui/react-accordion`；删 `api-integration-test.ts`；决策 `/saved-searches`（建议：在 `/search` 页加「保存的搜索」入口卡片——功能已完成只差接线，比删除划算）。

### 批次 C：体验与性能
- **C1 路由级代码切分**：先 `ANALYZE=true next build`（`@next/bundle-analyzer`）拿数据；预期收益点是 `recharts`（analytics）、`react-big-calendar`（interviews）、`framer-motion` 与简历构建器大组件——用 `next/dynamic(() => import(...), { ssr: false })` 包裹重图表区。
- **C2 PWA**：`public/manifest.webmanifest` + brand 图标（docs/assets/brand 已有）+ 极简 SW（仅 app-shell 缓存）；注意 GitHub Pages 版 CSP（`script-src 'self'`）允许 SW。本地优先工具 + 可安装 = 桌面/手机双端零壳分发，与现有 Capacitor/Tauri 壳互补。
- **C3 移动端底部导航**（可选）：基于现有 Radix Sheet 模式做 4-5 项底部 tab bar（仪表盘/信息流/申请/更多），拇指热区优于顶部抽屉；渐进增强，不影响桌面。
- **C4 表单体系**：新表单一律 `react-hook-form` + `zod`（依赖已装、`@hookform/resolvers` 就位），旧表单只在被触碰时迁移，不做专项大改。

### 批次 D：数据层类型化（渐进）
- **D1**：参照 `jobSourceAPI` 的 `JobSource` 样板，为 `unifiedClient` 的 application/resume/jd 组补接口（后端 pydantic schema 是真源，可写脚本从 OpenAPI `/openapi.json` 生成初版 TS 类型再手工收敛）。
- **D2**：Electron 求职浏览器的 fill-engine 注入路径目前只能手测；可在 Electron 侧加一个内置 `test-form.html`（含中英文字段样例）作为 e2e 目标页，把填表引擎纳入自动化。

## 三、不建议做的
- 恢复已删除的 websocket/realtime、error-recovery 家族——它们从未接线；真需要时按 Next 约定（error.tsx）与轻量轮询重新设计，而非从 git 历史捞回。
- 把 api-client 两个请求核心强行合一——消费者语义真实分裂（信封 vs 抛错），合一必破坏一方；文档化的双核是当前正确形态。
