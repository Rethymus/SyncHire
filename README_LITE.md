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
- Node.js 22+ (前端)
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
# 后端依赖
cd api
pip install -r requirements_lite.txt

# 前端依赖
cd ../frontend
npm install
```

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
# 终端1：启动后端
cd api
python main_lite.py

# 终端2：启动前端
cd frontend
npm run dev
```

### 6. 访问应用

打开浏览器访问：http://localhost:3000

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
- 📊 **申请跟踪** - 管理求职申请状态
- 🔍 **智能搜索** - 全文搜索、语义搜索
- 🤖 **AI优化** - 简历AI优化、职位解析
- 📈 **匹配分析** - 简历与职位匹配度评分

### 数据管理

- 💾 **本地存储** - 100%本地数据存储
- 📤 **数据导出** - JSON/CSV格式导出
- 📥 **数据导入** - 从JSON导入数据
- 🔄 **数据备份** - 自动备份功能

### 扩展系统（未来）

- ☁️ **云端备份** - 可选的云备份扩展
- 🔗 **平台集成** - LinkedIn、Indeed等集成
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
```

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
- 示例: `/examples` 文件夹

## 🎉 开始使用

```bash
# 1. 安装依赖
pip install -r requirements_lite.txt

# 2. 配置环境
cp .env.example .env.lite
# 编辑 .env.lite 添加API密钥

# 3. 运行设置
python scripts/setup_lite.py

# 4. 启动应用
python main_lite.py
```

**准备好体验本地优先的求职助手了吗？** 🚀

---

**SyncHire Lite: 您的AI驱动求职助手，完全本地运行** 💼
