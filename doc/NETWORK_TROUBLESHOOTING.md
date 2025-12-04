# 网络连接故障排查指南

## 🔧 Network Error 修复

如果前端调用 API 时出现 **Network Error**，请按照以下步骤排查。

---

## ✅ 已完成的修复

### 1. 后端 CORS 配置

**问题**: 后端未允许来自 Expo 的跨域请求

**修复**: 
- ✅ 开发环境允许所有来源 (`allow_origins=["*"]`)
- ✅ 自动检测开发/生产环境
- ✅ 生产环境仍然使用安全的 CORS 配置

**文件**: `backend/app/core/config.py`, `backend/app/main.py`

### 2. 前端 API 地址自动检测

**问题**: 硬编码 `localhost` 在移动设备上不可用

**修复**:
- ✅ 创建 `frontend/src/config/api.ts` 配置文件
- ✅ 根据平台自动选择正确的 IP 地址
  - iOS 模拟器: `localhost`
  - Android 模拟器: `10.0.2.2`
  - 实体设备: 自动检测或手动配置
- ✅ 控制台打印当前使用的 API 地址

**文件**: `frontend/src/config/api.ts`, `frontend/src/api/client.ts`

---

## 📱 不同设备的配置

### iOS 模拟器 ✅

**无需配置**，自动使用 `http://localhost:8000/api`

```typescript
// 自动配置
API_BASE_URL = 'http://localhost:8000/api'
```

### Android 模拟器 ✅

**自动使用** `http://10.0.2.2:8000/api`

```typescript
// 自动配置
API_BASE_URL = 'http://10.0.2.2:8000/api'
```

### Android/iOS 实体设备 📱

**需要手动配置电脑的局域网 IP**

#### 步骤：

**1. 查找电脑的局域网 IP**

Windows (PowerShell):
```bash
ipconfig
# 查找 "IPv4 地址" 或 "无线局域网适配器 WLAN"
# 示例: 192.168.1.100
```

macOS/Linux:
```bash
ifconfig | grep "inet "
# 或
ip addr show
# 示例: 192.168.1.100
```

**2. 修改配置文件**

打开 `frontend/src/config/api.ts`，取消注释并修改：

```typescript
// 取消注释下面这行，填入您的 IP 地址
export const API_BASE_URL = 'http://192.168.1.100:8000/api';
```

**3. 重启 Expo 服务器**

```bash
npm run frontend:dev
```

---

## 🧪 测试连接

### 1. 查看 Expo 控制台

启动前端后，查看控制台输出：

```
API Base URL: http://localhost:8000/api
或
API Base URL: http://10.0.2.2:8000/api
或
API Base URL: http://192.168.1.100:8000/api
```

确认地址正确。

### 2. 测试后端健康检查

在浏览器或终端测试：

```bash
# 浏览器访问
http://localhost:8000/health

# 或终端
curl http://localhost:8000/health
```

应该返回：
```json
{
  "status": "healthy",
  "database": "connected",
  "environment": "development"
}
```

### 3. 在应用中测试

1. 打开应用
2. 尝试登录或提交分析
3. 如果仍然报错，查看错误信息

---

## 🐛 常见问题

### 问题 1: 后端未启动

**错误**: `Network Error` 或 `Connection refused`

**解决**:
```bash
# 启动后端
npm run dev
```

### 问题 2: MongoDB 未运行

**错误**: 后端启动失败，提示数据库连接错误

**解决**:
```bash
# 启动 MongoDB
npm run db:start

# 检查状态
docker ps
```

### 问题 3: 端口被占用

**错误**: `Port 8000 already in use`

**解决**:

Windows:
```powershell
# 查找占用端口的进程
netstat -ano | findstr :8000

# 结束进程（替换 PID）
taskkill /PID <PID> /F
```

macOS/Linux:
```bash
# 查找占用端口的进程
lsof -i :8000

# 结束进程
kill -9 <PID>
```

### 问题 4: 防火墙阻止

**错误**: 实体设备连接超时

**解决**:
1. 关闭防火墙（临时）
2. 或添加例外规则（端口 8000）

Windows:
- 控制面板 → Windows Defender 防火墙 → 高级设置
- 入站规则 → 新建规则 → 端口 → TCP 8000

macOS:
```bash
# 系统偏好设置 → 安全性与隐私 → 防火墙
# 添加 Python 或 Node.js 允许
```

### 问题 5: 电脑和手机不在同一 WiFi

**错误**: 实体设备无法连接

**解决**:
1. 确保电脑和手机连接到同一个 WiFi 网络
2. 不要使用访客网络（Guest Network）

---

## 🔍 调试技巧

### 1. 启用 Axios 日志

在 `frontend/src/api/client.ts` 中添加：

```typescript
apiClient.interceptors.request.use(
  (config) => {
    console.log('🚀 Request:', config.method?.toUpperCase(), config.url);
    return config;
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return Promise.reject(error);
  }
);
```

### 2. 使用 React Native Debugger

1. 安装 React Native Debugger
2. 在 Expo 应用中按 `Cmd+D` (iOS) 或 `Cmd+M` (Android)
3. 选择 "Debug Remote JS"
4. 查看网络请求

### 3. 查看后端日志

后端会打印所有请求：

```bash
cd E:\Github\echo
npm run backend:dev

# 观察日志输出
```

---

## ✅ 验证清单

完成以下检查确保配置正确：

- [ ] 后端已启动 (`npm run dev`)
- [ ] MongoDB 已运行 (`docker ps`)
- [ ] 健康检查正常 (`curl http://localhost:8000/health`)
- [ ] CORS 配置为允许所有来源（开发环境）
- [ ] 前端控制台显示正确的 API 地址
- [ ] 电脑和手机在同一 WiFi（实体设备）
- [ ] 防火墙未阻止端口 8000

---

## 📝 快速修复命令

```bash
# 1. 启动所有服务
cd E:\Github\echo
npm run db:start
npm run dev

# 2. 在新终端启动前端
npm run frontend:dev

# 3. 测试健康检查
curl http://localhost:8000/health

# 4. 查看 API 文档
start http://localhost:8000/docs
```

---

## 🎯 测试完整流程

1. **启动服务**
```bash
npm run dev
```

2. **打开应用**
- 扫描二维码或按 `i`/`a`

3. **测试登录**
- 输入邮箱
- 获取验证码
- 验证登录

4. **测试分析**
- 输入对话
- 提交分析
- 查看结果

5. **验证成功**
- ✅ 登录成功
- ✅ 分析提交成功
- ✅ 结果正常显示

---

## 📚 相关文档

- [Phase 4 完成总结](./PHASE4_COMPLETED.md)
- [Expo 54 升级说明](./EXPO_54_UPGRADE.md)
- [设计文档](./design-doc.md)

---

## 💡 提示

**如果以上方法都无法解决问题**：

1. 检查 `frontend/src/config/api.ts` 中打印的 API 地址
2. 手动配置 IP 地址
3. 重启所有服务
4. 清除 Expo 缓存：`expo start -c`

---

**问题已修复！现在应该可以正常连接后端 API 了 🚀**

---

**Wavecho Team** ❤️  
让沟通更温和，让关系更美好

