# 视觉走查审计（2026-09-04）

> 方法：`next dev` + Lite 后端（`main_lite.py`）真实起服，向 SQLite 注入跨 5 周、
> 全状态分布的申请数据，Playwright 以桌面（1440）与移动（390）双宽度逐页截图，
> 收集控制台错误与网络失败，再逐页人工/视觉审查。目的是抓**纯代码评审看不到的
> 问题**：集成断裂、渲染崩溃、数据源矛盾、文案原则不一致。
> 截图与脚本：`tmp/walkthrough/`、`tmp/seed_visual.py`（开发辅助，不入库的可选保留）。

## 第二轮（同日晚：暗色模式 + 状态词表收敛）

第二轮走查把主题切换到暗色模式（第一轮从未验证过暗色），并用规范词表数据
驱动 11 条路由 + 申请详情（含智能工作流 tab）。修复：

| # | 问题 | 根因 | 修复 |
|---|------|------|------|
| W1 | **三套状态词表并存**（api-client 12 值 / store 7 值 / workflow-engine 7 值重复） | 历史演化；旧词表的 `pending`/`optimized` 传给后端 PATCH 本就是非法值 | `lib/status-vocabulary.ts` 成为唯一定义：store 直接存规范枚举，hydrate 归一化遗留持久化数据（旧数据无需手工迁移），workflow-engine/tracker/通知/聚合全部收敛 |
| W2 | 详情页状态流程条对 API 状态从不高亮；暗色下已完成步骤是刺眼的浅绿卡 | tracker 的 statusConfig 以旧 7 值词表为键 + 硬编码 light 色板 | statusConfig 补全 12 值规范流水线；状态卡改为语义 token（bg-muted/primary）+ 状态徽章补 dark 变体 |
| W3 | 详情页标题 "Unknown Position/Company"（store 申请自带字段被丢弃） | localApplication 映射漏掉 position/companyName | 补齐映射，JD 查找仅作补充 |
| W4 | `/data` 生产环境 React #418 水合文本不匹配 | status memo 在渲染期同步读 localStorage（数据库大小），SSR 与客户端首帧值不同 | 挂载后（rAF）再计算，首帧渲染稳定的零值占位 |
| W5 | 申请页智能建议/推荐机会卡片在暗色下是亮黄/亮薄荷底 | 硬编码 light 色板无 dark 变体 | 补 dark: 变体对 |
| W6 | 岗位信息流无后端时直接显示原始英文 "Failed to fetch" | 原始 fetch 错误直接透出 | 识别网络类错误并转译为友好双语文案（含可能原因） |
| W7 | 仪表盘「面试」计数与分析页口径不一（1 vs 2） | 各页各自统计 | 统一为"曾进入面试轮"口径（interview/technical/offer/hired） |
| W8 | 简历上传走同源相对路径 `/api/resumes`，后端异主机时上传断 | 未走 envelope baseURL | envelope 客户端新增 `postForm`（multipart 不覆盖 JSON Content-Type），上传走规范化 baseURL |
| W9 | **测量诚实化**：store 申请此前无投递时间戳，进度页"标记投递"只能用 updatedAt 近似 | store 数据模型缺字段 | store 在状态首次进入"已投出"时落 `appliedAt`；hydrate 回填历史记录；进度适配器优先 appliedAt——近似逻辑收敛到 store 一处 |

第一轮记录的「三套词表」「流程条不高亮」两项随第二轮关闭；「透明度页双语」
与「列表接口对脏枚举的韧性」随第三轮关闭（后者）。

## 第三轮（同日：第一公里 + 回归防线 + 数据自愈）

第三轮走查换了一个此前从未验证过的视角：**完全空存储的首次运行**
（此前每轮都注入 onboarding/种子数据，等于从未看过真实新用户的第一屏）。

| # | 问题 | 根因 | 修复 |
|---|------|------|------|
| F1 | **全新用户的角色卡预填了演示人设**（Chen Yu / chenyu@example.com / Northstar Labs） | `createDefaultCandidateRoleCard` 把 README 演示数据当作 store 默认值——用户可能导出/提交自己从未填写过的字段 | 默认值全部置空；演示数据只保留在显式的「填入演示表单」动作里（暂存待审） |
| F2 | store 里残留整套死掉的 onboarding 状态（isOnboarded/currentStep/6 个 action），无任何 UI 消费，历代 e2e 种子都在虔诚地设置它 | onboarding 向导 UI 已删除，store 切片遗留 | 整片移除；首跑引导由仪表盘「开始使用」清单承担 |
| F3 | 前两轮新建的 /progress、/transparency 无任何 e2e 防线（smoke 路由清单都没有它们） | 新功能只带了单测 | smoke 路由补齐两条；新增 progress-page.spec.ts：hero 指标、x/y 原始比率、恢复卡含「暂停休息」选项、**关闭卡片跨刷新持久化**、空态无羞辱文案（数据诚实规则进了 e2e 断言） |
| F4 | 一条非枚举 status 的行让整个 GET /api/applications 500（第一轮实测踩中） | ORM 行物化时 LookupError 波及全列表 | Lite 启动迁移自愈：大小写漂移归一为枚举名，未知值折叠为 SAVED（与前端"不丢记录"兜底一致），每次修复都有日志；附 2 个直接测试 |

