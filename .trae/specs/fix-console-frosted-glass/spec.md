# 控制台 → 工作台 切换毛玻璃丢失修复

## Why

切换工作台/控制台窗口时,工作台 → 控制台 方向能正常显示 1s 毛玻璃淡入 + spinner 旋转的过渡动画,但控制台 → 工作台 方向**完全没有毛玻璃**(连白色遮罩都没有),用户立即看到旧窗口被关、新窗口出现。dev 和 build 版本都一致,影响"模式切换"功能的核心视觉反馈。

## What Changes

* **不修改** 工作台 (`src/components/TitleBar.vue`) 的切换逻辑——它正常工作

* **修复** 控制台 (`pages/console.html`) 的切换动画——让它和工作台行为完全一致

* 可能涉及 `pages/console.html` 的 onModeChange、setTimeout 顺序、CSS 加载顺序、t-loading 配置

* **不涉及** 主进程 (`main.js`) 任何改动

* **不涉及** 任何业务功能(连接、控制指令、IMU)改动

* **不涉及** 工作台 → 控制台 方向

## Impact

* **Affected code**:

- <br />

  * `pages/console.html:60-82` — 切换毛玻璃 CSS(`.switch-overlay` 及 transition 类)

  * `pages/console.html:351-362` — `<t-loading>` + `<transition>` 模板

  * `pages/console.html:486-497` — `onModeChange` 函数

- **Affected capabilities**:

  * 模式切换加载过渡(用户体验)

- **风险**:低,只动控制台模板和样式

- **回归**:dev + build 都要测两个方向

## ADDED Requirements

### Requirement: 控制台 → 工作台 必须显示毛玻璃淡入

用户在控制台窗口中点击 "工作台" 按钮时,**必须**看到与工作台 → 控制台 方向完全一致的 1s 毛玻璃淡入动画 + spinner 旋转,然后控制台关闭、新工作台在同位置出现。

#### Scenario: 正常切换

* **WHEN** 用户在控制台窗口中,鼠标点击 "工作台" 单选按钮

* **THEN** 控制台窗口**立即**显示一个 0→1s 渐入的半透明白色遮罩(`rgba(255,255,255,0.5)`) + 16px 背景模糊(`backdrop-filter: blur(16px)`)+ 居中的 TDesign spinner

* **AND THEN** 1s 后遮罩保持不透明

* **AND THEN** 2s 后控制台窗口关闭,新工作台窗口在相同屏幕坐标出现

* **AND THEN** 整个动画期间 spinner 始终在遮罩之上可见(不被遮罩盖住)

#### Scenario: 重复触发

* **WHEN** 用户在 2s 过渡期间再次点击 "工作台" / "控制台"

* **THEN** 动画不重置(因为 onModeChange 内置 `if (newMode === modeText.value) return` 守卫)

* **AND THEN** 2s 后正常完成切换

### Requirement: 两个方向切换动画必须完全对称

工作台 → 控制台 和 控制台 → 工作台 两个方向的视觉表现必须完全相同(动画时长、颜色、模糊半径、spinner 大小、z-index 层级、leave 反向淡出)。

#### Scenario: 对称验证

* **WHEN** 用户分别从工作台点击 "控制台" 和从控制台点击 "工作台"

* **THEN** 两次的视觉表现(淡入曲线、停留时间、关闭时机)完全一致

## REMOVED Requirements

### Requirement: 控制台 setTimeout 内的 leave 过渡

**Reason**: 当前 `setTimeout` 里 `switchingTo.value = false` 紧跟着 `backToWorkbench()`,leave 过渡(0.4s)与主进程 `ready-to-show` 后关闭窗口的时机存在冲突,可能是导致毛玻璃丢失的根因。本次修复会重新设计 setTimeout 内的代码顺序,可能删除 `switchingTo.value = false` 这一行(让元素随窗口销毁自然消失,不再做 leave 过渡)。
**Migration**: 不需要迁移,这个 leave 过渡是可选视觉效果(用户从未反馈"想要 leave 渐出")。

## 实现方向(供 apply 阶段参考,非强制)

调研得出的 4 个可能根因(按优先级):

1. **leave 过渡与窗口销毁冲突** — 最可能。控制台 setTimeout 内 `switchingTo=false` 触发 leave,然后 `backToWorkbench` 触发主进程关窗口,leave 还没跑完元素就被销毁,v-if 的 enter 状态可能被优化器跳过。修复:删除 setTimeout 里的 `switchingTo.value = false`,让旧窗口销毁时元素一起消失。
2. **TDesign UMD** **`:show-overlay="false"`** **不生效** — 验证方法:把 t-loading 整个从控制台模板删掉,看毛玻璃是否出现。
3. **CSS 加载顺序被 TDesign 覆盖** — 验证方法:用 DevTools 看 `.switch-overlay` 实际生效的 CSS 规则。
4. **boolean 类型 :key 的 Vue 3 quirk** — 验证方法:把 `:key="switchingTo"` 改成 `:key="String(switchingTo)"`。

Apply 阶段会按这个顺序逐个排查并修复。
