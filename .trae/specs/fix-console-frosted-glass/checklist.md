# Checklist

- [x] `pages/console.html` 中 `<t-loading fullscreen>` 已移除
- [x] `pages/console.html` 中新增 `.switch-spinner` 居中定位容器 + 内嵌 `<t-loading size="large" />`(用 TDesign 自带 spinner,**非 fullscreen 模式**)
- [x] `.switch-spinner` 容器 `z-index: 9999`,overlay 容器 `z-index: 5000`(spinner 在 overlay 之上)
- [x] `.switch-overlay` 的 `backdrop-filter: blur(16px)` 保持不变
- [x] `.switch-overlay` 的 1s opacity 淡入逻辑保持不变
- [x] `console.html`(根目录)与 `pages/console.html` 保持同步
- [x] `onModeChange` 中已删除 `switchingTo.value = ''`,避免 leave 与窗口销毁冲突
- [x] `switchingTo` 已在 setup() return 中暴露给模板
- [ ] 点击控制台"工作台"时,毛玻璃模糊可见(需 Electron 渲染进程实测)
- [ ] 点击控制台"工作台"时,TDesign spinner 在视口中央持续旋转(需 Electron 渲染进程实测)
- [ ] 2s 后自动执行 `backToWorkbench()` 切回工作台(需 Electron 渲染进程实测)
- [ ] 工作台 → 控制台方向(在 `TitleBar.vue`)动画不受影响,保持原有正常工作状态(需 Electron 渲染进程实测)