## 遗留与边界（截至第三轮）

- ~~透明度页仍为中文单语~~ → 第四轮关闭。
- `mcp_mocks.py` 的 8 个低危「不安全随机数」：mock 数据生成器用 `random`
  生成置信分/耗时，非安全敏感随机数——按现状保留并在此记录，不改坏语义。
- 历史提交中的 BigModel API Key 需要人工轮换（工作树已清理，历史不可逆）。

## 第四轮（同日：核心工作流深走查 + 合规页双语）

第四轮把视觉走查对准了产品头牌功能——简历构建器 → 岗位化简历 → 导出——
它在过去三轮里从未被视觉验证过（桌面或移动）。

| # | 问题 | 根因 | 修复 |
|---|------|------|------|
| R1 | **新画布默认载入一份完整的虚构简历**（字节跳动工作经历、5 年经验、量化指标） | `DEFAULT_RESUME_MARKDOWN` 把演示简历当作默认内容——新用户可以直接保存/导出一份不是自己写的简历 | 默认改为占位脚手架（「你的姓名」等明显槽位）；完整示例移到显式「示例」按钮后，覆盖已有内容前需 confirm |
| R2 | **移动端（390px）构建器不可用**：320px 检测面板把编辑器挤成 ~20px 一条，预览不可见，工具栏按钮一字一行折行 | 单行 flex 布局 + 固定宽度侧栏 + 无换行 | 编辑器/预览/检测在 lg 以下纵向堆叠并各自给可用高度；工具栏 flex-wrap + nowrap 标签；检测面板移动端全宽 |
| R3 | 透明度页中文单语（第二、三轮均记录的遗留项） | 静态页无 locale 感知 | 改造为 locale 感知组件；英文口径逐条对齐 TRANSPARENCY_COMPLIANCE_NOTES.md（Art. 50 披露、PIPL Art. 24 术语），中文文案零改动 |

验证：前端 319 单测 + eslint + 46 页构建；e2e 25/25（smoke 含 /transparency、
进度页 3 用例）；双语截图人工复核。

## 第五轮（同日：最后一英寸——PDF 产出质量 + 时间语义治理）

第五轮走查核心工作流的最终交付物：**导出的 PDF**（此前从未被视觉验证），
方法为拦截 `window.open` 捕获导出点击产生的打印文档 HTML，加载后经
Chromium 打印管线生成真实 PDF（157KB），再以 2x/3x 裁剪逐项审查。

| # | 发现 | 结论 |
|---|------|------|
| P1 | 打印文档质量 | **通过**：精确单页 A4（793.7×1123px）、5 个 mask 图标正常渲染、CJK 字体正常、版式专业。初判的「邮箱被折行」经数值复核（client-rect 计数）与 3x 裁剪证伪——是走查者目测误读，也正因此把「联系链接不得折行」写进了 e2e 断言 |
| P2 | 打印文档零测试覆盖 | 用户最终交付物此前无任何回归防线。新增 `resume-print-doc.spec.ts`：捕获导出文档 HTML，断言 A4 壳 210mm、单页容纳、icon: 标记渲染为图标而非文字残留、mailto 链接单 rect 不折 |
| P3 | `datetime.utcnow()` 弃用（全库 ~2,425 警告/轮） | 新建 `app/core/clock.py::utcnow()`（naive-UTC 语义保持：`now(timezone.utc).replace(tzinfo=None)`——本项目全部存储与比较都是 naive UTC，直接换 aware 版会在比较处爆 TypeError），117 处 app 调用点与测试全量收敛；警告 **2425 → 4**（余量为 python-multipart/Starlette 第三方噪音） |
| P4 | 落地 P3 时的架构发现 | `app/__init__.py` 在包导入时即调用 `get_settings()` 缓存配置——conftest 必须在任何 `app.*` 导入之前设置 DATABASE_URL，否则引擎按 postgres+asyncpg 创建导致收集失败（被 clock import 的插入位置踩中一次）。顺序规则已注释在踩点处 |

