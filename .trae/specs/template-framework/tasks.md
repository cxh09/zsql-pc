# 智拾清澜工作台 - 模板框架实现计划

## [x] Task 1: 创建 demo 目录结构和基础配置文件
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 创建 `/demo` 目录
  - 创建 `package.json` 基础配置
  - 创建 `index.html` 入口文件
  - 创建 `vite.config.js` 配置
- **Acceptance Criteria Addressed**: [AC-1, AC-2]
- **Test Requirements**:
  - `programmatic` TR-1.1: demo 目录包含所有必要的配置文件
  - `human-judgment` TR-1.2: 配置文件内容完整，可正常运行

## [x] Task 2: 创建 Electron 主进程文件
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 创建 `main.js` 主进程入口
  - 创建 `preload.js` 预加载脚本
  - 实现窗口创建和基本窗口管理功能
  - 移除业务相关 IPC 处理
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `programmatic` TR-2.1: 窗口能正常创建和显示
  - `programmatic` TR-2.2: 窗口最小化、最大化、关闭功能正常

## [x] Task 3: 创建 Vue 主入口和 App 组件
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 创建 `src/main.ts` Vue 入口
  - 创建 `src/App.vue` 根组件
  - 实现登录状态管理（简化版）
- **Acceptance Criteria Addressed**: [AC-1, AC-2]
- **Test Requirements**:
  - `human-judgment` TR-3.1: App 组件结构清晰
  - `human-judgment` TR-3.2: 登录状态切换正常

## [x] Task 4: 创建登录页面组件
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 创建 `src/views/LoginPage.vue`
  - 保留登录表单结构（用户名、密码、记住我、登录按钮）
  - 保留扫码登录切换功能
  - 移除业务登录逻辑（使用模拟登录）
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgment` TR-4.1: 登录页面 UI 完整
  - `human-judgment` TR-4.2: 登录按钮点击后进入主页面

## [x] Task 5: 创建标题栏组件
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 创建 `src/components/TitleBar.vue`
  - 保留品牌标识和窗口控制按钮
  - 移除工作台/控制台切换和标签页（简化版本）
- **Acceptance Criteria Addressed**: [AC-2, AC-3]
- **Test Requirements**:
  - `human-judgment` TR-5.1: 标题栏 UI 完整
  - `programmatic` TR-5.2: 窗口控制按钮功能正常

## [x] Task 6: 创建侧边栏组件
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 创建 `src/components/Sidebar.vue`
  - 保留导航图标和菜单项结构
  - 保留用户菜单（系统设置、退出账号）
  - 移除业务相关菜单项（预约、客户会话等）
- **Acceptance Criteria Addressed**: [AC-2, AC-4]
- **Test Requirements**:
  - `human-judgment` TR-6.1: 侧边栏 UI 完整
  - `human-judgment` TR-6.2: 点击菜单项能切换标签页

## [x] Task 7: 创建内容区和标签页组件
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 创建 `src/views/Workbench.vue` 主布局
  - 创建 `src/components/BrowserTabs.vue` 标签页组件
  - 创建 `src/components/WebviewContainer.vue` 内容容器
  - 简化标签页功能（移除拖拽分离等复杂功能）
- **Acceptance Criteria Addressed**: [AC-2, AC-4]
- **Test Requirements**:
  - `human-judgment` TR-7.1: 内容区布局完整
  - `human-judgment` TR-7.2: 标签页切换正常

## [x] Task 8: 创建全局样式和工具函数
- **Priority**: medium
- **Depends On**: Task 3
- **Description**: 
  - 创建 `src/styles/global.css`
  - 创建必要的 composables（useElectron, useWindowInfo 等）
  - 移除业务相关的 composables
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgment` TR-8.1: 样式与原项目保持一致
  - `human-judgment` TR-8.2: 工具函数可用

## [x] Task 9: 验证和测试
- **Priority**: high
- **Depends On**: 所有任务
- **Description**: 
  - 运行 `npm install` 安装依赖
  - 运行 `npm run dev` 启动开发模式
  - 验证所有功能正常工作
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5]
- **Test Requirements**:
  - `programmatic` TR-9.1: 依赖安装成功
  - `programmatic` TR-9.2: 开发服务器正常启动
  - `human-judgment` TR-9.3: 所有界面组件正常显示和交互
