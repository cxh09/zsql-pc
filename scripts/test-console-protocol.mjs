// scripts/test-console-protocol.mjs
// 验证控制台协议实现:控制帧字节序、CRC8、MPU 帧解析、帧流状态机
// 用法: node scripts/test-console-protocol.mjs
import net from 'node:net'

// ==================== 与 pages/console.html 完全相同的协议实现 ====================
function crc8(buf) {
  let x = 0
  for (let i = 0; i < buf.length - 1; i++) x ^= buf[i]
  return x & 0xFF
}
function clampInt8(v) {
  v = Math.round(v)
  if (v > 127) return 127
  if (v < -128) return -128
  return v & 0xFF
}
function buildCtrlFrame({ cmd = 0x10, speed = 0, yaw = 0, remote_light = 0, remote_dir = 0, flags = 0 } = {}) {
  const buf = new Uint8Array(16)
  buf[0]  = 0xAA
  buf[1]  = 0x55
  buf[2]  = cmd & 0xFF
  buf[3]  = clampInt8(speed)
  buf[4]  = clampInt8(yaw)
  buf[5]  = remote_light & 0xFF
  buf[6]  = remote_dir & 0xFF
  buf[7]  = 0
  buf[8]  = 0
  buf[9]  = 0
  buf[10] = flags & 0xFF
  buf[11] = 0; buf[12] = 0; buf[13] = 0; buf[14] = 0
  buf[15] = crc8(buf)
  return buf
}
function buildMpuFrame(type, ax, ay, az, gx, gy, gz) {
  const buf = new Uint8Array(16)
  const dv = new DataView(buf.buffer)
  buf[0] = 0xBB; buf[1] = 0x66; buf[2] = type & 0xFF
  dv.setInt16(3, ax, true)
  dv.setInt16(5, ay, true)
  dv.setInt16(7, az, true)
  dv.setInt16(9, gx, true)
  dv.setInt16(11, gy, true)
  dv.setInt16(13, gz, true)
  buf[15] = crc8(buf)
  return buf
}
class FrameParser {
  constructor() { this.buf = new Uint8Array(0); this.frames = []; this.errors = 0 }
  push(chunk) {
    const merged = new Uint8Array(this.buf.length + chunk.length)
    merged.set(this.buf, 0); merged.set(chunk, this.buf.length)
    this.buf = merged
    let i = 0
    while (i < this.buf.length) {
      if (this.buf[i] !== 0xAA && this.buf[i] !== 0xBB) { i++; continue }
      if (i + 1 >= this.buf.length) { this.buf = this.buf.slice(i); return }
      const h0 = this.buf[i], h1 = this.buf[i + 1]
      if (i + 16 > this.buf.length) { this.buf = this.buf.slice(i); return }
      const frame = this.buf.slice(i, i + 16)
      if (crc8(frame) === frame[15]) this.frames.push(frame)
      else this.errors++
      i += 16
    }
    this.buf = new Uint8Array(0)
  }
}

