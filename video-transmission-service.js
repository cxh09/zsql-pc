// 数字图传 UDP 接收服务 (主进程)
//
// 职责:
//  1. 绑定本地 UDP 端口接收板卡推送的 MJPG 分片数据报(24B 协议头,见 UDP图传.md)
//  2. 按 (stream, seq) 组帧还原 JPEG
//  3. 通过本地 HTTP 服务对外提供控制接口(/api/connect /api/stop /api/ping /api/status)
//     与 /stream 二进制流(帧头 1B stream + 4B 长度 + JPEG 载荷)
//  4. 代理转发板卡 HTTP 控制请求(/api/connect /api/stop 等)
//
// 为什么用本地 HTTP 而非 IPC: 图传页面运行在 <webview> 中,是无 preload 的独立
// HTML,无法访问 window.electronAPI;而浏览器页面可以正常 fetch 127.0.0.1 的
// 本地服务,因此这里以标准 HTTP 协议与页面通信,保持页面完全独立。

const dgram = require('dgram')
const http = require('http')
const net = require('net')

const PROTOCOL = { MAGIC: 0x4d31, VERSION: 2, HEADER_LEN: 24 }
const DEFAULT_CONTROL_PORT = 50110
const FRAME_TIMEOUT_MS = 1000
const MAX_FRAME_SLOTS = 64
const IDLE_STOP_DELAY_MS = 5000

let controlServer = null
let controlPort = 0
let udpSocket = null
let udpPort = 0
let boardTarget = null // { boardIp, boardPort }
let udpBindError = null

// 组帧槽: `${stream}:${seq}` -> { frags: Map<frag, Buffer>, total, firstSeen }
const frameSlots = new Map()
let cleanupTimer = null

// /stream 客户端(res 对象)
const streamClients = new Set()
let idleStopTimer = null

const stats = {
  startedAt: 0,
  perStream: {
    0: { frames: 0, bytes: 0 },
    1: { frames: 0, bytes: 0 }
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

function json(res, code, data) {
  const body = JSON.stringify(data)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    ...CORS_HEADERS,
    'Cache-Control': 'no-store'
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      chunks.push(c)
      size += c.length
      if (size > 1e6) {
        req.destroy()
        resolve(null)
        return
      }
    })
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve(null))
  })
}

// 代理请求板卡 HTTP 控制接口
function proxyRequest(host, port, path, body) {
  return new Promise((resolve) => {
    const payload = body == null ? null : Buffer.from(JSON.stringify(body))
    const req = http.request(
      {
        host,
        port,
        path,
        method: 'POST',
        timeout: 5000,
        headers: payload
          ? { 'Content-Type': 'application/json', 'Content-Length': payload.length }
          : {}
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: Buffer.concat(chunks).toString('utf8').slice(0, 2000)
          })
        })
        res.on('error', () => resolve({ ok: false, status: 0, text: 'proxy-response-error' }))
      }
    )
    req.on('error', (e) => resolve({ ok: false, status: 0, text: e.message }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false, status: 0, text: 'proxy-timeout' })
    })
    if (payload) req.write(payload)
    req.end()
  })
}

// ========== UDP 收流 ==========

function onDatagram(msg) {
  if (msg.length < PROTOCOL.HEADER_LEN) return
  if (msg.readUInt16BE(0) !== PROTOCOL.MAGIC) return
  if (msg.readUInt8(2) !== PROTOCOL.VERSION) return
  const stream = msg.readUInt8(3)
  if (stream !== 0 && stream !== 1) return
  const seq = msg.readUInt32BE(4)
  const frag = msg.readUInt16BE(8)
  const total = msg.readUInt16BE(10)
  const plen = Math.min(msg.readUInt16BE(12), msg.length - PROTOCOL.HEADER_LEN)

  const key = `${stream}:${seq}`
  let slot = frameSlots.get(key)
  if (!slot) {
    if (frameSlots.size >= MAX_FRAME_SLOTS) return // 槽满直接丢,防内存增长
    slot = { frags: new Map(), total, firstSeen: Date.now() }
    frameSlots.set(key, slot)
  }
  if (slot.frags.has(frag)) return // 重复片去重
  slot.frags.set(frag, msg.subarray(PROTOCOL.HEADER_LEN, PROTOCOL.HEADER_LEN + plen))

  if (slot.frags.size >= total) {
    const parts = []
    for (let i = 0; i < total; i++) {
      const p = slot.frags.get(i)
      if (!p) {
        frameSlots.delete(key)
        return
      }
      parts.push(p)
    }
    const jpeg = Buffer.concat(parts)
    frameSlots.delete(key)
    stats.perStream[stream].frames += 1
    stats.perStream[stream].bytes += jpeg.length
    broadcastFrame(stream, jpeg)
  }
}

function bindUdp(port) {
  if (udpSocket && udpPort === port) return Promise.resolve({ ok: true, port })
  closeUdp()
  udpBindError = null
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4')
    socket.on('message', onDatagram)
    socket.on('error', (e) => {
      udpBindError = e.message
      if (udpSocket === socket) {
        udpSocket = null
        frameSlots.clear()
        stopCleanupTimer()
      }
      try { socket.close() } catch (_) { /* ignore */ }
    })
    socket.once('listening', () => {
      udpSocket = socket
      udpPort = port
      stats.startedAt = Date.now()
      stats.perStream = { 0: { frames: 0, bytes: 0 }, 1: { frames: 0, bytes: 0 } }
      startCleanupTimer()
      clearTimeout(idleStopTimer)
      resolve({ ok: true, port })
    })
    socket.once('error', (e) => {
      if (socket !== udpSocket) resolve({ ok: false, error: e.message })
    })
    socket.bind(port, '0.0.0.0')
  })
}

