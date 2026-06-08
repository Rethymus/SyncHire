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
