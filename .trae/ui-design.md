# UI 设计规范参考

## 项目概述
智拾清澜工作台 - 基于 TDesign 组件库的桌面端应用界面

## 设计系统

### 色彩体系
- **主色调**: `#3b82f6` (蓝色) - 用于主要按钮、链接、高亮
- **成功色**: `#22c55e` (绿色)
- **警告色**: `#f97316` (橙色)
- **危险色**: `#ef4444` (红色)
- **图标灰色**: `#6b7280`
- **背景色**: 使用 CSS 变量 `var(--td-bg-color-page)` 和 `var(--td-bg-color-container)`
- **文字色**: 
  - 主文字: `var(--td-text-color-primary)`
  - 次级文字: `var(--td-text-color-secondary)`

### 字体规范
- **字体栈**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **页面标题**: 24px, font-weight: 600
- **卡片标题**: 16px, font-weight: 600
- **正文**: 14px
- **小字/标签**: 12px, 13px

### 圆角规范
- **大圆角**: 12px (卡片、欢迎区域)
- **中圆角**: 8px (按钮、小卡片、图标背景)
- **小圆角**: 4px, 2px (标签、图片)

### 间距规范
- **页面内边距**: 16px 24px (上下 左右)
- **卡片内边距**: 16px 20px, 20px, 32px 40px (根据重要性)
- **元素间距**: 12px, 16px, 20px, 24px
- **网格间距**: 16px

## 组件样式

### 页面头部 (page-header)
```css
.page-header {
  margin-bottom: 24px;
}
.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}
.page-header p {
  font-size: 14px;
  color: var(--td-text-color-secondary);
  margin-top: 4px;
}
```

### 卡片组件
- **背景**: `var(--td-bg-color-container)`
- **边框**: 1px solid `var(--td-border-level-1-color)`
- **圆角**: 8px
- **悬浮效果**: 
  - 背景变为 `var(--td-bg-color-secondarycontainer)`
  - 边框变为主色
  - 上移 2px: `transform: translateY(-2px)`
  - 阴影: `0 4px 12px rgba(0, 0, 0, 0.1)`

### 图标背景
```css
.stat-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-card-icon.blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
```

### 渐变卡片
```css
.welcome-card {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 12px;
  padding: 32px 40px;
  color: white;
}
```

### 登录页样式
- **左侧品牌区**: flex: 1, 白色文字, 居中
- **右侧登录区**: 宽度 480px, 毛玻璃效果
  - `background: rgba(255, 255, 255, 0.75)`
  - `backdrop-filter: blur(20px)`

### 导航页浮层
```css
/* 左下角详情浮层 */
.nav-details {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: var(--td-bg-color-container);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  padding: 12px 16px;
  z-index: 10;
}

/* 右下角按钮 */
.control-bar {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 10;
}
```

## 布局模式

### 网格布局
```css
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
```

### Flex 布局
```css
#app {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
```

## 图标规范

### 页面图标
- 使用 SVG 格式
- 描边颜色: `#6b7280` (灰色)
- 尺寸: 24x24
- 描边宽度: 2
- 无填充: `fill="none"`

### 图标类型映射
- 主页: 房子图标 (home)
- 文件/列表: 文件图标 (file)
- 用户: 用户头像图标 (user)
- 设置: 齿轮图标 (settings)
- 浏览器: 指南针图标 (browser)
- 文档: 文档图标 (doc)
- 导航: 导航箭头图标 (navigation)

## 交互规范

### 悬浮效果
- 过渡时间: 0.2s
- 缓动函数: ease
- 变换: translateY(-2px)
- 阴影增强

### 加载状态
- 使用 TDesign 加载组件
- 页面加载前隐藏: `visibility: hidden`
- 加载完成后淡入: `transition: opacity 0.2s ease`

## 浏览器标签页

### 标签样式
- 高度: 36px
- 圆角: 8px 8px 0 0
- 背景: 透明 / 激活时白色
- 字体: 13px
- 图标: 14x14

### 图标显示逻辑
1. HTTP/HTTPS 图片: `<img>` 标签
2. File 协议图片: `<img>` 标签
3. 内置图标: SVG 内联
4. 默认: 空心圆圈
