# mjpg_streamer UDP 接入教程（客户端正式视频通道）

> 适用对象：需要在客户端（移动端/上位机/其他程序）接收并显示双路 2K MJPG
> 视频的开发者。这是**正式对接通道**，客户端按本文实现即可。
>
> 配套：板端启动 `./start_mjpg_streamer.sh start`；控制接口见
> [mjpg_streamer_控制接口手册.md](./mjpg_streamer_控制接口手册.md)。

---

## 1. 整体流程（顺序执行）

```
① 网络连通  →  ② 板端启动  →  ③ 客户端一键连接(/api/connect)
   →  ④ UDP 50010 收流  →  ⑤ 按24B头组帧  →  ⑥ JPEG解码显示
   →  ⑦ 退出时 /api/stop
```

---

## 2. 连接参数

| 项 | 值 | 说明 |
|----|-----|------|
| 传输 | UDP | 无连接，板子主动推 |
| 目标端口 | **50010**（默认，可改） | 客户端在此端口监听 |
| 数据报大小 | ≤ **1408 字节** = 24B 头 + ≤1384B JPEG 载荷 | 每帧切成多片发送 |
| 双路 | 同一端口，靠头的 `stream` 字段分流 | stream=0→cam1，1→cam2 |
| 协议版本 | **ver = 2** | 旧版(16B头)不兼容 |

客户端必须先让板子知道"推给谁"：调用 `POST /api/connect`（自动用请求方 IP 作目标）
或 `POST /api/config {"dst":"客户端IP"}`，然后 `POST /api/start`。

---

## 3. 24 字节协议头（大端序，每片一个）

| 偏移 | 大小 | 字段 | 类型 | 说明 |
|------|------|------|------|------|
| 0 | 2B | magic | u16 | 固定 `0x4D31`（"M1"），不匹配则丢弃 |
| 2 | 1B | ver | u8 | 协议版本 = **2** |
| 3 | 1B | stream | u8 | 0=cam1, 1=cam2 |
| 4 | 4B | seq | u32 | 帧序号，每路独立从 0 递增（回绕） |
| 8 | 2B | frag | u16 | 分片序号，从 0 开始 |
| 10 | 2B | total | u16 | 本帧总片数 |
| 12 | 2B | plen | u16 | 本片实际载荷字节数（≤1384） |
| 14 | 1B | flags | u8 | bit0=1：本片为该帧首片 |
| 15 | 1B | rsv | u8 | 保留=0 |
| 16 | 8B | pts | u64 | 帧时间戳（微秒，板卡单调时钟；**同一帧所有分片相同**） |

- Python 解析格式：`struct.Struct(">HBBIHHHBBQ")`
- C 结构体（packed，24B）：
```c
#pragma pack(push,1)
typedef struct {
    uint16_t magic;   // 0x4D31
    uint8_t  ver;     // 2
    uint8_t  stream;  // 0/1
    uint32_t seq;
    uint16_t frag;
    uint16_t total;
    uint16_t plen;
    uint8_t  flags;   // bit0=首片
    uint8_t  rsv;
    uint64_t pts;     // 微秒时间戳
} mjpg_udp_hdr_t;
#pragma pack(pop)
```

---

## 4. 组帧（还原 JPEG）算法

1. 以 `(stream, seq)` 为键缓存分片，`frag` 作下标存放载荷。
2. 收到片数 == `total` 时，按 `frag` 升序拼接 → 得到完整 JPEG 帧。
3. **乱序容忍**：乱序到达也按下标放，不影响组帧。
4. **重复片去重**：同一 `(stream, seq, frag)` 只取第一片。
5. **残帧超时**：1 秒未收齐的帧槽直接丢弃（防内存增长）。
6. **丢帧检测**：新帧 `seq != 上一完成帧 seq+1` 表示中间有帧丢失（残帧丢弃即可）。
7. **seq 回绕**：比较用 `(prev + 1) & 0xFFFFFFFF`。
8. **JPEG 校验（可选）**：整帧以 `FFD8` 开头、`FFD9` 结尾；个别帧头可能带前导字节，可先扫 `FFD8`。

