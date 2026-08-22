# SyncHire Lite - Local-First Job Application Tool

**轻量级本地优先的求职申请助手，保护您的隐私，节省系统资源。**

## 🎯 项目概述

SyncHire Lite 是从云平台转型为**本地优先工具**的轻量级版本，专注于：

- ✅ **隐私保护** - 所有数据存储在本地，不上传云端
- ✅ **资源高效** - 内存占用减少80-90%，启动速度提升5倍
- ✅ **零配置** - 无需Docker/PostgreSQL/Redis，开箱即用
- ✅ **AI赋能** - 保留所有AI功能（简历优化、职位解析、智能匹配）

## 📋 系统要求

- Python 3.11+
- Node.js 22+ 和 npm 10+（前端，npm workspaces）
- 无需数据库安装（使用SQLite）
- 无需Docker
- 无需Redis

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Rethymus/synchire.git
cd synchire
```

### 2. 安装依赖

```bash
# 前端依赖：必须在仓库根目录执行（npm workspaces：frontend + mcp-servers）
npm install

# 后端依赖
pip install -r api/requirements_lite.txt
```

> **Windows 用户**：Tailwind oxide 原生二进制已通过根目录 `package.json` 的
> `optionalDependencies` 自动安装，无需手工处理（曾经的全站 Build Error
> 问题已修复）。

### 3. 配置环境

```bash
cd api
cp .env.example .env.lite

# 编辑 .env.lite，添加您的AI API密钥
nano .env.lite
```

**必需配置**：
```bash
# AI API密钥（至少配置一个）
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. 运行设置脚本

```bash
cd api
python ../scripts/setup_lite.py
```

设置脚本会自动：
- ✅ 创建必要的数据目录
- ✅ 初始化SQLite数据库
- ✅ 创建默认用户配置
- ✅ 验证环境配置

### 5. 启动应用

```bash
# 终端1：启动后端（http://localhost:8000）
cd api
python main_lite.py

# 终端2：启动前端（http://localhost:3000）
cd frontend
npm run dev
```

### 6. 访问应用

打开浏览器访问：http://localhost:3000

路由不带 locale 前缀（如 `/dashboard`）。界面语言通过导航栏的
EN/中文 按钮切换，选择持久化在 `localStorage`；旧的 `/zh/*`
路由已移除。

## 📂 数据存储

所有数据存储在本地：

```
~/.synchire/
├── synchire.db              # SQLite数据库
├── files/                   # 上传的文件（简历、职位描述）
├── backups/                 # 数据备份
└── exports/                 # 导出数据
```

## 🔧 功能特性

### 核心功能

- 📄 **简历管理** - 创建、编辑、优化简历
- 📋 **职位描述** - 解析、存储、搜索职位
- 📊 **申请跟踪** - 管理求职申请状态；申请列表页支持
  就地创建对话框（点击时按需加载，无需跳转）
- 🔍 **智能搜索** - 全文搜索、语义搜索
- 🤖 **AI优化** - 简历AI优化、职位解析
- 📈 **匹配分析** - 简历与职位匹配度评分

### 界面与体验

- 🌗 **暗色模式** - 跟随系统 + 手动切换（next-themes），
  桌面导航栏与移动端顶栏均提供切换入口
- 📱 **移动端适配** - 汉堡菜单 + 侧滑抽屉导航
- 🛡️ **稳定性** - 路由级错误边界（保留全局导航、支持重试/返回）
  与路由骨架屏加载态
- 📲 **PWA 可安装** - 提供 manifest 与 service worker；
  service worker 仅缓存不可变静态资源（内容寻址的 `/_next/static`），
  且只在生产环境自动注册（开发服务器与 Electron/Tauri 壳跳过）
- ⚡ **路由级代码切分** - 对话框与日历变体按需加载，
  dashboard 首载 chunk 较改版前约 -33%

### 岗位信息流（从源头采集）

- 🛰️ **ATS 数据源订阅** - 订阅企业官方招聘页，岗位直接从
  Greenhouse / Lever / Ashby / SmartRecruiters 的公开 API 同步
  （粘贴招聘页链接自动识别 ATS，如 `job-boards.greenhouse.io/stripe`）
- 📡 **招聘雷达（国内官网导航）** - 内置 80+ 家企业招聘官网目录
  （37 家实测验证，支持从 Campus2026/2027 开源仓库一键导入公司+
  信号+日期）；粘贴公众号推文标题或链接，检测到「XX 2027届秋招
  启动」类信号即把对应企业置顶并标注批次与日期（标题级关键词
  检测，不存储文章内容）；支持手动添加企业、手动/清除信号
- 📻 **自动信号源（RSS）** - 接 WeWe RSS / wechat2rss 等公众号
  RSS 桥接，企业号推文标题自动命中雷达（每 12 小时后台同步，
  也可手动触发）；RSS 2.0 / Atom 均支持
- 🗂️ **ATS 目录订阅** - 内置 15,000+ 海外公司看板目录
  （Greenhouse/Lever/Ashby），关键词搜索一键订阅进岗位信息流
- 🔄 **定时同步** - 启动后自动同步一次，之后每 12 小时
  （`JOB_SOURCE_SYNC_INTERVAL_HOURS` 可调）；`(source, external_id)` 去重
- 📊 **本地匹配打分** - 新岗位入库时自动按最近更新的简历做确定性
  词汇匹配打分（零 AI 成本），信息流按「最新/最匹配」排序，展示命中技能
