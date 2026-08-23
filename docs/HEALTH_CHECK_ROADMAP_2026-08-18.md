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


## 四、批次 A/B 实施记录（2026-08-18，当日完成）

| 项 | 状态 | 说明 |
|----|------|------|
| A1 错误边界 | ✅ | 新增 `app/error.tsx`（路由级，保留全局导航 + 重试/返回仪表盘，双语文案进 lite-i18n）、`app/global-error.tsx`（自带 html/body、内联样式不依赖任何 provider）、`app/loading.tsx`（路由骨架屏）。用临时抛错路由实测渲染通过。 |
| A2 e2e smoke | ✅ | 新增 `e2e/smoke.spec.ts`：16 路由 200+导航可见+零意外 console 错误 + saved-searches 可达性，本地 17/17 通过；CI 新增 `frontend-e2e-smoke` job（lite 后端就绪探测 + playwright chromium + 失败上传报告）。旧 4 个漂移 spec 暂不运行，留待专项修复。 |
| B1 next-intl 链移除 | ✅ | 插件行、`src/i18n/`、`src/locales/`、root 依赖全部移除；`next build` 与 `build:pages` 静态导出（含 CSP 注入）均验证通过。 |
| B2 瘦身 | ✅ | 卸载 `@dnd-kit`×3、`@radix-ui/react-accordion`；删除从未运行的 `api-integration-test.ts`；**新发现并删除** src 外平行旧目录 `frontend/components/`（3 文件，别名解析不可达，仅被 tsconfig glob 捎带编译）；`/saved-searches` 在搜索页头部接入「保存的搜索」入口。 |

验证汇总：tsc/eslint/237 单测全绿；`next build` 44 页；`build:pages` 导出成功；smoke 17/17。

## 五、批次 C 实施记录（2026-08-18，当日完成）

### C1 路由级代码切分（数据驱动）
先用路由 manifest × chunk 体积交叉测量建立基线（Turbopack 构建，webpack analyzer 不适用）：
- 发现 recharts(390KB) 已被 Turbopack 按路由隔离在 analytics 内，**无需再切**；
- 真正的问题：framer-motion(137KB) 随 `ApplicationCreateDialog` 进入 dashboard/applications 首载；interviews 路由 935KB 中日历变体只在视图切换时才需要。

实施 `next/dynamic`（ssr:false）：
- `ApplicationCreateDialog`（dashboard + applications 两处）
- `InterviewCalendarEnhanced` / `InterviewDragDropCalendar`（interviews 视图切换懒加载）

**实测收益**（路由 chunk 体积）：dashboard 498→333KB（**−33%**）、applications 584→447KB、interviews 935→717KB；framer 块不再被任何路由静态引用（完全懒加载）。功能回归：懒加载对话框点击即开、增强日历切换即载，零报错。

### C2 PWA
- `public/manifest.webmanifest`（相对 start_url/scope 兼容 basePath；SVG 图标复用品牌资产）
- `public/sw.js` 极简策略：仅缓存不可变的 `/_next/static/**`（cache-first），页面与 API 一律直连网络——不拿数据新鲜度换离线
- `components/sw-register.tsx`：仅生产 + http(s) 注册（dev 与 Electron/Tauri 的 file:// 壳自动跳过）
- 生产实测：SW active、`synchire-static-v1` 缓存 11 条静态资源；`build:pages` 导出含 sw/manifest，href 正确注入 `/SyncHire` basePath。

验证：tsc/eslint/237 单测/生产构建/build:pages/smoke 17/17 全绿。

## 六、代理驱动批次实施记录（2026-08-19）

按优先级并行驱动三个子代理 + 主线程 CI 接线，全部完成：

| 项 | 结果 |
|----|------|
| P1 e2e 修复 | 4 个漂移 spec 全部修复：断言中英双语化、file-upload 的"链接导入"用例改为 mock 500 断言降级路径、helpers 提取 KNOWN_NOISE 过滤。**全套 34/34 通过（零 fixme）**，55 张 README 截图再生成。首次代理因账户配额中止未留改动，重发收紧范围后完成。 |
| P2-2 CI | 新增 `static-export` job（build:pages + sw/manifest/CSP 注入断言）；e2e job 从 smoke-only 扩为全量；quality-gate 纳管全部五个检查 job。 |
| P2-3 文档 | README/README_LITE 与现状对齐（根目录安装、Windows oxide 说明、路由/语言说明、新能力清单、CI 防线描述、Electron 构建步骤；删除不存在的 /examples 引用与错误相对路径）。 |
| P2-4 类型化 | api-client 信封核心三组 API 全面类型化：12 个导出接口精确镜像后端 openapi（LiteResume/LiteJd/LiteApplication/ApplicationStatus 枚举等），仅 getInterviewPrep 留 any（后端无此端点）。消费方零修改零报错。 |

**代理过程中的重要发现**：
1. **store 持久化竞态（已修复）**：`persistState` 经"动态 import + 平台探测"异步链写入，硬刷新可能赶在落盘前 → 下一页以空状态 rehydrate 并覆盖写回，丢刚添加的数据（e2e 并行时实测复现）。修复：localStorage 同步镜像写入 + 平台桥异步写相同 payload（幂等）。
2. **前后端端点不匹配清单**（后端 lite 未实现或形状不符，详见 api-client 提交说明）：前端调用的 12 个端点不存在（interview-prep/history/optimize/bulk 系列/jd/parse 单数等）、`getMatchScore` 用 GET 而后端仅 POST、`resumeAPI.create` 发 JSON 而后端 `/api/resumes` 是 multipart——后续批次应逐一对齐或裁剪。

