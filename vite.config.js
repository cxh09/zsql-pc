import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Vite config for the Electron renderer process.
// - base: './' so that file:// loading in production works for sub-resources.
// - build.outDir: 'dist/renderer' is the directory Electron's main process loads.
// - server.port: matches VITE_DEV_SERVER_URL expectation in main.js.
// - resolve.alias: maps `assets` and `pages` to the project-level folders so
//   SFC templates can reference static resources without deep relative paths.
//   Using exact-match aliases (array form) to avoid greedy matches.

// `pages/` is the single source of truth for tab / sub-page favicons (see
// `.trae/icon-system.md`). In dev, Vite's dev server serves the project root
// directly, so `/pages/icon-*.svg` works. In production, Electron loads
// `dist/renderer/index.html` via `file://`, where absolute paths break and
// the icons would 404. To keep the renderer referencing `./pages/icon-*.svg`
// in both modes, this inline plugin copies the icon files into the build
// output so the relative URL resolves at runtime.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const copyPagesIconsPlugin = {
  name: 'copy-pages-icons',
  async closeBundle() {
    const srcDir = path.resolve(__dirname, 'pages')
    const destDir = path.resolve(__dirname, 'dist/renderer/pages')
    try {
      await mkdir(destDir, { recursive: true })
      const entries = await readdir(srcDir)
      const targets = entries.filter(
        (name) => /^icon-.*\.svg$/.test(name) || name === 'favicon.svg'
      )
      await Promise.all(
        targets.map(async (name) => {
          const data = await readFile(path.join(srcDir, name))
          await writeFile(path.join(destDir, name), data)
        })
      )
      if (targets.length === 0) {
        console.warn('[copy-pages-icons] no icon files found in pages/')
      } else {
        console.log(`[copy-pages-icons] copied ${targets.length} file(s) to dist/renderer/pages`)
      }
    } catch (err) {
      // Don't fail the build for an icon copy error; just warn.
      console.warn('[copy-pages-icons] failed to copy icon assets:', err.message)
    }
  }
}

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') + path.sep },
      { find: /^assets\/(.*)$/, replacement: path.resolve(__dirname, 'assets') + path.sep + '$1' },
      { find: /^pages\/(.*)$/, replacement: path.resolve(__dirname, 'pages') + path.sep + '$1' }
    ]
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Treat <webview> as a native custom element (Electron webview tag).
          isCustomElement: (tag) => tag === 'webview'
        }
      }
    }),
    copyPagesIconsPlugin
  ],
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    target: 'chrome120',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html')
    }
  },
  optimizeDeps: {
    include: ['vue', 'tdesign-vue-next']
  }
})
