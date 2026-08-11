# 智拾清澜工作台 - 模板框架 PRD

## Overview
- **Summary**: 创建一个精简的模板框架，包含登录页面、主页面布局、侧边栏导航、顶部菜单栏以及窗口管理功能，移除所有具体业务功能实现。
- **Purpose**: 提供一个可复用的 Electron + Vue 3 + TDesign 项目模板，保留基础UI结构和交互框架。
- **Target Users**: 开发者用于快速搭建类似的桌面应用项目。

## Goals
- 创建独立的 `/demo` 文件夹存放模板框架
- 保留登录页面基础结构（表单、按钮、切换登录方式）
- 保留主页面布局（标题栏、侧边栏、内容区）
- 保留窗口管理功能（最小化、最大化、关闭）
- 移除所有业务相关代码（API调用、页面注册表、具体页面内容）

## Non-Goals (Out of Scope)
- 不保留具体业务页面（预约、客户会话、数字图传等）
- 不保留 WebRTC 流媒体功能
- 不保留控制台 TCP 客户端功能
- 不保留网络诊断功能
- 不保留标签页拖拽分离功能（简化为基础标签页）

## Background & Context
当前项目是一个完整的 Electron 桌面应用，包含多个业务模块。用户需要一个基础模板框架，用于快速启动新项目，只保留核心UI结构。

## Functional Requirements
- **FR-1**: 登录页面 - 包含用户名/密码输入、记住密码、登录按钮、扫码登录切换
- **FR-2**: 顶部菜单栏 - 包含品牌标识、窗口控制按钮（最小化、最大化、关闭）
- **FR-3**: 侧边栏导航 - 包含导航图标和菜单项
- **FR-4**: 主内容区 - 包含标签页切换和内容展示区域
- **FR-5**: 窗口管理 - 支持最小化、最大化/还原、关闭操作

## Non-Functional Requirements
- **NFR-1**: 代码结构清晰，易于理解和扩展
- **NFR-2**: 样式与原项目保持一致（使用 TDesign 主题变量）
- **NFR-3**: 保持 Electron 安全最佳实践（contextIsolation、nodeIntegration）

## Constraints
- **Technical**: 使用 Electron + Vue 3 + TDesign Vue Next
- **Dependencies**: 与原项目相同的技术栈
- **Location**: 模板框架必须放在 `/demo` 文件夹下

## Assumptions
- 用户希望模板框架能够独立运行
- 用户希望模板框架保留原项目的 UI 设计风格
- 用户将在模板基础上添加新的业务功能

## Acceptance Criteria

### AC-1: 登录页面结构完整
- **Given**: 用户打开应用
- **When**: 显示登录页面
- **Then**: 页面包含用户名输入框、密码输入框、记住我复选框、登录按钮、扫码登录切换
- **Verification**: `human-judgment`

### AC-2: 主页面布局完整
- **Given**: 用户完成登录
- **When**: 进入主页面
- **Then**: 页面包含顶部标题栏、左侧侧边栏、右侧内容区
- **Verification**: `human-judgment`

### AC-3: 窗口管理功能正常
- **Given**: 用户在主页面
- **When**: 点击最小化/最大化/关闭按钮
- **Then**: 窗口执行相应操作
- **Verification**: `programmatic`

### AC-4: 侧边栏导航可用
- **Given**: 用户在主页面
- **When**: 点击侧边栏菜单项
- **Then**: 切换到对应标签页
- **Verification**: `human-judgment`

### AC-5: 无业务代码残留
- **Given**: 检查模板框架代码
- **When**: 搜索业务相关关键词
- **Then**: 不包含预约、客户会话、数字图传等业务代码
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要保留全局搜索功能？
- [ ] 是否需要保留主题切换功能？
- [ ] 是否需要保留多窗口模式切换（工作台/控制台）？
