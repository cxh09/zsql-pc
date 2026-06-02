# 智拾清澜工作台 - 项目规则

## 项目概述
- **项目名称**: 智拾清澜工作台 (ZhiShi QingLan Workbench)
- **项目类型**: Electron 桌面应用程序
- **用途**: 智拾清澜项目的后台管理系统，用于查看和管理用户申请

## 技术栈
- **框架**: Electron
- **前端框架**: Vue 3 (Composition API)
- **UI 组件库**: TDesign Vue Next
- **构建工具**: electron-builder
- **包管理器**: npm

## 项目结构
```
zsql-pc/
├── main.js              # Electron 主进程入口
├── preload.js           # 预加载脚本 (安全桥接)
├── index.html           # 主页面 (登录页)
├── renderer.js          # 渲染进程逻辑
├── package.json         # 项目配置
├── .trae/               # Trae IDE 配置
│   └── project_rules.md # 本项目规则文件
└── assets/              # 静态资源 (图标等)
```

## 命名规范

### 文件命名
- JavaScript 文件: 小写，使用连字符分隔 (如: `main-process.js`)
- HTML 文件: 小写，使用连字符分隔 (如: `login-page.html`)
- 组件文件: 大驼峰 (如: `UserTable.vue`)

### 变量命名
- 常量: 全大写 + 下划线 (如: `MAX_RETRY_COUNT`)
- 变量/函数: 小驼峰 (如: `userList`, `getUserData()`)
- 类/组件: 大驼峰 (如: `UserService`, `ApplicationCard`)
- 布尔值: 使用 `is`、`has`、`should` 前缀 (如: `isLoading`, `hasError`)

## 代码风格

### JavaScript/Vue
- 使用单引号 `'` 而非双引号 `"`
- 缩进: 2 个空格
- 语句末尾使用分号
- 最大行长度: 100 字符
- 使用 `===` 和 `!==` 而非 `==` 和 `!=`

### Vue 组件规范
```vue
<template>
  <!-- 模板代码 -->
</template>

<script setup>
// Composition API 风格
import { ref, reactive, onMounted } from 'vue'

// 逻辑代码
</script>

<style scoped>
/* 样式代码 */
</style>
```

## 功能模块规划

### 1. 用户认证模块
- 登录页面 (已完成)
- 记住密码功能
- Token 管理
- 自动登录

### 2. 用户申请管理模块
- 申请列表展示
- 申请详情查看
- 申请状态筛选 (待处理/已处理/已拒绝)
- 申请审批操作

### 3. 数据统计模块
- 申请数量统计
- 数据可视化图表
- 导出报表功能

### 4. 系统设置模块
- 账号设置
- 通知设置
- 日志查看

## API 接口规范

### 基础配置
- 基础 URL: 待配置
- 请求超时: 30000ms
- 错误重试: 3 次

### 接口列表 (待补充)
```javascript
// 示例接口定义
const API = {
  // 认证
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',
  
  // 用户申请
  GET_APPLICATIONS: '/applications',
  GET_APPLICATION_DETAIL: '/applications/:id',
  UPDATE_APPLICATION_STATUS: '/applications/:id/status',
  
  // 统计
  GET_STATISTICS: '/statistics',
}
```

## 安全规范

### Electron 安全
- 启用 `contextIsolation`
- 禁用 `nodeIntegration`
- 使用 `preload.js` 进行进程间通信
- 内容安全策略 (CSP) 配置

### 数据安全
- 敏感信息不存储在本地
- 密码加密传输
- Token 安全存储

## 开发命令

```bash
# 开发模式
npm run dev

# 启动应用
npm start

# 打包应用
npm run build

# Windows 打包
npm run build:win

# macOS 打包
npm run build:mac

# Linux 打包
npm run build:linux
```

## Git 提交规范

### 提交类型
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

### 提交格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 示例
```
feat(user): 添加用户申请列表页面

- 实现申请列表展示
- 添加分页功能
- 支持状态筛选

Closes #123
```

## 注意事项

1. **不要提交敏感信息**到代码仓库
2. **保持代码简洁**，避免过度工程化
3. **及时更新**项目规则和文档
4. **遵循 TDesign** 设计规范，保持 UI 一致性
5. **错误处理**要完善，提供友好的错误提示

## 待办事项

- [ ] 配置后端 API 地址
- [ ] 实现用户申请列表页面
- [ ] 添加数据持久化存储
- [ ] 实现应用图标和启动画面
- [ ] 添加自动更新功能