验证：后端 434 全绿（ruff/black 全净）、前端 319 + eslint、e2e 46/46
（含新打印文档 spec）；生产构建复跑通过。



## 发现并当轮修复的问题

| # | 问题 | 视觉表现 | 根因 | 修复 |
|---|------|----------|------|------|
| V1 | **进度页永远空** | 后端有 12 条申请，进度页显示「暂时取不到进度数据」 | envelope 客户端 baseURL 丢 `/api` 前缀：请求打到 `http://localhost:8000/applications/`（404）。合并四个 api-client 时引入；e2e 因 localStorage 种子回退而全绿 | `resolveEnvelopeBaseURL`：base 强制以 `/api` 结尾（api-client.ts） |
| V2 | **进度页数据源接错** | 修好 V1 后进度页显示 API 数据，但「申请」页显示 0——UI 创建的申请只写 store，进度页永远看不到 | 进度页读 `applicationAPI.list()`，而产品主模式（本地优先）全部页面读 store；恢复卡的交互状态也以 store ID 为键 | 进度页重接 `useAppStore().applications`，经 `storeApplicationToProgress` 适配器（状态映射 + 时间戳近似沿用模型文档化降级） |
| V3 | **详情页对 API 申请整页崩溃** | `/applications/detail?id=<uuid>` 白屏进错误边界 | `statusConfig` 只覆盖 7 个旧 store 状态，`statusConfig["screening"]` 为 undefined → 读 `.color` 抛 TypeError；8 个枚举值必崩 | 补全 12 值枚举映射 + `statusConfigFor` 防御性访问器（未知值回退，不再崩） |
| V4 | **分析页违背数据诚实规则** | 空数据时三个比率卡显示「0%」 | 旧页面先于 DESIGN_ETHICS 规则存在，本轮未对齐 | 分母为零渲染「暂无数据」；「面试成功率」更名「面试转化」与进度页中性口径一致 |
| V5 | **新功能只有中文** | en-US 下进度页/恢复卡仍是中文 | 新页面硬编码中文文案 | 进度页、恢复卡、四个 progress 组件、状态标签全部双语（沿用 analytics 页内联双语惯例；英文口径取自 DESIGN_ETHICS 文案表的英文释义） |
| V6 | **WebSocket connection_id 碰撞** | 后端全量测试偶现 `test_multiple_connections_same_user` 失败 | `datetime.utcnow().timestamp()` 在 Windows 时钟粒度（~15.6ms）内两次连接同 ID，第二个连接静默覆盖第一个——生产里快速开两个标签页会丢通知通道 | `connection_id = f"{user_id}_{uuid4().hex}"` |

## 走查确认正常的部分

- 进度页（store 数据）：环形指标、周柱状图、单色状态分布、x/y 原始计数、恢复卡
  微流程，中英双语、桌面/移动双宽度渲染全部符合 DESIGN_ETHICS 文案规范。
- 透明度页：数据存储位置、离开本机时机、AI 功能清单（AI/本地徽章）、用户权利、
  填表助手承诺，结构完整。
- 24 条路由 × 2 宽度全部 200，除上述问题外无意外 console 错误。

## 记录在案、暂不动工的发现

| 发现 | 说明 | 建议 |
|------|------|------|
| 三套状态词表并存 | `api-client`（12 值真实枚举）、`store`（7 值内联联合）、`workflow-engine`（7 值重复定义） | 长期应收敛到 api-client 单一定义；牵涉面大，需专项 |
| 详情页状态流程条对 API 状态不高亮 | tracker 的 `statusConfig` 以 workflow-engine 的 7 值为键，`saved` 等真实枚举值无 order → 无当前步 | 与词表收敛一并处理；顶部徽章已正确显示状态 |
| 一条脏枚举值炸整个列表接口 | `applications` 表状态列以 ORM 枚举名存储，直接 SQL 写入小写值会让 `GET /api/applications` 500（本次注入种子时实测触发） | 列表接口可考虑对非法枚举行跳过/兜底；本地优先产品导入/迁移路径需警惕 |
| 透明度页仅有中文 | 长文档性质，双语工作量较大 | 后续专项（法律/合规文案需逐条复核后翻译） |

## 测试影响面

- `progress-model.test.ts` 21 → 28（新增适配器映射、时间戳透传、降级与分布可见性用例）。
- 回归验证命令见 README（tsc / eslint / vitest / next build / 后端 pytest / e2e）。
