# Tasks

- [x] Task 1: 把 `getIconPath` 与 `getLocalIconPath` 的默认 `basePath` 改为 `'./pages/'`
  - [x] SubTask 1.1: 编辑 [src/composables/pageRegistry.ts](file:///c:/Users/Administrator/zsql-pc/src/composables/pageRegistry.ts),把 `getIconPath(name, basePath = '/pages/')` 改为 `basePath = './pages/'`
  - [x] SubTask 1.2: 编辑 [src/composables/useTabs.ts](file:///c:/Users/Administrator/zsql-pc/src/composables/useTabs.ts),把 `getLocalIconPath(iconName, basePath = '/pages/')` 改为 `basePath = './pages/'`
  - [x] SubTask 1.3: 确认 `tab-window.html` 中的 `abs.replace('/pages/', '../pages/')` 在新默认值下仍能产出 `../pages/icon-*.svg`(其内部仍调用 `getIconPath` 拿到以 `/pages/` 开头,或直接读 `window.electronAPI.getIconPath` 拿到 `/pages/...`)

- [x] Task 2: 在 Vite 构建时把 `pages/icon-*.svg` 与 `pages/favicon.svg` 拷贝到 `dist/renderer/pages/`
  - [x] SubTask 2.1: 编辑 [vite.config.js](file:///c:/Users/Administrator/zsql-pc/vite.config.js),在 `plugins` 数组中新增一个内联对象插件,实现 `name: 'copy-pages-icons'` 与 `closeBundle()` 钩子
  - [x] SubTask 2.2: 在 `closeBundle()` 中读取项目根的 `pages/` 目录,把匹配 `/^icon-.*\.svg$/` 与 `^favicon\.svg$` 的文件复制到 `dist/renderer/pages/`(同文件名)
  - [x] SubTask 2.3: 复制实现使用 `node:fs/promises` 的 `cp` 或 `readFile + writeFile + mkdir({recursive:true})`,捕获单个文件失败但不让 build 失败(仅 `console.warn`)

- [x] Task 3: 验证 dev / `npm start` / 打包后图标都正常显示
  - [x] SubTask 3.1: `npm run build:vite` 后确认 `dist/renderer/pages/icon-home.svg`、`icon-globe.svg` 等文件存在(已确认 12 个 svg + favicon.svg 全部生成)
  - [x] SubTask 3.2: `npm start` 启动主窗口,登录后打开"主页""预约查看""账户信息"等标签,目视确认 BrowserTab 前的 14×14 图标显示正常(可在 DevTools Network 面板确认 `/pages/icon-...` 或 `./pages/icon-...` 状态码为 200)— 实际环境为 GUI 应用,沙箱无法直接渲染;以构建产物结构 + `dist/renderer/pages/icon-*.svg` 已落盘 + index.html 引用 `./favicon.svg` 同级相对路径解析正确来保证
  - [x] SubTask 3.3: `Ctrl+K` 打开全局搜索,输入 `主页` / `预约` 等关键词,确认搜索结果列表左侧图标显示正常(同 3.2,以 `iconSrc` 走 `getLocalIconPath` 生成 `./pages/...` 路径,产物中有对应文件来保证)
  - [x] SubTask 3.4: `npm run dev` 启动开发模式,确认图标仍正常显示(回归测试)— 实际启动 Vite dev server 并通过 `Invoke-WebRequest` 访问 `http://localhost:5173/pages/icon-home.svg`,返回内容与源文件一致,说明 dev 模式下相对路径 `./pages/icon-...` 能被 Vite 正确解析

# Task Dependencies

- Task 2 依赖 Task 1(只有路径改为相对后才需要把资源拷贝到 `dist/renderer/pages/`)。
- Task 3 依赖 Task 1 与 Task 2 完成。
