# ZSQL PC 项目索引

## 项目概述

- **项目名称**: 智拾清澜工作台 (ZhiShi QingLan Workbench)
- **类型**: Electron 桌面应用程序
- **技术栈**: Electron + Vue 3 + TDesign Vue Next
- **版本**: 1.4.0
- **主页**: https://github.com/zsql/zsql-pc
- **用途**: 智拾清澜项目的后台管理系统，用于查看和管理用户申请

## 项目结构

```
zsql-pc/
├── main.js              # Electron 主进程入口
├── preload.js           # 预加载脚本 (contextBridge API)
├── renderer.js          # Vue 3 主应用 (路由/标签页管理/登录)
├── index.html           # 主窗口 HTML (登录页 + 工作台框架)
├── package.json         # 项目配置
├── favicon.svg          # 应用图标
├── assets/
│   ├── bgpic.png        # 登录页背景图
│   └── changelog.md     # 更新日志
├── libs/
│   ├── vue.global.js    # Vue 3 (CDN)
│   ├── tdesign.min.js   # TDesign 组件库
│   └── tdesign.min.css  # TDesign 样式
├── pages/               # 子页面 (webview 加载)
│   ├── dashboard.html   # 主页 (数据统计概览)
│   ├── applications.html # 预约查看 (表格列表)
│   ├── application-detail.html # 预约详情
│   ├── account.html     # 账户信息
│   ├── settings.html    # 系统设置
│   ├── browser.html     # 浏览器页
│   ├── agreement.html    # 协议页
│   └── changelog.html    # 更新日志页
├── .github/workflows/    # CI/CD
└── .trae/               # 项目规则
```

## 核心功能模块

### 1. 主进程 (main.js)
- 窗口管理: 创建 BrowserWindow (1200x700), 隐藏菜单栏
- 跨域处理: 为本地 API 添加 CORS 头
- IPC 通信: window-maximize, window-is-maximized, logout, set-theme
- webview 新窗口拦截: 转为新标签页打开

### 2. 预加载脚本 (preload.js)
- contextBridge 暴露 electronAPI:
  - `maximize()` / `isMaximized()` - 窗口控制
  - `onOpenNewTab(callback)` - 监听新标签页事件
  - `logout()` / `onLogout(callback)` - 登出
  - `setTheme(theme)` / `onThemeChange(callback)` - 主题切换

### 3. 渲染进程 (renderer.js + index.html)
- **登录系统**: 账号密码登录 (admin/zsql1234) / 二维码登录占位
- **标签页管理**: 多标签浏览器式标签栏, 支持 webview 加载子页面
- **侧边栏导航**: 主页 / 预约 / 客户会话 / 浏览器
- **窗口控制**: 最小化 / 最大化 / 关闭
- **主题支持**: 明暗主题切换

### 4. 主页 (dashboard.html)
- 欢迎卡片 (渐变背景)
- 统计卡片: 今日预约/待处理/已完成/客户总数
- API: `GET http://zsql.2gck.xyz:8080/form/submissions`
- 数据格式: `{ code: 200, data: [{ id, name, phone, location, itemType, date, time, status }] }`

### 5. 预约查看 (applications.html)
- 统计卡片: 全部/待处理/处理中/今日新增
- 表格: ID/姓名/电话/物品类型/位置/预约时间/状态/操作
- 搜索 & 状态筛选
- 分页: 10/20/50 条每页
- 详情查看: `window.open('application-detail.html?id=xxx')`
- 导出 JSON 功能

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

## 待办事项

- [ ] 配置后端 API 地址
- [ ] 实现用户申请列表页面
- [ ] 添加数据持久化存储
- [ ] 实现应用图标和启动画面
- [ ] 添加自动更新功能

## 关键文件说明

| 文件 | 说明 |
|------|------|
| [main.js](file:///c:\Users\Administrator\zsql-pc\main.js) | Electron 主进程, 窗口创建, IPC handlers |
| [preload.js](file:///c:\Users\Administrator\zsql-pc\preload.js) | 安全桥接, 暴露 electronAPI 给渲染进程 |
| [renderer.js](file:///c:\Users\Administrator\zsql-pc\renderer.js) | Vue 3 主应用, 登录/标签页/菜单逻辑 |
| [index.html](file:///c:\Users\Administrator\zsql-pc\index.html) | 主窗口, 登录页 + 工作台框架 |
| [pages/dashboard.html](file:///c:\Users\Administrator\zsql-pc\pages\dashboard.html) | 主页, 统计数据展示 |
| [pages/applications.html](file:///c:\Users\Administrator\zsql-pc\pages\applications.html) | 预约列表管理 |

## 依赖

- **运行时**: vue@3.5.x, tdesign-vue-next@1.20.x
- **开发**: electron@42.x, electron-builder@25.x

## 运行命令

```bash
npm start        # 启动应用
npm run dev      # 开发模式 (打开 DevTools)
npm run build    # 构建
npm run build:win # Windows 构建
```