function closeUdp() {
  if (udpSocket) {
    try { udpSocket.close() } catch (_) { /* ignore */ }
    udpSocket = null
  }
  udpPort = 0
  boardTarget = null
  frameSlots.clear()
  stopCleanupTimer()
}

// 无 /stream 客户端后延迟停止,避免关闭标签页后 UDP 端口残留
function scheduleIdleStop() {
  clearTimeout(idleStopTimer)
  idleStopTimer = setTimeout(() => {
    if (streamClients.size > 0 || !udpSocket) return
    const target = boardTarget
    closeUdp()
    if (target) proxyRequest(target.boardIp, target.boardPort, '/api/stop', null) // 尽量通知板卡停止
  }, IDLE_STOP_DELAY_MS)
}

function startCleanupTimer() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, slot] of frameSlots) {
      if (now - slot.firstSeen > FRAME_TIMEOUT_MS) frameSlots.delete(key)
    }
  }, 500)
  if (cleanupTimer.unref) cleanupTimer.unref()
}

function stopCleanupTimer() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

// ========== 帧转发 (/stream) ==========

function broadcastFrame(stream, jpeg) {
  const header = Buffer.allocUnsafe(5)
  header[0] = stream
  header.writeUInt32BE(jpeg.length, 1)
  const chunk = Buffer.concat([header, jpeg])
  for (const client of streamClients) {
    if (client._vtPaused) continue
    const ok = client.write(chunk)
    if (!ok) client._vtPaused = true // 客户端消费慢时暂停,由 drain 恢复
  }
}

// ========== HTTP 控制 ==========

async function handleRequest(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1')
  const path = url.pathname

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS)
    res.end()
    return
  }

  if (req.method === 'GET' && path === '/api/ping') {
    json(res, 200, {
      ok: true,
      service: 'video-transmission',
      port: controlPort,
      connected: !!udpSocket,
      bindError: udpBindError
    })
    return
  }

  if (req.method === 'POST' && path === '/api/connect') {
    const body = (await readBody(req)) || {}
    const boardIp = String(body.boardIp || '192.168.29.10').trim()
    const boardPort = Number(body.boardPort || 8080)
    const targetPort = Number(body.udpPort || 50010)
    if (!net.isIP(boardIp)) {
      json(res, 400, { ok: false, error: 'invalid-board-ip' })
      return
    }
    const bind = await bindUdp(targetPort)
    if (!bind.ok) {
      json(res, 500, { ok: false, error: 'udp-bind-failed', detail: bind.error })
      return
    }
    boardTarget = { boardIp, boardPort }
    clearTimeout(idleStopTimer)

    // 显式指定 dst 时走 /api/config + /api/start;否则一键 /api/connect
    let boardResult
    if (body.dst) {
      const cfg = await proxyRequest(boardIp, boardPort, '/api/config', {
        dst: String(body.dst),
        port: targetPort
      })
      if (!cfg.ok) {
        json(res, 502, { ok: false, error: 'board-config-failed', detail: cfg })
        return
      }
      boardResult = await proxyRequest(boardIp, boardPort, '/api/start', {
        stream: String(body.stream || 'all')
      })
    } else {
      boardResult = await proxyRequest(boardIp, boardPort, '/api/connect', null)
    }
    if (!boardResult.ok) {
      json(res, 502, { ok: false, error: 'board-connect-failed', status: boardResult.status, detail: boardResult.text })
      return
    }
    json(res, 200, { ok: true, udpPort: targetPort, board: boardResult })
    return
  }

  if (req.method === 'POST' && path === '/api/stop') {
    const target = boardTarget
    const stopResult = target
      ? await proxyRequest(target.boardIp, target.boardPort, '/api/stop', null)
      : null
    closeUdp()
    json(res, 200, { ok: true, board: stopResult })
    return
  }

  if (req.method === 'GET' && path === '/api/status') {
    json(res, 200, {
      ok: true,
      connected: !!udpSocket,
      udpPort,
      bindError: udpBindError,
      board: boardTarget,
      streamClients: streamClients.size,
      stats
    })
    return
  }

  if (req.method === 'GET' && path === '/stream') {
    res._vtPaused = false
    streamClients.add(res)
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      ...CORS_HEADERS,
      'Cache-Control': 'no-cache'
    })
    // 立即发送响应头,否则客户端 fetch 要等首帧到达才收到 headers
    res.flushHeaders()
    res.on('drain', () => {
      res._vtPaused = false
    })
    const detach = () => {
      streamClients.delete(res)
      res._vtPaused = true
      if (streamClients.size === 0) scheduleIdleStop()
    }
    res.on('close', detach)
    res.on('error', detach)
    return
  }

  json(res, 404, { ok: false, error: 'not-found' })
}

// ========== 服务生命周期 ==========

function startService(port = DEFAULT_CONTROL_PORT) {
  if (controlServer) return Promise.resolve({ ok: true, port: controlPort })
  const server = http.createServer(handleRequest)
  return new Promise((resolve) => {
    server.once('error', (e) => resolve({ ok: false, error: e.message }))
    server.listen(port, '127.0.0.1', () => {
      controlServer = server
      controlPort = port
      resolve({ ok: true, port })
    })
  })
}

function stopService() {
  clearTimeout(idleStopTimer)
  stopCleanupTimer()
  closeUdp()
  for (const client of streamClients) {
    try { client.end() } catch (_) { /* ignore */ }
  }
  streamClients.clear()
  if (controlServer) {
    try { controlServer.close() } catch (_) { /* ignore */ }
    controlServer = null
    controlPort = 0
  }
}

module.exports = { startService, stopService }
