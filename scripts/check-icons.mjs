#!/usr/bin/env node
/**
 * check-icons.mjs
 *
 * 图标资源静态检查脚本。验证:
 *   1. src/composables/pageRegistry.ts 与 preload.js 的 ICON_FILES 命名一致
 *   2. ICON_FILES 中每个文件名在 pages/ 下存在
 *   3. pages/*.html 引用的 favicon / icon-globe 等资源文件存在
 *   4. package.json 中 build.win/mac/linux.icon 路径文件存在(若声明)
 *   5. public/favicon.svg 存在(Vite 会复制到 dist/)
 *
 * 用法:
 *   node scripts/check-icons.mjs
 *
 * 退出码:
 *   0 - 全部通过
 *   1 - 有缺失/不一致 (CI 拦截)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

let errors = 0
let warnings = 0

function ok(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`)
}

function err(msg) {
  console.error(`${RED}✗${RESET} ${msg}`)
  errors++
}

function warn(msg) {
  console.warn(`${YELLOW}!${RESET} ${msg}`)
  warnings++
}

function header(title) {
  console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`)
}

// === 1. 从 pageRegistry.ts 提取 ICON_FILES ===
function extractIconFilesFromRegistry() {
  const file = resolve(ROOT, 'src/composables/pageRegistry.ts')
  if (!existsSync(file)) {
    err(`pageRegistry.ts 不存在: ${file}`)
    return {}
  }
  const src = readFileSync(file, 'utf8')
  // 匹配 ICON_FILES 对象字面量:const ICON_FILES: Record<...> = { ... }
  const m = src.match(/ICON_FILES[^=]*=\s*\{([\s\S]*?)\n\}/m)
  if (!m) {
    err('pageRegistry.ts 中未找到 ICON_FILES 对象')
    return {}
  }
  const map = {}
  const re = /(\w+)\s*:\s*'([^']+)'/g
  let mm
  while ((mm = re.exec(m[1])) !== null) {
    map[mm[1]] = mm[2]
  }
  return map
}

// === 2. 从 preload.js 提取 ICON_FILES ===
function extractIconFilesFromPreload() {
  const file = resolve(ROOT, 'preload.js')
  if (!existsSync(file)) {
    err(`preload.js 不存在: ${file}`)
    return {}
  }
  const src = readFileSync(file, 'utf8')
  // 匹配 const ICON_FILES = { ... } (单层对象,无类型注解)
  const m = src.match(/const\s+ICON_FILES\s*=\s*\{([\s\S]*?)\n\}/m)
  if (!m) {
    err('preload.js 中未找到 ICON_FILES 对象')
    return {}
  }
  const map = {}
  const re = /(\w+)\s*:\s*'([^']+)'/g
  let mm
  while ((mm = re.exec(m[1])) !== null) {
    map[mm[1]] = mm[2]
  }
  return map
}

// === 主检查 ===
function checkRegistryConsistency(regMap, preMap) {
  header('1. ICON_FILES 注册表一致性')
  const regKeys = Object.keys(regMap).sort()
  const preKeys = Object.keys(preMap).sort()

  if (regKeys.length === 0) {
    err('pageRegistry.ICON_FILES 为空或解析失败')
    return
  }

  ok(`pageRegistry.ICON_FILES 解析到 ${regKeys.length} 个条目`)

  // keys 是否一致
  const regSet = new Set(regKeys)
  const preSet = new Set(preKeys)
  for (const k of regKeys) {
    if (!preSet.has(k)) {
      err(`preload.js ICON_FILES 缺失 key: '${k}' (pageRegistry 里有)`)
    }
  }
  for (const k of preKeys) {
    if (!regSet.has(k)) {
      err(`pageRegistry.ICON_FILES 缺失 key: '${k}' (preload.js 里有)`)
    }
  }

  // values 是否一致
  for (const k of regKeys) {
    if (preMap[k] && preMap[k] !== regMap[k]) {
      err(`ICON_FILES['${k}'] 不一致: pageRegistry='${regMap[k]}' preload='${preMap[k]}'`)
    }
  }

  if (regKeys.length === preKeys.length && regKeys.every((k) => regMap[k] === preMap[k])) {
    ok('两个 ICON_FILES 完全一致')
  }
}

function checkIconFilesExist(map) {
  header('2. ICON_FILES 文件存在性')
  const pagesDir = resolve(ROOT, 'pages')
  if (!existsSync(pagesDir)) {
    err(`pages/ 目录不存在: ${pagesDir}`)
    return
  }
  for (const [name, file] of Object.entries(map)) {
    const abs = join(pagesDir, file)
    if (!existsSync(abs)) {
      err(`ICON_FILES['${name}'] = '${file}' 在 pages/ 下不存在`)
    } else {
      ok(`pages/${file} (${name})`)
    }
  }
}

function checkPagesHtmlFavicons() {
  header('3. pages/*.html favicon 引用')
  const pagesDir = resolve(ROOT, 'pages')
  if (!existsSync(pagesDir)) return
  const htmlFiles = readdirSync(pagesDir).filter((f) => f.endsWith('.html'))
  for (const hf of htmlFiles) {
    const src = readFileSync(join(pagesDir, hf), 'utf8')
    // 匹配 <link rel="icon" ... href="...">
    const re = /<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/gi
    let m
    while ((m = re.exec(src)) !== null) {
      const href = m[1]
      // 跳过内联 data: URL
      if (href.startsWith('data:')) {
        ok(`${hf} -> ${href.slice(0, 30)}... (内联 data: URL)`)
        continue
      }
      // 解析相对路径(基于当前 html)
      const target = resolve(dirname(join(pagesDir, hf)), href)
      if (!existsSync(target)) {
        err(`${hf} 的 favicon '${href}' 不存在 (解析到 ${target})`)
      } else {
        ok(`${hf} -> ${href}`)
      }
    }
  }
}

function checkPagesHtmlImgRefs() {
  header('4. pages/*.html <img src="...icon-*.svg"> 引用')
  const pagesDir = resolve(ROOT, 'pages')
  if (!existsSync(pagesDir)) return
  const htmlFiles = readdirSync(pagesDir).filter((f) => f.endsWith('.html'))
  const iconSvgRe = /icon-([a-z-]+)\.svg/gi
  for (const hf of htmlFiles) {
    const src = readFileSync(join(pagesDir, hf), 'utf8')
    const found = new Set()
    let m
    while ((m = iconSvgRe.exec(src)) !== null) {
      found.add(m[0])
    }
    for (const f of found) {
      const target = join(pagesDir, f)
      if (!existsSync(target)) {
        err(`${hf} 引用了 ${f},但文件不存在`)
      } else {
        ok(`${hf} -> ${f}`)
      }
    }
  }
}

function checkPackageJsonIcons() {
  header('5. package.json build.*.icon 路径')
  const file = resolve(ROOT, 'package.json')
  if (!existsSync(file)) {
    err('package.json 不存在')
    return
  }
  let pkg
  try {
    pkg = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    err(`package.json 解析失败: ${e.message}`)
    return
  }
  const platforms = ['win', 'mac', 'linux']
  for (const p of platforms) {
    const iconPath = pkg.build?.[p]?.icon
    if (iconPath) {
      const abs = resolve(ROOT, iconPath)
      if (!existsSync(abs)) {
        err(`build.${p}.icon = '${iconPath}' 指向的文件不存在`)
      } else {
        ok(`build.${p}.icon -> ${iconPath}`)
      }
    } else if (p === 'win') {
      warn(`build.win.icon 未配置,Windows 打包将使用默认 Electron 图标`)
    }
  }
}

function checkPublicAssets() {
  header('6. public/ 与 assets/ 重复扫描')
  const pubDir = resolve(ROOT, 'public')
  const assetsDir = resolve(ROOT, 'assets')
  if (!existsSync(pubDir) || !existsSync(assetsDir)) {
    ok('跳过 (public/ 或 assets/ 不存在)')
    return
  }
  // 递归列出两边所有文件,计算 sha256 对比
  function listFiles(dir, base = '') {
    const out = []
    if (!existsSync(dir)) return out
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      const st = statSync(full)
      if (st.isDirectory()) {
        out.push(...listFiles(full, join(base, name)))
      } else {
        out.push({ rel: join(base, name).replace(/\\/g, '/'), full })
      }
    }
    return out
  }
  const pubFiles = new Map(listFiles(pubDir).map((f) => [f.rel, f.full]))
  const assetFiles = new Map(listFiles(assetsDir).map((f) => [f.rel, f.full]))
  let dupCount = 0
  for (const [rel, pubFull] of pubFiles) {
    const assetFull = assetFiles.get(rel)
    if (!assetFull) continue
    const a = readFileSync(pubFull)
    const b = readFileSync(assetFull)
    if (a.length === b.length && a.equals(b)) {
      err(`public/${rel} 与 assets/${rel} 内容完全相同 (重复)`)
      dupCount++
    }
  }
  if (dupCount === 0) {
    ok('public/ 与 assets/ 无重复内容相同的文件')
  }
}

function checkPublicFavicon() {
  header('7. public/favicon.svg (Vite 入口)')
  const f = resolve(ROOT, 'public/favicon.svg')
  if (!existsSync(f)) {
    err('public/favicon.svg 不存在 (Vite 不会复制到 dist/,主窗口 favicon 将 404)')
  } else {
    ok('public/favicon.svg 存在')
  }
}

function checkPagesFaviconForTabWindow() {
  header('8. pages/favicon.svg (tab-window 同目录引用)')
  const f = resolve(ROOT, 'pages/favicon.svg')
  if (!existsSync(f)) {
    // tab-window.html 的 href="favicon.svg" 需要这个文件存在
    const tw = resolve(ROOT, 'pages/tab-window.html')
    if (existsSync(tw)) {
      const src = readFileSync(tw, 'utf8')
      if (/href=["']favicon\.svg["']/.test(src)) {
        err('tab-window.html 引用 favicon.svg 但 pages/favicon.svg 不存在')
      }
    }
  } else {
    ok('pages/favicon.svg 存在')
  }
}

function checkPagesIconOrphans() {
  header('9. pages/icon-*.svg 死代码扫描')
  const pagesDir = resolve(ROOT, 'pages')
  if (!existsSync(pagesDir)) return
  const regMap = extractIconFilesFromRegistry()
  const registered = new Set(Object.values(regMap))
  // 同时扫描 pageRegistry 的 PAGE_REGISTRY 中所有 icon: 字段值
  const regSrc = readFileSync(resolve(ROOT, 'src/composables/pageRegistry.ts'), 'utf8')
  const usedIcons = new Set()
  const iconFieldRe = /icon:\s*'(\w+)'/g
  let m
  while ((m = iconFieldRe.exec(regSrc)) !== null) {
    usedIcons.add(m[1])
  }
  for (const f of readdirSync(pagesDir)) {
    if (!/^icon-[a-z-]+\.svg$/.test(f)) continue
    if (!registered.has(f)) {
      err(`pages/${f} 不在 ICON_FILES 注册表中 (死代码或遗漏注册)`)
    } else {
      ok(`pages/${f} 已注册`)
    }
  }
}

// === main ===
console.log('='.repeat(60))
console.log('图标资源静态检查')
console.log('Root:', ROOT)
console.log('='.repeat(60))

const regMap = extractIconFilesFromRegistry()
const preMap = extractIconFilesFromPreload()

checkRegistryConsistency(regMap, preMap)
checkIconFilesExist(regMap)
checkPagesHtmlFavicons()
checkPagesHtmlImgRefs()
checkPackageJsonIcons()
checkPublicAssets()
checkPublicFavicon()
checkPagesFaviconForTabWindow()
checkPagesIconOrphans()

console.log('\n' + '='.repeat(60))
if (errors === 0 && warnings === 0) {
  console.log(`${GREEN}All icon resources OK${RESET}`)
  process.exit(0)
} else if (errors === 0) {
  console.log(`${YELLOW}Passed with ${warnings} warning(s)${RESET}`)
  process.exit(0)
} else {
  console.log(`${RED}FAILED: ${errors} error(s), ${warnings} warning(s)${RESET}`)
  process.exit(1)
}
