# 修复 `npm start` 找不到渲染层 与 依赖漏洞

## 1. Summary(总结)

终端里的 `npm install` 本身是成功的("up to date, audited 430 packages in 2s"),用户看到的"问题"其实是两类:

1. **`npm start`** **启动 Electron 时找不到** **`dist/renderer/index.html`**

   * 原因: `package.json` 的 `start` 脚本直接执行 `electron .`,而 `main.js` 在非 dev 模式下从 `path.join(__dirname, 'dist', 'renderer', 'index.html')` 加载页面。仓库中根本没有 `dist/` 目录(Vite 从未构建过)。
2. **12 个依赖漏洞(11 high, 1 critical)**

   * 原因: 依赖图里有过时的 transitive 包。需要用 `npm audit fix` 修复;若有 breaking change 才需要 `--force`。

修复方向: 修改 `npm start` 自动先构建,再运行 `npm audit fix` 处理漏洞。

## 2. Current State Analysis(现状分析)

### 2.1 `package.json` 关键片段

```json
"scripts": {
  "dev:vite": "vite",
  "dev:electron": "wait-on http://localhost:5173 && cross-env VITE_DEV_SERVER_URL=http://localhost:5173 electron . --dev",
  "dev": "concurrently -k -n vite,electron -c blue,green \"npm:dev:vite\" \"npm:dev:electron\"",
  "start": "electron .",            // ← 缺少前置 build
  "build:vite": "vite build",
  "build": "npm run check-icons && npm run build:vite && electron-builder"
}
```

### 2.2 `main.js` 加载逻辑([main.js#L90-L96](file:///c:/Users/Administrator/zsql-pc/main.js#L90-L96))

```js
} else if (VITE_DEV_SERVER_URL) {
  window.loadURL(VITE_DEV_SERVER_URL)
} else {
  // 生产模式:加载 Vite 打包后的 index.html
  window.loadFile(path.join(__dirname, 'dist', 'renderer', 'index.html'))
}
```

* 仅有 `VITE_DEV_SERVER_URL` 时走 Vite dev server(由 `npm run dev` 注入);

* 其它情况都要求 `dist/renderer/index.html` 必须存在。

### 2.3 实际仓库状态

* `dist/` 目录不存在(`Glob dist/**/*` 无结果);

* `node_modules/` 已安装(430 packages);

* `npm audit` 报告 12 vulnerabilities(11 high, 1 critical)。

## 3. Proposed Changes(改动方案)

### 3.1 修改 `package.json` 的 `start` 脚本

把 `start` 改为:先跑 `vite build`,再用 Electron 加载构建产物。这样无论何时执行 `npm start` 都能直接看到界面。

```diff
-    "start": "electron .",
+    "start": "npm run build:vite && electron .",
```

> 说明: 不使用 `&&` 链式在 Windows PowerShell 下 cross-shell 有兼容问题,改用 npm script 链式更稳。`build:vite` 内部调用 `vite build`,在 `vite.config.js` 中已配置 `outDir: 'dist/renderer'`,产物路径与 `main.js` 期望一致。

### 3.2 修复依赖漏洞

执行 `npm audit fix`(非交互、可自动升级 transitive 依赖),并按需处理 breaking change:

```bash
# 先尝试非破坏性修复
npm audit fix

# 如果仍有残留漏洞,逐项确认后再用 --force
npm audit fix --force
```

执行完后再次 `npm audit` 确认 0 vulnerabilities(或仅剩无法升级的 transitive 漏洞,并在 plan 中记录)。

### 3.3 (可选)同时保留 `dev` 入口

不修改 `dev` 脚本,它已经正确地拉起 Vite + Electron。只需要在终端使用上区分:

* `npm run dev` → 日常开发(HMR);

* `npm start` → 预览生产构建结果(自动 build 后启动 Electron)。

## 4. Files to Change(改动文件清单)

| 文件                                                                  | 变更                                              |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| [package.json](file:///c:/Users/Administrator/zsql-pc/package.json) | `start` 脚本改为 `npm run build:vite && electron .` |
| (生成) `dist/renderer/**`                                             | 由 `vite build` 自动产出,无需手写                        |
| `package-lock.json`                                                 | 由 `npm audit fix` 自动更新,无需手写                     |

## 5. Assumptions & Decisions(假设与决策)

* **假设**: 用户希望 `npm start` 可以直接工作(开箱即用),而不是每次先跑 `build:vite`。

* **决策**: 选用脚本链式 `npm run build:vite && electron .`,避免 PowerShell 下 `&&` 解析问题,并保持与 `build` 脚本一致风格。

* **决策**: 不修改 `main.js` 的加载逻辑(已正确区分 dev/prod),仅修复入口脚本。

* **决策**: 漏洞修复先尝试 `npm audit fix`,再视情况使用 `--force`(避免大版本破坏)。如 `--force` 引入不兼容,会在结果中报告给用户决定。

* **不做**: 不修改 `dev` 脚本、不修改 vite 配置、不动 main.js。

## 6. Verification(验证步骤)

执行完成后,按以下顺序验证:

1. **脚本可用性**

   ```bash
   npm run  # 应当看到 start = "npm run build:vite && electron ."
   ```

2. **构建产物存在**

   ```bash
   npm run build:vite
   ls dist/renderer/index.html   # 应当存在
   ```

3. **npm start 能正常启动**

   ```bash
   npm start
   ```

   预期: Electron 窗口正常打开,显示 "智拾清澜工作台",不再有 `ERR_FILE_NOT_FOUND` 错误。

4. **漏洞数量下降**

   ```bash
   npm audit
   ```

   预期: vulnerabilities 数量显著下降(可能为 0,也可能仍剩 1-2 个无法非破坏修复的项,需在结果中说明)。

5. **dev 模式仍正常**(回归)

   ```bash
   npm run dev
   ```

   预期: Vite 启动在 5173,Electron 加载 dev server URL,无回归。

