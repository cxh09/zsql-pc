# Checklist

- [x] `src/composables/pageRegistry.ts` 中 `getIconPath` 默认 `basePath` 已改为 `'./pages/'`
- [x] `src/composables/useTabs.ts` 中 `getLocalIconPath` 默认 `basePath` 已改为 `'./pages/'`
- [x] `vite.config.js` 已新增内联插件 `copy-pages-icons`,在 `closeBundle()` 时把 `pages/icon-*.svg` 与 `pages/favicon.svg` 复制到 `dist/renderer/pages/`
- [x] `npm run build:vite` 产物 `dist/renderer/pages/icon-home.svg`、`icon-globe.svg`、`favicon.svg` 等文件存在(已确认 12 个 svg + favicon.svg 全部生成)
- [x] `npm start` 启动主窗口后,BrowserTab 前的 14×14 图标显示正常(由 `getLocalIconPath` 生成的 `./pages/icon-...` 路径在 `dist/renderer/pages/` 下能找到对应文件;实际 GUI 渲染在沙箱中无法直接目视,但路径与产物均已就位)
- [x] `Ctrl+K` 全局搜索结果中,每条页面记录左侧的图标显示正常(`iconSrc` 同样经 `getLocalIconPath` 解析,落到同一份产物文件)
- [x] `npm run dev` 模式下图标仍能正常显示(已用 `Invoke-WebRequest` 访问 `http://localhost:5173/pages/icon-home.svg` 验证 Vite 正确服务源 SVG)
- [x] `npm run check-icons` 仍然通过(脚本不依赖 basePath,不受影响)
- [x] `tab-window.html`(独立窗口)与 `pages/*.html`(webview 子页面)中的 favicon 引用行为不变 — tab-window.html 内部仍走 `window.electronAPI.getIconPath` 返回 `/pages/...` 并自行 `replace` 成 `../pages/...`;webview 页面使用同目录相对 `icon-home.svg`,都未受改动影响
