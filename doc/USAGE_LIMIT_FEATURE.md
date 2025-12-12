# 使用限制功能改造总结

## 改造概述

将用户页面的统计信息从"按风险等级统计"改为"按产品功能统计使用情况和限制"。

## 改造内容

### 后端改造

#### 1. 数据模型层（`backend/app/models/usage_limit.py`）
新增使用限制相关数据模型：
- `UsageLimitConfig`: 使用限制配置（各功能上限）
- `UserUsageStats`: 用户使用统计（各功能已使用次数）
- `UserUsageLimitInDB`: 数据库中的使用限制记录
- `UsageLimitResponse`: API响应模型
- `UsageCheckResult`: 使用限制检查结果

默认限制配置（普通用户）：
- 冲突复盘：10次
- 情况评理：10次
- 表达助手：10次
- AI对话：20次

#### 2. 服务层（`backend/app/services/usage_limit_service.py`）
新增使用限制服务，提供以下功能：
- `initialize_user_limits()`: 初始化用户使用限制（注册时调用）
- `get_user_limits()`: 获取用户使用限制
- `check_usage_limit()`: 检查是否可使用某功能
- `increment_usage()`: 增加功能使用次数
- `get_usage_response()`: 获取使用情况响应（给前端）
- `reset_user_usage()`: 重置使用次数（管理员功能）

#### 3. 数据库层（`backend/app/db/mongodb.py`）
在 `create_indexes()` 中新增 `user_usage_limits` 集合的索引：
- `user_id`: 唯一索引
- `user_level`: 普通索引

#### 4. API接口层

##### 认证接口（`backend/app/api/routes/auth.py`）
- **修改 `/auth/verify-code`**: 用户注册时自动初始化使用限制
- **修改 `/auth/stats`**: 返回新的使用统计信息（`UsageLimitResponse`）

##### 冲突复盘（`backend/app/services/orchestrator.py`）
在分析流程开始前：
1. 检查使用限制
2. 如果超限，返回403错误
3. 如果允许，创建会话并增加使用次数

##### 情况评理（`backend/app/api/routes/situation_judge.py`）
在处理请求时：
1. 检查使用限制
2. 如果超限，返回403错误
3. 如果允许，创建会话并增加使用次数

##### 表达助手（`backend/app/api/routes/expression_helper.py`）
在处理请求时：
1. 检查使用限制
2. 如果超限，返回403错误
3. 如果允许，创建会话并增加使用次数

##### AI对话（`backend/app/api/routes/chat.py`）
在发送消息时：
1. 检查使用限制
2. 如果超限，返回403错误
3. 如果允许，处理消息并在成功后增加使用次数

### 前端改造

#### 1. API类型定义（`frontend/src/api/auth.ts`）
- 新增 `UserUsageStats` 接口，定义使用统计数据结构
- 修改 `getUserStats()` 返回类型为 `UserUsageStats`

#### 2. 错误处理（`frontend/src/api/client.ts`）
在响应拦截器中增加对403错误的处理：
- 检测 `USAGE_LIMIT_EXCEEDED` 错误码
- 抛出包含详细信息的自定义错误

#### 3. 用户页面（`frontend/src/screens/ProfileScreen.tsx`）
将统计卡片从三栏横向布局改为四行纵向布局，显示：

每行包含：
- 功能图标和名称
- 已使用/上限
- 剩余次数

四个功能：
1. 冲突复盘 (people-outline图标)
2. 情况评理 (scale-outline图标)
3. 表达助手 (chatbubble-outline图标)
4. AI对话 (sparkles-outline图标)

#### 4. 样式调整
新增样式：
- `statsContainer`: 统计容器，使用gap布局
- `usageItem`: 单个使用项，横向排列
- `usageHeader`: 图标和标签
- `usageLabel`: 功能名称
- `usageInfo`: 使用信息（右对齐）
- `usageText`: 已使用/上限文本
- `usageRemaining`: 剩余次数提示

## 数据库变更

新增集合：`user_usage_limits`

文档结构：
```json
{
  "user_id": "string",
  "limits": {
    "conflict_analysis_limit": 10,
    "situation_judge_limit": 10,
    "expression_helper_limit": 10,
    "ai_chat_limit": 20
  },
  "usage": {
    "conflict_analysis_used": 0,
    "situation_judge_used": 0,
    "expression_helper_used": 0,
    "ai_chat_used": 0
  },
  "user_level": "free",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## 错误处理

当用户使用次数达到上限时：
- HTTP状态码：403 Forbidden
- 错误码：`USAGE_LIMIT_EXCEEDED`
- 错误消息："{功能名}使用次数已达上限（{limit}次），请升级账户或等待下次重置"
- 详细信息包含：feature, used, limit

## 测试

已创建测试脚本 `backend/test_usage_limit.py`，测试：
1. 初始化用户限制
2. 检查使用限制
3. 增加使用次数
4. 获取使用情况
5. 超限检查
6. 重置使用次数

运行测试：
```bash
cd backend
python test_usage_limit.py
```

## 向后兼容

- 已存在的用户在首次调用 API 时会自动初始化使用限制
- 旧的 `/auth/stats` 接口返回格式已完全更改，前端需同步更新

## 未来扩展

可扩展的功能点：
1. 用户等级系统（free/premium/vip），不同等级不同限制
2. 定时重置任务（每月重置使用次数）
3. 使用历史记录和统计图表
4. 临时提升额度功能
5. 购买额外次数功能

