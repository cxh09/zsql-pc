import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// Vite config for the Electron renderer process.
// - base: './' so that file:// loading in production works for sub-resources.
// - build.outDir: 'dist/renderer' is the directory Electron's main process loads.
// - server.port: matches VITE_DEV_SERVER_URL expectation in main.js.
// - resolve.alias: maps `assets` and `pages` to the project-level folders so
//   SFC templates can reference static resources without deep relative paths.
//   Using exact-match aliases (array form) to avoid greedy matches.
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
    })
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
