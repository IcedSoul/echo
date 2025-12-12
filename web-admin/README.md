# Wavecho Admin - 管理后台

基于 React + TypeScript + Tailwind CSS + shadcn/ui 构建的现代化管理后台。

## 功能特性

- 🔐 管理员登录认证
- 📊 数据概览仪表板
- 👥 用户管理（增删改查）
- 📈 使用限额管理
- 📝 会话记录管理
- 🎨 现代化 UI 设计
- 📱 响应式布局

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 库**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand
- **数据请求**: TanStack Query (React Query)
- **路由**: React Router v6
- **HTTP 客户端**: Axios
- **图标**: Lucide React

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3001

### 构建生产版本

```bash
npm run build
```

## 目录结构

```
web-admin/
├── src/
│   ├── components/        # 公共组件
│   │   └── layout/       # 布局组件
│   ├── pages/            # 页面组件
│   │   ├── LoginPage.tsx
│   │   ├── OverviewPage.tsx
│   │   ├── UsersPage.tsx
│   │   ├── UsageLimitsPage.tsx
│   │   └── SessionsPage.tsx
│   ├── lib/              # 工具库
│   │   ├── api-client.ts # API 客户端
│   │   └── utils.ts      # 工具函数
│   ├── types/            # TypeScript 类型定义
│   ├── App.tsx           # 应用入口
│   ├── main.tsx          # React 入口
│   └── index.css         # 全局样式
├── public/               # 静态资源
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 主要页面

### 1. 登录页面 (`/login`)
- 管理员验证码登录
- 仅限 admin 角色用户登录

### 2. 概览页面 (`/`)
- 用户统计
- 会话统计
- 功能使用统计
- 增长趋势

### 3. 用户管理 (`/users`)
- 用户列表
- 搜索用户
- 创建/编辑/删除用户
- 角色管理

### 4. 限额管理 (`/limits`)
- 用户使用限额查看
- 使用次数重置
- 限额编辑

### 5. 记录管理 (`/sessions`)
- 会话记录列表
- 按类型筛选
- 查看详情

## API 接口

所有 API 接口都需要在请求头中携带 `Authorization: Bearer {token}`。

### 概览统计
- `GET /admin/overview` - 获取概览统计数据

### 用户管理
- `GET /admin/users` - 获取用户列表
- `POST /admin/users` - 创建用户
- `PUT /admin/users/:id` - 更新用户
- `DELETE /admin/users/:id` - 删除用户

### 限额管理
- `GET /admin/usage-limits` - 获取使用限制列表
- `PUT /admin/usage-limits/:id` - 更新使用限制
- `POST /admin/usage-limits/:id/reset` - 重置使用次数

### 记录管理
- `GET /admin/sessions` - 获取会话记录列表

## 开发说明

### 添加新页面

1. 在 `src/pages/` 创建新页面组件
2. 在 `src/App.tsx` 中添加路由
3. 在 `src/components/layout/AdminLayout.tsx` 中添加导航项

### 添加新 API

1. 在 `src/types/index.ts` 中定义类型
2. 在相应页面中使用 React Query 调用

### 样式定制

修改 `tailwind.config.js` 和 `src/index.css` 中的主题配置。

## 注意事项

1. **权限控制**: 所有页面都需要管理员权限，非管理员用户无法访问
2. **Token 管理**: Token 存储在 localStorage 中，登出时会自动清除
3. **错误处理**: API 错误会自动拦截并处理，401/403 会跳转到登录页

## 生产部署

### 使用 Nginx

```nginx
server {
    listen 80;
    server_name admin.example.com;
    root /var/www/wavecho-admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 使用 Docker

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## License

Private - All Rights Reserved


