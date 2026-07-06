# 原生应用图标目录

本目录用于存放 electron-builder 打包所需的**原生平台图标**资源。

> ⚠️ 这些图标**不会**通过修改任何现有 SVG 的方式来生成。
> 它们的视觉风格(颜色/stroke/path)与 `pages/icon-*.svg` **完全独立**,由设计团队单独交付。

## 文件说明

| 文件 | 平台 | 状态 | 用途 |
|---|---|---|---|
| `icon.ico` | Windows | ✅ 占位已生成 | 多分辨率 PNG-in-ICO,适合 Windows 7+ |
| `icon.png` | Linux | ✅ 占位已生成 | 512×512 PNG,适合 deb/tar.gz 桌面图标 |
| `icon.icns` | macOS | ✅ 占位已生成 | 多分辨率 PNG-in-ICNS,适合 macOS 10.7+ |
| `icon-source.png` | - | ❌ 等待设计 | 设计交付的 1024×1024 源 PNG(可选) |

**当前占位图**: 蓝底白字 "Z" (#0052d9 项目主色),与 `public/favicon.svg` 风格一致。

## 三种使用场景

### 场景 1: 立即构建(占位图已就位)

```bash
npm run build:win    # ✅ 使用 build/icon.ico 占位图,产物带 ZSQL 风格图标
npm run build:mac    # ✅ 使用 build/icon.icns 占位图
npm run build:linux  # ✅ 使用 build/icon.png 占位图
```

直接可用。适合内部构建、CI 验证、demo 演示。

### 场景 2: 设计交付后用真实图标覆盖

```bash
# 1. 设计交付 build/icon-source.png (1024×1024 透明 PNG)
# 2. 安装 sharp 与 to-ico(可选,脚本内有提示)
npm install --save-dev sharp to-ico
# 3. 一键生成三平台图标(覆盖占位)
npm run build-icons
# 4. 验证
npm run check-icons  # 退出码 0
```

### 场景 3: 手工调整(不通过脚本)

直接用 ImageMagick / png2icns / icoFx 等工具替换 `build/icon.{ico,icns,png}` 即可。文件名不变,无需改其他配置。

## 重新生成占位图

如果占位图被误删或需要调整:

```bash
npm run gen-placeholder-icons
# 输出:
#   build/icon.ico  (885 bytes, 16/32/48/64/128/256 px)
#   build/icon.png  (1090 bytes, 512x512 px)
#   build/icon.icns (1587 bytes, 128/256/512 px)
```

## 验证

```bash
npm run check-icons
# 期望输出: "All icon resources OK" 退出码 0
# CI: .github/workflows/build.yml 已集成
```

## 当前状态 (2026-07-05)

- [x] `icon.ico` 占位已生成
- [x] `icon.png` 占位已生成
- [x] `icon.icns` 占位已生成
- [x] `npm run check-icons` 退出码 0
- [ ] `icon-source.png` 等待设计交付
- [ ] 三平台打包产物使用真实设计图标(等 `npm run build-icons`)

## 解锁真实图标 Checklist

- [ ] 设计团队交付 `build/icon-source.png` (1024×1024 透明 PNG,产品 logo)
- [ ] `npm install --save-dev sharp to-ico`
- [ ] `npm run build-icons` 成功生成三平台图标(覆盖占位)
- [ ] `npm run check-icons` 仍退出码 0
- [ ] 三平台打包 (`build:win` / `build:mac` / `build:linux`) 全部成功
- [ ] Windows 安装包图标与设计稿一致
- [ ] macOS DMG 挂载后 app 图标与设计稿一致
- [ ] Linux deb/tar.gz 桌面图标与设计稿一致