// ==================== 测试 ====================
let pass = 0, fail = 0
function check(name, cond, extra) {
  if (cond) { console.log('  ✓', name); pass++ }
  else { console.log('  ✗', name, extra || ''); fail++ }
}
function hex(u8) { return Array.from(u8).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ') }

console.log('\n=== Test 1: 控制帧字节序 (speed=+60, yaw=-20, flags=0x03) ===')
{
  const f = buildCtrlFrame({ cmd: 0x10, speed: 60, yaw: -20, remote_light: 1, remote_dir: 2, flags: 0x03 })
  check('HEAD0 = 0xAA', f[0] === 0xAA)
  check('HEAD1 = 0x55', f[1] === 0x55)
  check('cmd = 0x10',   f[2] === 0x10)
  check('speed = 60',   f[3] === 60)
  check('yaw = -20 → 0xEC', f[4] === (0xFF & -20), `actual: 0x${f[4].toString(16)}`)
  check('remote_light = 1', f[5] === 1)
  check('remote_dir = 2',   f[6] === 2)
  check('reserved 7 = 0',   f[7] === 0)
  check('reserved 8 = 0',   f[8] === 0)
  check('reserved 9 = 0',   f[9] === 0)
  check('flags = 0x03',     f[10] === 0x03)
  check('reserved 11-14 = 0', f[11] === 0 && f[12] === 0 && f[13] === 0 && f[14] === 0)
  check('CRC8 正确', f[15] === crc8(f), `actual: 0x${f[15].toString(16)}, expected: 0x${crc8(f).toString(16)}`)
  console.log('  frame:', hex(f))
}

console.log('\n=== Test 2: 边界值 (speed=+127, speed=-128) ===')
{
  const f1 = buildCtrlFrame({ speed: 127 })
  check('speed=127 编码正确', f1[3] === 0x7F)
  const f2 = buildCtrlFrame({ speed: -128 })
  check('speed=-128 编码为 0x80', f2[3] === 0x80)
  const f3 = buildCtrlFrame({ speed: 200 })  // 越界,应被截断为 127
  check('speed=200 越界 → 127', f3[3] === 0x7F)
  const f4 = buildCtrlFrame({ speed: -200 })  // 越界
  check('speed=-200 越界 → -128 → 0x80', f4[3] === 0x80)
}

console.log('\n=== Test 3: MPU 帧字节序 (本地 type=0x01, 全零数据) ===')
{
  const f = buildMpuFrame(0x01, 0, 0, 0, 0, 0, 0)
  check('HEAD0 = 0xBB', f[0] === 0xBB)
  check('HEAD1 = 0x66', f[1] === 0x66)
  check('type = 0x01', f[2] === 0x01)
  check('ax..gz 全零', f[3] === 0 && f[4] === 0 && f[13] === 0 && f[14] === 0)
  check('CRC8 正确', f[15] === crc8(f))
}
console.log('\n=== Test 4: MPU 帧 int16 LE (ax=1, gy=-100) ===')
{
  const f = buildMpuFrame(0x02, 1, 0, 0, 0, -100, 0)
  check('ax=1 → LE 0x01 0x00', f[3] === 0x01 && f[4] === 0x00)
  check('gy=-100 → LE 0x9C 0xFF', f[11] === 0x9C && f[12] === 0xFF, `actual: 0x${f[11].toString(16)} 0x${f[12].toString(16)}`)
  check('CRC8 正确', f[15] === crc8(f))
  // 用 DataView 读回
  const dv = new DataView(f.buffer, f.byteOffset, f.byteLength)
  check('回读 ax = 1', dv.getInt16(3, true) === 1)
  check('回读 gy = -100', dv.getInt16(11, true) === -100)
}

console.log('\n=== Test 5: 命令帧字节 (急停 0x20, 重启 0x30, 关机 0x40) ===')
{
  check('急停 0x20', buildCtrlFrame({ cmd: 0x20 })[2] === 0x20)
  check('重启 0x30', buildCtrlFrame({ cmd: 0x30 })[2] === 0x30)
  check('关机 0x40', buildCtrlFrame({ cmd: 0x40 })[2] === 0x40)
}

console.log('\n=== Test 6: 帧流解析 (分片 TCP 数据) ===')
{
  const parser = new FrameParser()
  const f1 = buildCtrlFrame({ speed: 30, yaw: 10 })
  const f2 = buildMpuFrame(0x01, 100, 200, -300, 50, -50, 25)
  const f3 = buildMpuFrame(0x02, -100, 0, 16384, 0, 0, 0)
  const stream = new Uint8Array(f1.length + f2.length + f3.length)
  stream.set(f1, 0); stream.set(f2, f1.length); stream.set(f3, f1.length + f2.length)
  // 模拟 TCP 分片: 按 5 字节切
  for (let i = 0; i < stream.length; i += 5) {
    parser.push(stream.slice(i, Math.min(i + 5, stream.length)))
  }
  check('3 帧全部解析', parser.frames.length === 3, `actual: ${parser.frames.length}`)
  check('0 CRC 错误', parser.errors === 0, `errors: ${parser.errors}`)
}

console.log('\n=== Test 7: 帧流解析 (半包 → 下次继续) ===')
{
  const parser = new FrameParser()
  const f = buildCtrlFrame({ speed: 50 })
  parser.push(f.slice(0, 8))  // 半包
  check('半包未出帧 (frames=0)', parser.frames.length === 0)
  parser.push(f.slice(8))      // 续包
  check('续包后出帧 (frames=1)', parser.frames.length === 1)
}

console.log('\n=== Test 8: TCP mock server 端到端 (启动 server + 模拟 console.html 客户端逻辑) ===')
async function mockServerTest() {
  return new Promise((resolve) => {
    const PORT = 18080
    const received = []
    const server = net.createServer((sock) => {
      console.log(`  [mock-server] 客户端已连接 ${sock.remoteAddress}:${sock.remotePort}`)
      sock.on('data', (buf) => {
        const parser = new FrameParser()
        parser.push(new Uint8Array(buf))
        for (const f of parser.frames) {
          received.push({ cmd: f[2], speed: f[3], yaw: f[4], flags: f[10] })
        }
        // 模拟主控 20Hz 推送 MPU 帧
        let count = 0
        const intv = setInterval(() => {
          if (sock.destroyed) { clearInterval(intv); return }
          if (count++ > 5) { clearInterval(intv); return }
          sock.write(buildMpuFrame(0x01, count*100, -count*50, 16384, 0, 0, 0))
        }, 50)
      })
      sock.on('close', () => {
        console.log(`  [mock-server] 客户端断开,共收到 ${received.length} 个控制帧`)
        console.log('  收到:', JSON.stringify(received))
        server.close()
        resolve()
      })
    })
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`  [mock-server] 监听 127.0.0.1:${PORT}`)
      // 模拟 console.html 客户端
      const client = net.createConnection({ host: '127.0.0.1', port: PORT })
      const clientParser = new FrameParser()
      let rxMpuCount = 0
      client.on('connect', () => {
        console.log('  [mock-client] 已连接')
        // 发送 3 个控制帧
        client.write(buildCtrlFrame({ cmd: 0x10, speed: 30, yaw: 10, flags: 0x03 }))
        client.write(buildCtrlFrame({ cmd: 0x10, speed: -50, yaw: 0, flags: 0x01 }))
        client.write(buildCtrlFrame({ cmd: 0x20 }))  // 急停
      })
      client.on('data', (buf) => {
        clientParser.push(new Uint8Array(buf))
        for (const f of clientParser.frames) {
          if (f[0] === 0xBB) rxMpuCount++
        }
      })
      setTimeout(() => {
        check('mock-client 收到 MPU 帧 > 0', rxMpuCount > 0, `rxMpu: ${rxMpuCount}`)
        check('mock-server 收到 3 个控制帧', received.length === 3, `actual: ${received.length}`)
        check('第 1 帧 cmd=0x10 speed=30', received[0]?.cmd === 0x10 && received[0]?.speed === 30)
        check('第 2 帧 cmd=0x10 speed=-50', received[1]?.speed === (0xFF & -50))
        check('第 3 帧 cmd=0x20 (急停)', received[2]?.cmd === 0x20)
        client.end()
      }, 500)
    })
  })
}
await mockServerTest()

console.log(`\n=== 结果: ${pass} passed, ${fail} failed ===\n`)
process.exit(fail === 0 ? 0 : 1)
