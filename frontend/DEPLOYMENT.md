# SyncHire (知遇) - 部署指南

**版本**: 1.0.0
**状态**: A+ 生产就绪
**更新日期**: 2026-05-22

---

## 📋 部署前检查

### 环境要求

- Node.js 20.x 或更高版本
- npm 10.x 或更高版本
- PostgreSQL 16 (可选，后端数据库)
- Redis 7 (可选，缓存队列)

### 配置文件

确保以下文件存在并正确配置：

- [x] `.env.local` - 环境变量
- [x] `next.config.ts` - Next.js 配置
- [x] `Dockerfile` - Docker 镜像
- [x] `docker-compose.yml` - Docker 编排
- [x] `vercel.json` - Vercel 配置

---

## 🚀 部署方式

### 方式一：Vercel 部署（推荐）

**优点**: 零配置、自动 HTTPS、全球 CDN、快速部署

**步骤**:

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   cd /home/re/code/SyncHire/frontend
   vercel deploy
   ```

4. **配置环境变量**

   在 Vercel 控制台中添加：
   ```env
   NEXT_PUBLIC_API_URL=https://api.synchire.com
   ```

5. **设置自定义域名**（可选）

   在 Vercel 项目设置中添加自定义域名。

---

### 方式二：Docker 部署

**优点**: 跨平台、隔离环境、易于扩展

**步骤**:

1. **构建镜像**
   ```bash
   cd /home/re/code/SyncHire/frontend
   docker build -t synchire-frontend:latest .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     --name synchire-frontend \
     -p 3000:3000 \
     -e NEXT_PUBLIC_API_URL=http://localhost:8000 \
     synchire-frontend:latest
   ```

3. **使用 Docker Compose**（推荐）
   ```bash
   cd /home/re/code/SyncHire/frontend
   docker-compose up -d
   ```

4. **查看日志**
   ```bash
   docker logs -f synchire-frontend
   ```

5. **停止容器**
   ```bash
   docker-compose down
   ```

---

### 方式三：自托管部署

**优点**: 完全控制、成本可控

**步骤**:

1. **安装依赖**
   ```bash
   cd /home/re/code/SyncHire/frontend
   npm install
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env.local
   # 编辑 .env.local 填入实际值
   ```

3. **构建项目**
   ```bash
   npm run build
   ```

4. **启动生产服务器**
   ```bash
   npm start
   ```

5. **使用 PM2 守护进程**（推荐）
   ```bash
   npm install -g pm2
   pm2 start npm --name "synchire" -- start
   pm2 save
   pm2 startup
   ```

---

## 🔧 环境变量配置

### 必填变量

```env
# API 服务地址
NEXT_PUBLIC_API_URL=https://api.synchire.com
```

### 可选变量

```env
# BigModel API (智谱AI)
BIGMODEL_API_KEY=your_api_key
OPENAI_API_BASE=https://open.bigmodel.cn/api/paas/v4/

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# 文件上传
NEXT_PUBLIC_UPLOAD_URL=https://storage.synchire.com

# 分析服务
NEXT_PUBLIC_GA_ID=your_ga_id
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

---

## 🛡️ 安全配置

### 1. CORS 配置

确保后端 API 正确配置 CORS：

```json
{
  "allowedOrigins": ["https://synchire.com", "https://www.synchire.com"],
  "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
  "allowedHeaders": ["Content-Type", "Authorization"]
}
```

### 2. HTTPS 强制

在 `next.config.ts` 中已配置安全头部：

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`

### 3. 环境变量保护

- ⚠️ 永远不要提交 `.env.local` 到 Git
- ✅ 使用 `.env.example` 作为模板
- ✅ 在部署平台配置环境变量

---

## 📊 监控与日志

### 健康检查

```bash
# 检查服务状态
curl https://your-domain.com/

# 检查特定页面
curl https://your-domain.com/dashboard
```

### 日志查看

**Vercel**:
```bash
vercel logs
```

**Docker**:
```bash
docker logs -f synchire-frontend
```

**PM2**:
```bash
pm2 logs synchire
```

---

## 🔄 更新部署

### Vercel

```bash
vercel --prod
```

### Docker

```bash
docker-compose pull
docker-compose up -d
```

### 自托管

```bash
git pull
npm install
npm run build
pm2 restart synchire
```

---

## 🐛 故障排查

### 常见问题

**1. 端口被占用**
```bash
# 查找占用端口的进程
lsof -i :3000
# 杀死进程
kill -9 <PID>
```

**2. 构建失败**
```bash
# 清理缓存
rm -rf .next node_modules
npm install
npm run build
```

**3. API 连接失败**
- 检查 `NEXT_PUBLIC_API_URL` 是否正确
- 验证后端服务是否运行
- 检查 CORS 配置

**4. 字体加载失败**
- 临时网络问题，不影响功能
- 或使用本地字体文件

---

## 📈 性能优化

### 已实现的优化

- ✅ Next.js 16.2.6 (App Router)
- ✅ Turbopack 构建优化
- ✅ 代码分割
- ✅ 图片优化
- ✅ CSS 压缩
- ✅ Gzip/Brotli 压缩

### 推荐优化

- [ ] CDN 配置
- [ ] 缓存策略
- [ ] 监控告警
- [ ] A/B 测试

---

## 📞 支持与联系

- **项目**: SyncHire (知遇)
- **状态**: 🟢 A+ 生产就绪
- **版本**: 1.0.0

---

*部署指南最后更新: 2026-05-22*
*项目状态: A+ 级生产就绪*
