# 图标系统维护规范

> 本文件由 fix-icon-system Spec (`.trae/specs/fix-icon-system/`) 引入,记录项目图标体系的**位置/引用规范**与**添加新图标的 SOP**。
> 任何对图标的修改都应参照本文档。

## 资源位置规范

| 类别 | 位置 | 备注 |
|---|---|---|
| Tab favicon / 子页面图标 | `pages/icon-*.svg` | **单一真值**,所有页面 favicon 与 tab 图标都从这里取 |
| 主窗口 favicon | `public/favicon.svg` | Vite 复制到 `dist/favicon.svg` |
| tab-window 上下文 favicon | `pages/favicon.svg` | 与 `pages/tab-window.html` 同目录,`href="favicon.svg"` 同级引用 |
| 原生应用图标 | `build/icon.{ico,icns,png}` | 需设计交付 `build/icon-source.png` 后用 `npm run build-icons` 生成 |
| 外部资源 (logo/二维码) | `assets/external/*` | **不要**再放 `public/assets/` 副本 |

## 引用规范

### 1. 主窗口 (src/*.vue, src/composables/*.ts)

```ts
import { getLocalIconPath } from '@/composables/useTabs'
// 或直接用 pageRegistry.getIconPath(name, '/pages/')
const src = getLocalIconPath('home')  // → '/pages/icon-home.svg'
```

> 主窗口默认 base path 是 `'/pages/'`。**不要**硬编码相对路径。

### 2. tab-window 上下文 (pages/tab-window.html)

页面顶部:

```html
<link rel="icon" type="image/svg+xml" href="favicon.svg">
```

模板里取本地图标:

```js
// tab-window.html 内部已有本地 getLocalIconPath,自动处理 ../pages/ 路径
const iconPath = getLocalIconPath(tabIcon)
```

### 3. 静态 `<link rel="icon">` (pages/*.html)

每个 pages/*.html 顶部都有:

```html
<link rel="icon" type="image/svg+xml" href="icon-XXX.svg">
```

> XXX 必须在 [src/composables/pageRegistry.ts](file:///c:/Users/Administrator/zsql-pc/src/composables/pageRegistry.ts) 的 `ICON_FILES` 注册。

## 添加新图标 SOP

1. **创建 SVG 文件** (24x24 viewBox, 2px stroke, 内容参考 `pages/icon-home.svg`)
2. **注册到 ICON_FILES** (两个文件必须同步):
   - [src/composables/pageRegistry.ts](file:///c:/Users/Administrator/zsql-pc/src/composables/pageRegistry.ts#L141-L152)
   - [preload.js](file:///c:/Users/Administrator/zsql-pc/preload.js#L21-L33)
3. **(可选)** 在 `PAGE_REGISTRY` 的某个页面中引用 `icon: '新名'`
4. **运行检查**:
   ```bash
   npm run check-icons
   ```
   必须退出码 0。
5. **提交** PR,CI 会自动跑 check-icons 拦截不一致

## 修改现有图标

> ⚠️ 任何 SVG 的 `stroke` / `viewBox` / path 修改都属于"视觉样式"修改,需要设计与产品签字。
> 本项目当前**不允许**由开发人员自行改动 (除非 Spec 明确授权)。

如确需修改:

1. 提交 Spec 描述改动原因
2. 设计与产品签字
3. 同步更新 ICON_FILES (如果文件名变了)
4. 跑 `npm run check-icons` + 视觉回归
5. **不要**改 Sidebar.vue 的内联 SVG (那些 path 是独立维护的)

## 调试路径

| 现象 | 排查点 |
|---|---|
| 主窗口 favicon 404 | 检查 `public/favicon.svg` 是否存在;`vite build` 后 `dist/favicon.svg` 是否存在 |
| 子页面 favicon 404 | 检查 `pages/icon-XXX.svg` 是否存在;`<link>` 的 `href` 是否匹配 |
| tab-window favicon 404 | 检查 `pages/favicon.svg` 是否存在 (与 tab-window.html 同目录) |
| 三方网页 favicon 兜底 globe 失败 | 检查 `pages/icon-globe.svg` 是否存在 |
| electron-builder 找不到 icon | 检查 `package.json` `build.{win,mac,linux}.icon` 路径;检查 `build/icon.*` 文件存在 |
| check-icons 报错 | 按脚本输出的 ✗ 项逐条修复;CI 会拦截合并 |

## 检查脚本

`scripts/check-icons.mjs` 验证 9 件事:

1. `pageRegistry.ts` 与 `preload.js` 的 `ICON_FILES` 命名一致
2. `ICON_FILES` 中每个文件在 `pages/` 存在
3. `pages/*.html` 引用的 favicon 文件存在
4. `pages/*.html` 引用的 `<img src="...icon-*.svg">` 文件存在
5. `package.json` 中 `build.*.icon` 路径文件存在
6. `public/` 与 `assets/` 无内容重复
7. `public/favicon.svg` 存在 (Vite 入口)
8. `pages/favicon.svg` 存在 (tab-window 入口)
9. `pages/icon-*.svg` 全部已注册 (无死代码)

CI 集成: `.github/workflows/build.yml` 在 `npm run build:vite` 前自动跑 `npm run check-icons`,失败则中断构建。
