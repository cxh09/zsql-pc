# Tasks

- [x] Task 1: 修复 `pages/console.html` 的切换动画
  - [x] SubTask 1.1: 移除 `<t-loading fullscreen>`(UMD fullscreen 模式用 `<Teleport :disabled>`,渲染不稳定)
  - [x] SubTask 1.2: 新增 `.switch-spinner` 居中定位容器 + 内嵌 `<t-loading size="large" />`(用 TDesign 自带 spinner,**非 fullscreen 模式**,绕开 Teleport 问题)
  - [x] SubTask 1.3: 确认 `.switch-spinner` 容器 z-index = 9999,高于 overlay 的 5000
  - [x] SubTask 1.4: 保持 `.switch-overlay` 的 `backdrop-filter: blur(16px)` + 1s opacity 淡入逻辑不变
  - [x] SubTask 1.5: 修复 `onModeChange` leave 与窗口销毁冲突:删除 setTimeout 里的 `switchingTo.value = ''`
  - [x] SubTask 1.6: 验证 `switchingTo` 在 return 中已暴露给模板

- [x] Task 2: 同步修复 `console.html`(根目录副本)
  - [x] SubTask 2.1: 移除 `<t-loading fullscreen>`
  - [x] SubTask 2.2: 新增相同的 `.switch-spinner` + `<t-loading size="large" />`,与 Task 1 完全一致
  - [x] SubTask 2.3: 验证 `onModeChange` 与 Task 1 一致

- [ ] Task 3: 验证
  - [ ] SubTask 3.1: 对比 `TitleBar.vue` 的 spinner 视觉(颜色、尺寸、动画曲线),确保两个方向完全一致
  - [ ] SubTask 3.2: 在控制台窗口点击"工作台",观察是否能看到 毛玻璃模糊 + TDesign spinner 持续旋转 + 2s 后切窗
  - [ ] SubTask 3.3: 在工作台窗口点击"控制台",观察动画(应保持原有工作正常的表现)

# Task Dependencies
- Task 2 depends on Task 1(根目录副本需与 pages 版本同步)
- Task 3 depends on Task 1 and Task 2
