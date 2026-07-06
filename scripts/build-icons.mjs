#!/usr/bin/env node
/**
 * build-icons.mjs
 *
 * 从 build/icon-source.png (1024x1024) 生成三平台原生图标:
 *   - build/icon.ico  (Windows, 多分辨率)
 *   - build/icon.icns (macOS,需在 macOS 上用 iconutil 转换)
 *   - build/icon.png  (Linux, 512x512)
 *
 * 用法:
 *   1. 设计交付 build/icon-source.png (1024x1024 透明 PNG)
 *   2. npm run build-icons
 *
 * 依赖: sharp (需 npm install --save-dev sharp)
 *
 * 注意: 此脚本**不改动**任何 pages/icon-*.svg 或其他 SVG 的视觉样式。
 * 它只处理原生应用图标,这是新生成的资源,与现有图标体系独立。
 */

import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')
const BUILD_DIR = resolve(ROOT, 'build')
const SOURCE = join(BUILD_DIR, 'icon-source.png')

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`\n❌ 缺失源文件: ${SOURCE}\n`)
    console.error('请将设计交付的 1024x1024 透明 PNG 重命名为 icon-source.png 放到 build/ 目录下。\n')
    console.error('参考文档: build/README.md\n')
    process.exit(1)
  }

  console.log(`📦 源文件: ${SOURCE}`)
  console.log(`   size: ${statSync(SOURCE).size} bytes`)

  // 动态加载 sharp(可能在 CI 环境没装)
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch (e) {
    console.error(`\n❌ 缺少 sharp 依赖。运行: npm install --save-dev sharp\n`)
    process.exit(1)
  }

  mkdirSync(BUILD_DIR, { recursive: true })

  // === Linux PNG (512x512) ===
  const linuxPng = join(BUILD_DIR, 'icon.png')
  await sharp(SOURCE).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(linuxPng)
  console.log(`✓ ${linuxPng}`)

  // === Windows ICO (多分辨率) ===
  // sharp 自身支持生成 ICO
  const icoSizes = [16, 32, 48, 64, 128, 256]
  const icoBuffers = await Promise.all(
    icoSizes.map((size) =>
      sharp(SOURCE).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    )
  )
  // 拼装 ICO
  const icoBuffer = await sharp(SOURCE).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
  // 简单方案: sharp 不直接输出 ico,使用 to-ico 库
  let toIco
  try {
    toIco = (await import('to-ico')).default
  } catch (e) {
    console.warn(`\n⚠ 缺少 to-ico,无法生成 icon.ico。运行: npm install --save-dev to-ico`)
    console.warn(`  Windows 图标需要单独处理。可用 ImageMagick: magick convert icon-source.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico`)
  }
  if (toIco) {
    const winIco = join(BUILD_DIR, 'icon.ico')
    const icoFile = await toIco(icoBuffers)
    writeFileSync(winIco, icoFile)
    console.log(`✓ ${winIco}`)
  }

  // === macOS ICNS ===
  // sharp 不直接支持 ICNS。提供两种方案:
  // 1. macOS 上用 iconutil
  // 2. 使用 png2icns 库
  const icnsSizes = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' }
  ]
  const iconsetDir = join(BUILD_DIR, 'icon.iconset')
  mkdirSync(iconsetDir, { recursive: true })
  for (const { size, name } of icnsSizes) {
    const buf = await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    writeFileSync(join(iconsetDir, name), buf)
  }
  console.log(`✓ ${iconsetDir}/ (iconset)`)
  console.log(`\n⚠ macOS ICNS 需要在 macOS 上执行: iconutil -c icns ${iconsetDir}`)
  console.log(`  或安装 png2icns 后本脚本可一键生成 (待集成)。`)

  console.log(`\n✅ 全部生成完成。运行 npm run check-icons 验证。`)
}

main().catch((e) => {
  console.error('❌ 错误:', e.message)
  process.exit(1)
})
