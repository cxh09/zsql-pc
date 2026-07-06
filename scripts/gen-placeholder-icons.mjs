#!/usr/bin/env node
/**
 * gen-placeholder-icons.mjs
 *
 * 在设计交付 build/icon-source.png 之前,生成三平台占位原生应用图标:
 *   - build/icon.ico  (Windows, 多分辨率 PNG-in-ICO)
 *   - build/icon.png  (Linux, 512x512 PNG)
 *   - build/icon.icns (macOS, 多分辨率 PNG-in-ICNS)
 *
 * 用途: 让 npm run check-icons 退出码 0,三平台打包 (build:win/mac/linux) 全部能成功。
 *
 * 设计交付后,直接 `npm run build-icons` 用真实 PNG 覆盖这些文件即可。
 *
 * 视觉: 蓝底白字 "Z" (#0052d9 项目主色),与现有 favicon.svg 风格一致。
 *
 * 用法: node scripts/gen-placeholder-icons.mjs
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateRawSync } from 'node:zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')
const BUILD = join(ROOT, 'build')

const PRIMARY = [0x00, 0x52, 0xd9] // #0052d9
const WHITE = [0xff, 0xff, 0xff]

// ===== CRC32 =====
const crcTable = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  crcTable[n] = c
}
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return c ^ 0xffffffff
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0)
  return Buffer.concat([len, t, data, crc])
}

// ===== 生成像素 =====
function generatePixels(size) {
  const px = Buffer.alloc(size * size * 4)
  const bgR = PRIMARY[0], bgG = PRIMARY[1], bgB = PRIMARY[2]
  const fgR = WHITE[0], fgG = WHITE[1], fgB = WHITE[2]

  const radius = Math.max(2, Math.floor(size * 0.18))
  const inset = Math.max(1, Math.floor(size * 0.12))
  const innerSize = size - 2 * inset

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      px[i] = 0; px[i+1] = 0; px[i+2] = 0; px[i+3] = 0

      const rx = x - inset, ry = y - inset
      let inside = rx >= 0 && ry >= 0 && rx < innerSize && ry < innerSize
      if (inside) {
        const corners = [
          [radius, radius],
          [innerSize - radius - 1, radius],
          [radius, innerSize - radius - 1],
          [innerSize - radius - 1, innerSize - radius - 1]
        ]
        for (const [cx, cy] of corners) {
          if (rx < cx && ry < cy) {
            if ((cx - rx)**2 + (cy - ry)**2 > radius*radius) inside = false
          } else if (rx > cx && ry < cy) {
            if ((rx - cx)**2 + (cy - ry)**2 > radius*radius) inside = false
          } else if (rx < cx && ry > cy) {
            if ((cx - rx)**2 + (ry - cy)**2 > radius*radius) inside = false
          } else if (rx > cx && ry > cy) {
            if ((rx - cx)**2 + (ry - cy)**2 > radius*radius) inside = false
          }
        }
      }
      if (!inside) continue

      // "Z" 字符
      const t = Math.max(1, Math.floor(size * 0.16))
      const zPad = Math.floor(size * 0.22)
      const zLeft = zPad, zRight = innerSize - zPad
      const zTop = zPad, zBot = innerSize - zPad

      let isZ = false
      if (ry >= zTop && ry < zTop + t && rx >= zLeft && rx < zRight) isZ = true
      if (ry >= zBot - t && ry < zBot && rx >= zLeft && rx < zRight) isZ = true
      if (!isZ) {
        const diagTop = zTop + t
        const diagBot = zBot - t
        if (ry >= diagTop && ry < diagBot && rx >= zLeft && rx < zRight) {
          const progress = (ry - diagTop) / (diagBot - diagTop)
          const centerX = zLeft + progress * (zRight - zLeft - t)
          if (Math.abs(rx - centerX) < t / 2) isZ = true
        }
      }

      if (isZ) { px[i] = fgR; px[i+1] = fgG; px[i+2] = fgB; px[i+3] = 0xff }
      else    { px[i] = bgR; px[i+1] = bgG; px[i+2] = bgB; px[i+3] = 0xff }
    }
  }
  return px
}

// ===== PNG 编码 =====
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6

  const filtered = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    filtered[y * (1 + width * 4)] = 0
    rgba.copy(filtered, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateRawSync(filtered)

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ===== Windows ICO (PNG-in-ICO 多分辨率) =====
function encodeICO(sizes) {
  const pngs = sizes.map((s) => ({ size: s, data: encodePNG(s, s, generatePixels(s)) }))
  const numImages = pngs.length
  const headerSize = 6 + 16 * numImages

  const dir = Buffer.alloc(headerSize)
  dir.writeUInt16LE(0, 0)
  dir.writeUInt16LE(1, 2)
  dir.writeUInt16LE(numImages, 4)

  let offset = headerSize
  pngs.forEach((p, i) => {
    const e = 6 + 16 * i
    dir[e] = p.size === 256 ? 0 : p.size
    dir[e + 1] = p.size === 256 ? 0 : p.size
    dir[e + 2] = 0; dir[e + 3] = 0
    dir.writeUInt16LE(1, e + 4)
    dir.writeUInt16LE(32, e + 6)
    dir.writeUInt32LE(p.data.length, e + 8)
    dir.writeUInt32LE(offset, e + 12)
    offset += p.data.length
  })
  return Buffer.concat([dir, ...pngs.map((p) => p.data)])
}

// ===== macOS ICNS (PNG-in-ICNS 多分辨率) =====
function encodeICNS(entries) {
  // entries: [{type: 'ic07', data: Buffer}, ...]
  const parts = entries.map((e) => {
    const head = Buffer.alloc(8)
    head.write(e.type, 0, 4, 'ascii')           // type code
    head.writeUInt32BE(e.data.length + 8, 4)   // size (BE) including this header
    return Buffer.concat([head, e.data])
  })
  const body = Buffer.concat(parts)
  const header = Buffer.alloc(8)
  header.write('icns', 0, 4, 'ascii')
  header.writeUInt32BE(body.length + 8, 4)      // total file size (BE)
  return Buffer.concat([header, body])
}

// ===== main =====
mkdirSync(BUILD, { recursive: true })

// Windows ICO
const icoSizes = [16, 32, 48, 64, 128, 256]
const icoBuf = encodeICO(icoSizes)
writeFileSync(join(BUILD, 'icon.ico'), icoBuf)
console.log(`✓ build/icon.ico  (${icoBuf.length} bytes, ${icoSizes.join('/')} px)`)

// Linux PNG
const linuxBuf = encodePNG(512, 512, generatePixels(512))
writeFileSync(join(BUILD, 'icon.png'), linuxBuf)
console.log(`✓ build/icon.png  (${linuxBuf.length} bytes, 512x512 px)`)

// macOS ICNS
const icnsEntries = [
  { type: 'ic07', data: encodePNG(128, 128, generatePixels(128)) }, // 128x128
  { type: 'ic08', data: encodePNG(256, 256, generatePixels(256)) }, // 256x256
  { type: 'ic09', data: encodePNG(512, 512, generatePixels(512)) }  // 512x512
]
const icnsBuf = encodeICNS(icnsEntries)
writeFileSync(join(BUILD, 'icon.icns'), icnsBuf)
console.log(`✓ build/icon.icns (${icnsBuf.length} bytes, 128/256/512 px)`)

console.log(`\n设计交付 build/icon-source.png 后,运行 npm run build-icons 用真实素材覆盖这些文件。`)