参考伪代码：
```python
def on_dgram(dgram):
    hdr = parse_24B(dgram)                       # >HBBIHHHBBQ
    if hdr.magic != 0x4D31 or hdr.ver != 2: return
    key = (hdr.stream, hdr.seq)
    s = buf.get(key)
    if s is None:
        s = {"p": {}, "count": 0, "total": hdr.total, "pts": hdr.pts}
        buf[key] = s
    if hdr.frag not in s["p"]:
        s["p"][hdr.frag] = dgram[24:]
        s["count"] += 1
    if s["count"] >= s["total"]:
        jpeg = b"".join(s["p"][i] for i in sorted(s["p"]))
        del buf[key]
        decode_and_show(jpeg, hdr.stream, s["pts"])
```

---

## 5. PTS 时间戳的用途（可选但推荐）

- `pts` = 板卡单调时钟微秒（`time.monotonic_ns()//1000`），**每帧一个**（各片一致）。
- 用途：
  - **双路画面时间对齐**（cam1 与 cam2 的同一时刻帧）
  - **计算帧间隔**（相邻帧 pts 差 ≈ 帧周期）
  - 播放节奏控制（不依赖接收端时钟）
- 注意 pts 是相对值（板卡开机起算），不要与系统墙钟比较，只做相对计算。

---

## 6. 固定输出参数（客户端按此设计）

| 项 | 固定值 | 说明 |
|----|--------|------|
| 分辨率 | 2592 x 1944（2K/原画） | **固定，不接受调整** |
| 目标帧率 | 15fps | **固定，不接受调整** |
| 实际采集帧率 | ~16.6fps | 摄像头 2K 档硬件上限，以 `/api/status` 每路 `capture_fps` 为准 |

- 画面源固定为 2K@15fps，客户端**无需、也不能**向板端请求切换分辨率/帧率
  （已移除 `/api/mode` 等调整接口，`/api/config` 只能改 dst/port/frag）。
- 参考带宽（随场景内容变化，以 status `bytes_per_s` 为准）：
  单路约 2.4~4.4 MB/s，双路合计约 6.8 MB/s。

---

## 7. 完整接入示例

### 7.1 板端（RK3399）
```bash
./start_mjpg_streamer.sh start            # 启动服务（无需 --dst）
```

### 7.2 客户端连接（任意 HTTP 客户端）
```
POST http://<板卡IP>:8080/api/connect      # 一键：以请求方IP为目标并启动推流
# 或显式：
POST /api/config {"dst":"<客户端IP>","port":50010}
POST /api/start {"stream":"all"}
```
确认：`GET /api/status` → 每路 `streaming:true`、`dst` 为客户端 IP。

### 7.3 Python 参考实现
完整可直接运行的接收端在 `/home/rpdzkj/mjpg_udp_receiver.py`：

```bash
python3 mjpg_udp_receiver.py --host 0.0.0.0 --port 50010 [--save /tmp/recv]
```

### 7.4 Android（Kotlin）收流 + 组帧核心
```kotlin
val socket = DatagramSocket(50010)
socket.soTimeout = 2000
val buf = ByteArray(2048)
val frames = HashMap<String, FrameBuf>()   // "(stream,seq)" -> 分片缓存
while (running) {
    val pkt = DatagramPacket(buf, buf.size)
    socket.receive(pkt)
    val d = pkt.data.copyOf(pkt.length)
    // 大端解析24B头: magic/ver/stream/seq/frag/total/plen/flags/rsv/pts
    // 按 (stream,seq) 组帧, 收满 total 后拼接出 JPEG -> 交给解码线程
    // 满1秒未收齐的帧槽丢弃
}
```
> 收包前把 UDP 接收缓冲调大（同机/局域网突发不丢包），移动端可用大 SO_RCVBUF。

---

## 8. 常见问题

| 现象 | 原因 | 解决 |
|------|------|------|
| 收不到任何包 | 没 connect/start 或端口不对 | `POST /api/connect`；确认收 50010 |
| 大量丢帧 | 接收缓冲太小 | `sysctl -w net.core.rmem_max=16777216` + 大 SO_RCVBUF |
| 解出画面花屏 | 单帧丢片 | 检查网络质量；接受丢帧策略 |
| connect 后 dst 不是客户端IP | 经过 NAT/代理 | 用 `/api/config` 显式指定客户端IP |
| 收到 ver=1 老数据 | 板端/客户端版本不一致 | 两端都升级到 ver=2（24B 头） |