- 🖥️ **求职浏览器（Electron）** - 内置 `<webview>` 浏览器 + 填表助手侧栏：
  检测网申表单字段（中英文双语映射）、按本地档案预填建议值、
  支持文本/下拉/多选/单选/复选框（React 受控组件兼容），
  自定义控件标记需人工，**引擎绝不自动提交表单**；
  登录态持久化（`persist:synchire-jobs` 分区）。
  开发时需先在仓库根执行 `npm run build:fill-engine`
  生成注入脚本

### 数据管理

- 💾 **本地存储** - 100%本地数据存储
- 📤 **数据导出** - JSON/CSV格式导出
- 📥 **数据导入** - 从JSON导入数据
- 🔄 **数据备份** - 自动备份功能

### 扩展系统（未来）

- ☁️ **云端备份** - 可选的云备份扩展
- 🔗 **平台集成** - 国内 ATS（Moka / 北森 / 大易 / 飞书招聘）适配器预留
- 📊 **高级分析** - 增强的分析功能

## 📚 文档

详细文档：

- **[LITE_ARCHITECTURE.md](LITE_ARCHITECTURE.md)** - 架构设计详解
- **[LITE_MIGRATION_GUIDE.md](LITE_MIGRATION_GUIDE.md)** - 从云版本迁移指南
- **[LITE_IMPLEMENTATION_PROGRESS.md](LITE_IMPLEMENTATION_PROGRESS.md)** - 实施进度报告

## 🔒 隐私与安全

### 数据隐私

- ✅ **100%本地存储** - 无数据上传到云服务器
- ✅ **直接文件访问** - 您的文件，您完全控制
- ✅ **无用户跟踪** - 无遥测、无分析
- ✅ **无认证系统** - 无密码、无令牌风险

### AI API隐私

使用AI功能时：
- 简历内容发送到OpenAI/Anthropic进行处理
- 职位描述内容发送给AI进行解析
- 请查看AI服务提供商的隐私政策
- 未来版本可能支持本地AI模型（Ollama）

## 📊 资源对比

| 指标 | 云版本 | 轻量版 | 改善 |
|------|--------|--------|------|
| **内存使用** | ~2GB | ~200-400MB | 减少80-90% |
| **磁盘占用** | ~1.5GB | ~300MB | 减少80% |
| **启动时间** | 30-60秒 | 5-10秒 | 减少80-85% |
| **依赖包** | ~50个 | ~20个 | 减少60% |
| **服务进程** | 5+ | 2 | 减少60% |

## 🛠️ 开发

### 运行测试

```bash
# 后端测试
cd api
pytest tests/

# 前端测试
cd frontend
npm test

# e2e smoke（需先启动 lite 后端 :8000 与前端 dev server）
cd frontend
npx playwright test e2e/smoke.spec.ts
```

### CI 质量防线

`.github/workflows/ci.yml` 在每次 push/PR 时运行：

- **前端** - lint / type-check / 单元测试 / 生产构建
- **e2e smoke** - 16 个路由逐页校验（HTTP < 400、全局导航保持挂载、
  零意外 console 错误，已知开发模式噪音按文档过滤）+ 导航可达性，
  默认门禁 38 用例通过（另 4 个用例按需跳过：2 截图 + 2 全栈）；
  CI 会自动安装依赖并拉起 lite 后端再跑测试
- **后端** - pytest 421 个用例（26 个测试文件，SQLite+mock 全离线）+ black/ruff
- **安全** - Bandit、pip-audit

本地跑 e2e 前若遇 :3000/:8000 被"监听但不响应"的残留 webServer 占用，
可用端口守卫变体 `npm run test:e2e:guarded --workspace=frontend`：
preflight 会检测僵尸进程并给出 PID 清理指引，非零退出码阻断测试。

### 代码结构提示（贡献者）

- settings 页已按标签域拆分为
  `frontend/src/app/settings/_components/` 下的独立面板
  （AI 供应商、能力开关、发现等）
- 前端请求层收敛为单一模块 `frontend/src/lib/api-client.ts`，
  含两种请求语义：信封式 `apiClient`（返回统一信封）与
  直返式 `unifiedClient`（直接返回数据体）

### 构建生产版本

```bash
# 前端生产构建
cd frontend
npm run build

# 后端（无需构建）
cd api
python main_lite.py
```

## 🤝 贡献

欢迎贡献！请查看贡献指南：

1. 保持本地优先理念
2. 不添加云依赖
3. 维护简洁性
4. 更新文档

## 📝 许可证

与原SyncHire项目相同。

## 🆘 支持

遇到问题？

- GitHub Issues: https://github.com/Rethymus/synchire/issues
- 文档: `/docs` 文件夹

## 🎉 开始使用

```bash
# 1. 安装依赖（在仓库根目录）
npm install
pip install -r api/requirements_lite.txt

# 2. 配置环境
cd api
cp .env.example .env.lite
# 编辑 .env.lite 添加API密钥

# 3. 运行设置
python ../scripts/setup_lite.py

# 4. 启动应用
python main_lite.py              # 后端 :8000
# 另开终端：cd frontend && npm run dev   # 前端 :3000
```

**准备好体验本地优先的求职助手了吗？** 🚀

---

**SyncHire Lite: 您的AI驱动求职助手，完全本地运行** 💼