验证：tsc/eslint/237 单测/生产构建(44 页)/静态导出/**全量 e2e 34/34（1.3 分钟）**。

## 七、第二轮回溯项实施记录（2026-08-19，代理驱动）

| 项 | 结果 |
|----|------|
| P1 契约对齐 | 逐端点消费者普查后处置：lite 后端补齐 5 端点（PATCH status[含旧状态别名+timeline]、GET history、GET match[持久化+词重叠启发式]、GET interview-prep[camelCase 全载荷]、POST optimize 改形）；前端删除 10 个零消费死方法与 3 个孤儿类型；optimize 留全栈。新增 test_lite_contract_drift.py 6 用例。 |
| P2-2 README 数字 | 过时数字清零：237 单测/34 e2e/16 路由 smoke；后端改"由 CI 门禁保证"（静态计数失实）；删除描述不存在套件的"前端集成测试"行；CI E2E 行措辞对齐全量。 |
| P2-3 填表引擎测试 | test-form.html 双语测试表单 + Electron 面板入口（file:// 零主进程改动）+ fill-engine.spec.ts（beforeAll 重建 IIFE 防假阳性；断言 API 面/14 字段双语检测/提交排除/填充全链路含事件派发）。e2e 总量 34→37。盲区（真实框架受控组件/自定义 combobox/iframe/Shadow DOM）已在 spec 头注明。 |
| P2-4 CI pytest 扩容 | backend-tests 加入两个 lite 套件（TestClient/SQLite，无服务依赖）。顺带修复：5 个存量文件未过 black 使 CI 门禁在 main 上红灯——已格式化（本地用 CI 钉住的 ruff 0.9.2/black 26 验证：176 文件 clean）。 |

验证：tsc/eslint/237 单测/**e2e 37/37**/生产构建/后端 black+ruff+10 lite 测试全绿。

**新发现（后续项）**：① readme-screenshots 每次运行再生截图，且部分页面含实时时间戳导致必然 diff——建议改为按需手动生成或对时间敏感页面做时间冻结；② 全栈 pytest（test_api.py 链）本地缺 pgvector/botocore 依赖只能在 CI 验证，属预期。

## 八、第三轮代理驱动批次收官（2026-08-23）

| 项 | 结果 |
|----|------|
| P1-1 全栈 pytest 进 CI | ✅ 26 文件/421 用例纳入 backend-tests（全部服务无关：SQLite+mock）；修复 conftest 的 FastAPI Request 注解解析 bug 与一处 sync/async 冲突；删除孤儿 test_api_helpers.py（含 3 处文档残留引用）。 |
| P2-2 直返核心类型化 | ✅ 五组全类型化，13 个新接口按后端源码核对；确认直返核心零缺失端点。 |
| P2-3 React 受控组件覆盖 | ✅ build-fill-fixture（React 19 无 UMD→esbuild 打包仓库内 react）+ 受控铁证用例（原生 setter 不派发→preview 不动）；代理中途静默死亡，主线程修复两处引号语法错后 3/3 通过；引擎零缺陷。 |
| P2-4/5 Electron 冒烟+死配置 | ✅ SYNCHIRE_SMOKE 升级为端到端真实路径验证（6s/退出码 0）；vitest 集成死配置与全库引用清零。 |
| P3-7/9 settings 分片+端口守卫 | ✅ 文案 509→81 行壳层（顺带清除拖入首载的死 import）；e2e-preflight 三路径决策（free/healthy/zombie）+ test:e2e:guarded。 |
| P3-8 全栈 e2e 脚手架 | ✅ auth-fullstack spec（CI 真跑/本地三层守卫干净 skip）+ 专用 playwright.fullstack.config + Docker 本地方案脚本 + advisory CI job。 |
| 新组件单测 | ✅ mobile-bottom-nav/theme-toggle/error/sw-register 26 用例；前端 237→263。 |
| 文档同步 | ✅ README×3/testing-qa：421 后端、263 前端、38 e2e + 4 按需跳过、guarded/smoke 命令。 |

**CI 实测反馈循环**（远程首跑暴露、当日修复）：① 本地 black 25.1.0 vs CI 钉住 26.5.1 的风格漂移——重格式化 5 文件并对齐本地工具链版本；② 全栈后端模块级依赖 playwright（pdf_generator→resumes 路由→main.py）却只声明在 dev 依赖——补入 requirements.txt。

**测试面最终版**：后端 421（CI 门禁）+ 前端单测 263 + e2e 42（38 过 + 4 按需：2 截图/2 全栈）+ Electron 冒烟（本地，进 CI 进行中）+ 静态导出断言 job。

**方法论沉淀**：本地与 CI 工具链版本必须钉一致（black 25/26、ruff 0.9.2 三次踩坑）；被杀 playwright 任务会孤儿化 webServer（守卫已固化）；timeout 管道会掩盖退出码；共享文件的原子提交用"暂摘-提交-复原"拆分。