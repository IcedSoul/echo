# Wavecho（回声）

**基于大模型的矛盾复盘与沟通辅助应用**

一个帮助用户在亲密关系、社交关系中复盘冲突对话、分析情绪需求、提供温和沟通建议的 AI 应用。

---

## 📋 项目概述

- **产品定位**：日常沟通的"冷静剂"和"翻译官"
- **核心功能**：粘贴聊天记录 → AI 分析矛盾 → 获得客观建议
- **技术栈**：
  - 前端：React Native 0.81 + Expo 54 + React 19 + TypeScript
  - 后端：Python FastAPI + MongoDB
  - LLM：OpenAI GPT-4 Turbo（或兼容 API）

---

## 🚀 快速开始

### 前置要求

- **Node.js** ≥ 18.0
- **Python** ≥ 3.11
- **uv**（Python 包管理器）：[安装指南](https://github.com/astral-sh/uv)
- **Docker** 和 **Docker Compose**

### 1. 克隆项目

```bash
git clone <repository-url>
cd echo
```

### 2. 安装依赖

```bash
# 安装 npm 依赖（用于命令管理）
npm install

# 安装后端 Python 依赖
npm run backend:install

# 安装前端依赖
npm run frontend:install

# 一键安装所有依赖
npm run install:all
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cd backend
cp .env.example .env

# 编辑 .env 文件，填入必要的配置：
# - JWT_SECRET（随机字符串，至少 32 字符）
# - OPENAI_API_KEY（如果需要测试真实 LLM）
# - ENCRYPTION_KEY（随机字符串，至少 32 字符）
```

### 4. 启动开发环境

```bash
# 返回项目根目录
cd ..

# 一键启动数据库 + 后端（推荐）
npm run dev

# 或分步启动：
# 1. 启动 MongoDB
npm run db:start

# 2. 启动后端
npm run backend:dev
```

### 5. 启动前端应用（可选）

```bash
# 启动 Expo 开发服务器
npm run frontend:dev

# 或在前端目录
cd frontend
npm start
```

然后：
- 在手机上安装 **Expo Go** 应用
- 扫描终端显示的二维码
- 或按 `i`（iOS 模拟器）/ `a`（Android 模拟器）

### 6. 访问文档

服务启动后，访问：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **健康检查**: http://localhost:8000/health
- **前端应用**: Expo Go 扫码

---

## 📦 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动数据库和后端 |
| `npm run db:start` | 启动 MongoDB 容器 |
| `npm run db:stop` | 停止 MongoDB 容器 |
| `npm run db:reset` | 重置数据库（删除所有数据） |
| `npm run db:logs` | 查看数据库日志 |
| `npm run backend:dev` | 启动后端开发服务器 |
| `npm run backend:test` | 运行后端测试 |
| `npm run frontend:dev` | 启动前端 Expo 开发服务器 |
| `npm run frontend:install` | 安装前端依赖 |
| `npm run docs` | 显示 API 文档地址 |

---

## 🗂️ 项目结构

```
echo/
├── backend/                    # 后端 FastAPI 应用
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/        # API 路由
│   │   │       ├── auth.py    # 认证接口
│   │   │       └── analyze.py # 分析接口
│   │   ├── core/              # 核心配置
│   │   │   ├── config.py      # 环境配置
│   │   │   └── security.py    # JWT & 加密
│   │   ├── db/
│   │   │   └── mongodb.py     # 数据库连接
│   │   ├── models/            # 数据模型
│   │   │   ├── user.py
│   │   │   └── analysis.py
│   │   ├── services/          # 业务逻辑（Phase 2+）
│   │   ├── prompts/           # LLM Prompt 模板（Phase 2+）
│   │   └── main.py            # 应用入口
│   ├── tests/                 # 测试文件
│   ├── pyproject.toml         # Python 依赖配置
│   └── .env                   # 环境变量（不提交到 Git）
├── frontend/                  # 前端 React Native 应用（Phase 3）
├── doc/
│   └── design-doc.md          # 详细设计文档
├── docker-compose.yml         # Docker Compose 配置
├── package.json               # npm 命令管理
└── README.md                  # 本文件
```

---

## 🧪 测试 API

### 1. 发送验证码

```bash
curl -X POST http://localhost:8000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

查看终端输出的 6 位验证码。

### 2. 验证登录

```bash
curl -X POST http://localhost:8000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

返回 JWT token。

### 3. 分析矛盾（Mock 版本）

```bash
curl -X POST http://localhost:8000/api/analyze-conflict \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_text": "昨天因为项链的事吵架了，我有点着急催她快点，她觉得我不耐烦。",
    "context_description": "因为赶时间出门",
    "user_id": "test-user-123"
  }'
```

返回结构化的分析结果（当前为 Mock 数据）。

---

## 📖 开发阶段

- ✅ **Phase 1**：后端基础搭建 + Mock API
- ✅ **Phase 2**：接入真实 LLM + 安全模块
- ✅ **Phase 3**：前端 React Native 实现
- ✅ **Phase 4**：联调与用户持久化 + 历史记录
- ⏳ **Phase 5**（下一步）：测试与打磨

详细开发计划见：[design-doc.md](./doc/design-doc.md)

### Phase 完成文档
- [Phase 2 完成总结](./doc/PHASE2_COMPLETED.md)
- [Phase 3 完成总结](./doc/PHASE3_COMPLETED.md)
- [Phase 4 完成总结](./doc/PHASE4_COMPLETED.md)
- [Expo 54 升级说明](./doc/EXPO_54_UPGRADE.md)

---

## 🔒 安全说明

本项目处理敏感的用户聊天记录，安全与隐私是首要原则：

- ✅ 聊天记录加密存储（AES-256-GCM）
- ✅ 三层安全防护（输入检测 → 分级 Prompt → 输出审查）
- ✅ 高风险内容自动识别并引导专业求助
- ✅ JWT token 认证，支持用户数据删除

---

## 📄 许可证

MIT License

---

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

开发问题请参考 [design-doc.md](./doc/design-doc.md) 中的详细设计。

---

**Wavecho Team** ❤️  
让沟通更温和，让关系更美好。

