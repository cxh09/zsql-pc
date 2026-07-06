# 修复 `npm start` / 生产环境标签页图标不显示

## Why

在 `npm run dev` 模式下,主窗口 BrowserTabs 的标签页图标(以及全局搜索结果中的页面图标)能正常显示;但在 `npm start`(本地构建预览)以及打包后的生产环境中,这些图标全部 404,只看到一个空缺位置。截图高亮的红色框就是主页标签前的"家"图标位置。

## What Changes

- 修正 `getLocalIconPath` / `getIconPath` 在主窗口上下文使用的 basePath,使其在 `file://` 协议下也能解析到正确的相对位置。
- 在 Vite 构建产物 `dist/renderer/` 中提供 `pages/icon-*.svg` 与 `pages/favicon.svg`,让相对路径在生产环境下可访问。
- 保持 `tab-window.html`、webview 子页面、CI 检查脚本等行为不变。

## Impact

- Affected specs:
  - 图标系统资源位置规范 (`.trae/icon-system.md` 单一真值仍为 `pages/icon-*.svg`,只新增一条"主窗口构建产物副本"说明)
- Affected code:
  - [src/composables/pageRegistry.ts](file:///c:/Users/Administrator/zsql-pc/src/composables/pageRegistry.ts) — `getIconPath` 默认 basePath
  - [src/composables/useTabs.ts](file:///c:/Users/Administrator/zsql-pc/src/composables/useTabs.ts) — `getLocalIconPath` 默认 basePath
  - [vite.config.js](file:///c:/Users/Administrator/zsql-pc/vite.config.js) — 新增内联插件,构建结束时把 `pages/icon-*.svg`、`pages/favicon.svg` 拷贝到 `dist/renderer/pages/`

## 根因分析

1. 主窗口 HTML 由 Vite 打包到 [dist/renderer/index.html](file:///c:/Users/Administrator/zsql-pc/dist/renderer/index.html),通过 Electron `loadFile(file://.../dist/renderer/index.html)` 加载。
2. [src/composables/pageRegistry.ts](file:///c:/Users/Administrator/zsql-pc/src/composables/pageRegistry.ts#L175-L181) 的 `getIconPath` 默认 basePath 是绝对路径 `/pages/`:
   ```ts
   export function getIconPath(name: IconName, basePath: string = '/pages/'): string {
     return `${basePath}${ICON_FILES[name] ?? ICON_FILES.globe}`
   }
   ```
3. `file://` 协议下,绝对路径 `/pages/icon-home.svg` 解析为系统根目录 `file:///pages/icon-home.svg`,而非应用 `pages/` 目录,所以 404。
4. 即便改成相对路径,`dist/renderer/pages/` 在构建后并不存在(Vite 默认只复制 `public/`),仍然 404。
5. 开发模式下 `/pages/...` 能正常显示是因为 Vite dev server 把项目根作为站点根目录。

## ADDED Requirements

### Requirement: 标签页图标在生产环境可见

主窗口 BrowserTabs、SearchOverlay 中通过 `getLocalIconPath(icon)` / `getIconPath(icon)` 生成的 URL,在 `npm start`、`npm run build:vite && electron .` 以及 electron-builder 打包产物中,均能成功加载到对应的 `pages/icon-*.svg` 资源。

#### Scenario: `npm start` 启动后打开任意标签页
- **WHEN** 用户在 `npm start` 启动的主窗口中打开"主页""预约查看"等任一内建标签页
- **THEN** 标签页前的 14×14 图标正常显示(不再出现 404 留下的空白),DevTools Network 面板中该图标请求返回 200

#### Scenario: 全局搜索结果图标
- **WHEN** 用户按 `Ctrl+K` 打开全局搜索并输入关键词
- **THEN** 搜索结果列表中每条页面记录左侧的图标正常显示

## MODIFIED Requirements

### Requirement: 主窗口图标路径使用相对路径

[src/composables/pageRegistry.ts](file:///c:/Users/Administrator/zsql-pc/src/composables/pageRegistry.ts) 中 `getIconPath` 的默认 `basePath` 从 `'/pages/'` 改为 `'./pages/'`,使其在 Vite dev server (站点根) 与 Electron `loadFile` (`file://` + 相对 `index.html`) 两种上下文下都能解析到正确的资源目录。

[src/composables/useTabs.ts](file:///c:/Users/Administrator/zsql-pc/src/composables/useTabs.ts) 中 `getLocalIconPath` 默认 `basePath` 同步修改为 `'./pages/'`。

> tab-window 上下文(已自行 `replace('/pages/', '../pages/')`)与 webview 子页面(以同目录相对路径 `icon-home.svg` 引用)行为不变。

### Requirement: Vite 构建产物包含 `pages/icon-*.svg` 与 `pages/favicon.svg`

[vite.config.js](file:///c:/Users/Administrator/zsql-pc/vite.config.js) 新增一个内联 Vite 插件,在 `closeBundle` 钩子中:
- 读取项目根的 `pages/` 目录
- 把其中所有 `icon-*.svg` 与 `favicon.svg` 拷贝到 `dist/renderer/pages/` 下,保持原文件名

保证 `dist/renderer/pages/icon-home.svg` 等文件在 `vite build` 之后存在。

## REMOVED Requirements

无。
