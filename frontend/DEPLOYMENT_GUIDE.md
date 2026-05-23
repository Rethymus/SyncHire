# SyncHire (知遇) - 部署指南

**更新时间**: 2026-05-22
**项目状态**: 🟢 A+ 生产就绪

---

## 🚀 部署方式

### 方式1: Vercel部署（推荐）

#### 前置要求
- Vercel账号
- Git仓库

#### 步骤

1. **安装Vercel CLI**
```bash
npm install -g vercel
```

2. **登录Vercel**
```bash
vercel login
```

3. **部署项目**
```bash
cd /home/re/code/SyncHire/frontend
vercel deploy
```

4. **配置环境变量**
在Vercel控制台设置：
```
NEXT_PUBLIC_API_URL=https://api.synchire.com
```

5. **配置自定义域名（可选）**
在Vercel控制台添加域名并配置DNS

#### 更新部署
```bash
vercel --prod
```

---

### 方式2: Docker部署

#### 前置要求
- Docker 20.10+
- Docker Compose 2.0+

#### 步骤

1. **构建镜像**
```bash
cd /home/re/code/SyncHire/frontend
docker build -t synchire-frontend .
```

2. **使用Docker Compose**
```bash
docker-compose up -d
```

3. **访问应用**
```
http://localhost:3000
```

#### 停止服务
```bash
docker-compose down
```

---

### 方式3: 自托管部署

#### 前置要求
- Node.js 20+
- npm 或 yarn

#### 步骤

1. **安装依赖**
```bash
npm install
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑.env文件
```

3. **构建应用**
```bash
npm run build
```

4. **启动生产服务器**
```bash
npm start
# 或使用PM2
pm2 start npm --name "synchire" -- start
```

5. **配置反向代理（可选）**

**Nginx配置示例**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔧 环境变量配置

### 必填环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `NEXT_PUBLIC_API_URL` | API基础URL | `https://api.synchire.com` |

### 可选环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `BIGMODEL_API_KEY` | BigModel API密钥 | `your_key` |
| `OPENAI_API_BASE` | OpenAI API基础URL | `https://open.bigmodel.cn/api/paas/v4/` |

---

## 📋 部署前检查清单

### 代码检查
- [x] TypeScript编译通过
- [x] ESLint检查通过
- [x] 生产构建成功
- [x] 环境变量配置正确

### 功能检查
- [x] 所有路由可访问
- [x] 错误处理完整
- [x] SEO文件存在
- [x] 性能优化完成

### 安全检查
- [x] XSS防护实施
- [x] 环境变量管理
- [x] 敏感数据保护
- [x] 依赖无已知高危漏洞

---

## 🔄 CI/CD配置

### GitHub Actions

项目包含 `.github/workflows/ci.yml`，自动执行：

1. **Lint检查** - 代码风格检查
2. **类型检查** - TypeScript类型验证
3. **构建测试** - 生产构建验证

### 触发条件

- Push到main/develop分支
- Pull Request创建/更新

---

## 📊 部署后验证

### 功能验证

```bash
# 检查所有路由
curl https://your-domain.com/
curl https://your-domain.com/signup
curl https://your-domain.com/login
curl https://your-domain.com/dashboard
```

### SEO验证

```bash
curl https://your-domain.com/sitemap.xml
curl https://your-domain.com/robots.txt
```

### 性能验证

- [ ] 使用Lighthouse检查Core Web Vitals
- [ ] 验证FCP < 1.8s
- [ ] 验证LCP < 2.5s
- [ ] 验证CLS < 0.1

---

## 🆘 故障排除

### 常见问题

**1. 构建失败 - 内存不足**
```bash
# 增加Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

**2. 字体加载失败**
- 检查网络连接
- 验证next.config.js配置

**3. API请求失败**
- 检查NEXT_PUBLIC_API_URL配置
- 验证CORS设置

**4. 页面404**
- 检查路由配置
- 验证next.config.js

---

## 📞 技术支持

如遇到部署问题，请查看：

1. [Next.js部署文档](https://nextjs.org/docs/deployment)
2. [Vercel部署指南](https://vercel.com/docs/deployments/overview)
3. 项目Issues: [GitHub Issues](https://github.com/your-org/synchire/issues)

---

**部署状态**: 🟢 就绪
**推荐方式**: Vercel
**最后更新**: 2026-05-22
