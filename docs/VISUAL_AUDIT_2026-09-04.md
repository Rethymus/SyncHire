# 视觉走查审计（2026-09-04）

> 方法：`next dev` + Lite 后端（`main_lite.py`）真实起服，向 SQLite 注入跨 5 周、
> 全状态分布的申请数据，Playwright 以桌面（1440）与移动（390）双宽度逐页截图，
> 收集控制台错误与网络失败，再逐页人工/视觉审查。目的是抓**纯代码评审看不到的
> 问题**：集成断裂、渲染崩溃、数据源矛盾、文案原则不一致。
> 截图与脚本：`tmp/walkthrough/`、`tmp/seed_visual.py`（开发辅助，不入库的可选保留）。

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
