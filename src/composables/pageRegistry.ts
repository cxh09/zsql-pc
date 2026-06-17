// 页面元数据注册表 - 图标与页面元数据的单一真值来源 (Single Source of Truth)
// 业务侧 (useTabs / useSearch / tab-window.html) 应当从这里读取元数据,
// 不再各自维护 ICON_MAP / AVAILABLE_PAGES / 内联 iconMap。

export type IconName =
  | 'home'
  | 'file'
  | 'settings'
  | 'message'
  | 'browser'
  | 'user'
  | 'doc'
  | 'navigation'
  | 'network'
  | 'globe'
  | 'webcam'

export interface PageMeta {
  key: string
  title: string
  url: string
  icon: IconName
  description?: string
  keywords?: string[]
  /** URL 标准化匹配规则:当 url 字段不能精确匹配时使用,例如 application-detail.html?id=xxx */
  urlMatcher?: RegExp
}

export const PAGE_REGISTRY: PageMeta[] = [
  {
    key: 'dashboard',
    title: '主页',
    url: './pages/dashboard.html',
    icon: 'home',
    description: '工作台主页面,查看概览数据',
    keywords: ['首页', '主页面', '工作台', 'home']
  },
  {
    key: 'applications',
    title: '预约查看',
    url: './pages/applications.html',
    icon: 'file',
    description: '查看和管理所有预约申请',
    keywords: ['预约', '申请', '列表', 'application']
  },
  {
    key: 'applicationDetail',
    title: '预约详情',
    url: './pages/application-detail.html',
    icon: 'doc',
    description: '查看单条预约详情',
    keywords: ['预约', '详情', 'application detail'],
    urlMatcher: /application-detail\.html/i
  },
  {
    key: 'customerService',
    title: '客户会话',
    url: 'https://chatbot.weixin.qq.com/@ideaaaf6b/platform/statistic/customerService',
    icon: 'message',
    description: '微信客服聊天会话管理',
    keywords: ['客服', '会话', '聊天', '客户', 'message']
  },
  {
    key: 'browser',
    title: '浏览器',
    url: './pages/browser.html',
    icon: 'browser',
    description: '内置浏览器,访问任意网页',
    keywords: ['浏览器', '网页', 'browser']
  },
  {
    key: 'navigation',
    title: '路线规划',
    url: './pages/navigation.html',
    icon: 'navigation',
    description: '地图与路线规划',
    keywords: ['地图', '导航', '路线', '规划', 'navigation']
  },
  {
    key: 'videoTransmission',
    title: '数字图传',
    url: './pages/video-transmission.html',
    icon: 'webcam',
    description: '通过 WebRTC 播放 RTSP 实时视频流',
    keywords: ['图传', '视频', '监控', 'RTSP', 'WebRTC', 'webcam']
  },
  {
    key: 'account',
    title: '账户信息',
    url: './pages/account.html',
    icon: 'user',
    description: '查看和编辑个人账户信息',
    keywords: ['账户', '个人', '资料', 'account', 'user']
  },
  {
    key: 'settings',
    title: '系统设置',
    url: './pages/settings.html',
    icon: 'settings',
    description: '系统偏好与全局设置',
    keywords: ['设置', '系统设置', '偏好', 'settings']
  },
  {
    key: 'changelog',
    title: '更新日志',
    url: './pages/changelog.html',
    icon: 'file',
    description: '查看应用版本更新历史',
    keywords: ['更新', '日志', '版本', 'changelog']
  },
  {
    key: 'networkDiagnosis',
    title: '网络质量监测',
    url: './pages/network-diagnosis.html',
    icon: 'network',
    description: '检测网络连接质量与延迟',
    keywords: ['网络', '监测', '诊断', 'network']
  },
  {
    key: 'agreement',
    title: '用户协议',
    url: './pages/agreement.html?tab=agreement',
    icon: 'doc',
    description: '查看用户协议',
    keywords: ['协议', '用户协议', 'agreement'],
    urlMatcher: /agreement\.html\?tab=agreement/i
  },
  {
    key: 'privacy',
    title: '隐私政策',
    url: './pages/agreement.html?tab=privacy',
    icon: 'doc',
    description: '查看隐私政策',
    keywords: ['隐私', '政策', 'privacy'],
    urlMatcher: /agreement\.html\?tab=privacy/i
  }
]

// 图标文件名映射。所有 icon 都基于 pages/ 目录下的同名 SVG 资源。
const ICON_FILES: Record<IconName, string> = {
  home: 'icon-home.svg',
  file: 'icon-file.svg',
  settings: 'icon-settings.svg',
  message: 'icon-message.svg',
  browser: 'icon-browser.svg',
  user: 'icon-user.svg',
  doc: 'icon-doc.svg',
  navigation: 'icon-navigation.svg',
  network: 'icon-network.svg',
  globe: 'icon-globe.svg',
  webcam: 'icon-webcam.svg'
}

/**
 * 标准化 URL 字符串以便比较。
 * - file:// URL 走 URL API 取 pathname(失去 query/hash,需由 urlMatcher 兜底)
 * - 其他形式直接去掉前导 "./" 或 "/"
 */
function normalizeUrlPath(url: string): string {
  if (/^file:/i.test(url)) {
    try {
      return new URL(url).pathname.replace(/^\/+/, '')
    } catch {
      return url.replace(/^\.\//, '').replace(/^\/+/, '')
    }
  }
  return url.replace(/^\.\//, '').replace(/^\/+/, '')
}

/**
 * 根据 icon 名返回 SVG 资源路径。
 * 主窗口上下文默认 basePath='/pages/',tab-window.html 中应传 '../pages/'。
 * 未知 icon 名回退为 globe 图标。
 */
export function getIconPath(name: IconName, basePath: string = '/pages/'): string {
  const fileName = ICON_FILES[name]
  if (!fileName) {
    return getIconPath('globe', basePath)
  }
  return `${basePath}${fileName}`
}

/**
 * 在 PAGE_REGISTRY 中按 key 查找条目。
 */
export function resolveByKey(key: string): PageMeta | undefined {
  return PAGE_REGISTRY.find((entry) => entry.key === key)
}

/**
 * 在 PAGE_REGISTRY 中按 URL 查找条目。
 * - 优先做标准化后的 endsWith 精确匹配(覆盖 file:// 绝对路径、http(s) 完整 URL 等形式)
 * - 未命中则遍历 urlMatcher 正则,对带 query 的 URL(如 application-detail.html?id=xxx)进行兜底
 */
export function resolveByUrl(url: string): PageMeta | undefined {
  const normalizedInput = normalizeUrlPath(url)
  for (const entry of PAGE_REGISTRY) {
    if (normalizedInput.endsWith(normalizeUrlPath(entry.url))) {
      return entry
    }
  }
  for (const entry of PAGE_REGISTRY) {
    if (entry.urlMatcher && entry.urlMatcher.test(url)) {
      return entry
    }
  }
  return undefined
}
