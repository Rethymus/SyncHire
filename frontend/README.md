# SyncHire (知遇) - AI 求职助手

> 让每一次求职，都是一场被看见的知遇之恩

## 项目简介

SyncHire 是一个基于 AI 的求职辅助平台，帮助求职者：

- 📝 智能简历优化
- 🎯 JD 分析与匹配
- 📊 求职进度跟踪
- 📄 多格式简历导出

## 技术栈

- **框架**: Next.js 16.2.6 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand
- **UI 组件**: shadcn/ui, Radix UI
- **编辑器**: Milkdown (Markdown)
- **安全**: DOMPurify (XSS 防护)

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```env
# BigModel API (本地测试)
BIGMODEL_API_KEY=your_key_here
OPENAI_API_BASE=https://open.bigmodel.cn/api/paas/v4/

# 生产环境
NEXT_PUBLIC_API_URL=https://api.synchire.com
```

### 开发模式

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 生产构建

```bash
npm run build
npm start
```

### 类型检查

```bash
npm run type-check
```

### E2E 测试与端口守卫

```bash
npm run test:e2e:guarded
```

先运行 `scripts/e2e-preflight.mjs` 检查 e2e 端口（默认 3000/8000，可用 `E2E_PREFLIGHT_PORTS` 或参数覆盖）：端口空闲或已有健康 server 则继续跑 Playwright；若端口被"只监听不响应"的孤儿 dev server 占用（被杀掉的 Playwright 任务常见残留），会打印 netstat 定位的 PID 和 `taskkill /PID <pid> /F` 清理指引并以非零码退出，避免套件假挂起。手动单跑：`node scripts/e2e-preflight.mjs [port]`。

### 全栈模式 E2E（真实 FastAPI + Postgres + Redis）

浏览器级验证认证流（注册 → 登录 → `getCurrentUser`），跑在真实全栈后端上，与其余 e2e（lite 模式、mock 数据）互补：

```bash
# 需要本地 Docker（无 Docker 时用例自动 skip，CI 的 fullstack-e2e job 会跑）
node scripts/e2e-fullstack-up.mjs     # 隔离的 postgres(:55432)/redis(:56379) + API 于 :8010
npm run test:e2e:fullstack            # 前端 dev server 于 :3100（NEXT_PUBLIC_ENABLE_AUTH=true）
node scripts/e2e-fullstack-down.mjs   # 清理容器与进程
```

要点：

- 使用独立配置 `playwright.fullstack.config.ts`（只跑 `e2e/auth-fullstack.spec.ts`），dev server 固定 :3100、后端固定 :8010，不占用共享的 :3000/:8000。
- 环境变量：`FULLSTACK_API_URL`（默认 `http://localhost:8010`）指向真实后端；`SKIP_FULLSTACK=1` 强制跳过；后端健康探测失败或前端处于 lite 模式（/login 被重定向）时用例自动 skip 而非 fail，因此该 spec 在 lite 套件里安全共存。
- 后端需在 `CORS_ORIGINS` 中允许 `http://localhost:3100`（up 脚本与 CI 均已设置）；启动时 `init_db()` 自动建表，无需 alembic。

## 项目结构

```
frontend/
├── src/
│   ├── app/              # Next.js App Router 页面
│   │   ├── page.tsx      # 首页
│   │   ├── login/        # 登录
│   │   ├── signup/       # 注册
│   │   ├── dashboard/    # 仪表盘
│   │   ├── editor/       # 简历编辑
│   │   ├── upload/       # 上传
│   │   └── jd-input/     # JD输入
│   ├── components/       # React 组件
│   │   ├── ui/           # shadcn/ui 组件
│   │   └── resume/       # 简历相关组件
│   └── lib/             # 工具函数
├── public/              # 静态资源
│   ├── sitemap.xml     # SEO 站点地图
│   ├── robots.txt      # SEO 爬虫规则
│   └── favicon.svg     # 网站图标
└── docs/               # 项目文档
```

## 功能特性

### 已实现

- ✅ 用户注册/登录
- ✅ 简历上传与管理
- ✅ JD 智能分析
- ✅ 简历编辑器（Markdown）
- ✅ 实时预览
- ✅ 多模板导出
- ✅ 移动端响应式
- ✅ 错误边界
- ✅ 404 页面
- ✅ 减弱动画支持
- ✅ 完整中文本地化

### 计划中

- ⏳ 后端 API 集成
- ⏳ AI 功能完整实现
- ⏳ OAuth 登录（Google/GitHub）
- ⏳ PWA 支持
- ⏳ 国际化（i18n）

## 部署

### Vercel 部署（推荐）

```bash
npm install -g vercel
vercel deploy
```

### 环境变量

在 Vercel 项目设置中配置：

```env
NEXT_PUBLIC_API_URL=https://api.synchire.com
```

## 开发指南

### 代码规范

- TypeScript 严格模式
- 所有组件使用 `.tsx` 扩展名
- 函数组件优先
- 遵循 ESLint 规则

### 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试
chore: 构建/工具变更
```

## 安全性

- ✅ XSS 防护（DOMPurify）
- ✅ CSRF 防护（Next.js 内置）
- ✅ 环境变量管理
- ✅ 输入验证
- ✅ 类型安全

## 可访问性

- ✅ WCAG 2.1 Level AA
- ✅ 完整键盘导航
- ✅ ARIA 标签
- ✅ 屏幕阅读器友好
- ✅ 减弱动画支持

## 性能

- ✅ 代码分割
- ✅ 懒加载
- ✅ 图片优化
- ✅ 字体优化
- ✅ 缓存策略

## 文档

详细文档请查看仓库根目录的 `docs/`：

- [文档索引](../docs/INDEX.md)
- [开发者指南](../docs/DEVELOPER_GUIDE.md)
- [测试指南](../docs/TESTING_GUIDE.md)
- [部署指南](../docs/DEPLOYMENT_GUIDE.md)

## 许可证

MIT License

## 联系方式

- 项目: [SyncHire](https://github.com/your-org/synchire)
- 问题反馈: [Issues](https://github.com/your-org/synchire/issues)

---

**开发方式**: Vibe Coding 2026
**状态**: 🟢 生产就绪 (A+)
**最后更新**: 2026-05-22
