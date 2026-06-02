# CAMMOV 鏡頭路徑整合 Design Spec

**Date:** 2026-05-28  
**Goal:** 從 PC 版 Virtua Cop 2 的 CAMMOV*.BIN 提取逐幀鏡頭資料，取代手刻的 6 點 CatmullRom 路徑，實現與原版一致的鏡頭移動和轉向。同時修復準星缺失與場景過暗問題。

---

## 1. CAMMOV 二進制格式

每幀 **16 bytes**，合計 4 × float32：

```
offset 0:  float32  x          世界座標 X
offset 4:  float32  y          世界座標 Y
offset 8:  float32  z          世界座標 Z
offset 12: int16    yaw        偏航角，單位：int16 / 32768 × 180°
           int16    pitch      俯仰角，同單位（通常接近 0）
```

### 檔案對應關卡

| 檔案 | 幀數 | 對應 |
|------|------|------|
| CAMMOV0.BIN | 9,118 | Stage 1 |
| CAMMOV1.BIN | 10,000 | Stage 2 |
| CAMMOV2.BIN | 4,200 | Stage 3 |
| CAMMOV3.BIN | 175 | Stage 1 Boss 序列（暫不使用） |

### 座標系轉換（原始 → Three.js）

```javascript
threejs_x   = -cammov_x      // 與模型提取相同，X 取負
threejs_y   =  cammov_y
threejs_z   =  cammov_z
threejs_yaw = -yaw_degrees   // X 反轉 → yaw 跟著反轉
threejs_pitch = pitch_degrees
```

yaw=0 對應原始遊戲的預設朝向（+Z 軸方向）。

---

## 2. 資料管線

### 新增工具（`tools/extract-stage-assets/`）

```
lib/camera-reader.mjs          讀取 CAMMOV*.BIN，回傳 frame 陣列
extract-camera.mjs             CLI：輸出 game/public/assets/stageN/camera.bin
test/camera-reader.test.mjs    合成 BIN 的單元測試
```

### 輸出格式（`game/public/assets/stageN/camera.bin`）

```
header (8 bytes):
  uint32  frameCount
  uint32  fps = 30

per-frame (20 bytes × frameCount):
  float32  x
  float32  y
  float32  z
  float32  yaw_rad    (弧度，已完成座標系轉換)
  float32  pitch_rad  (弧度)
```

選擇 20-byte per-frame 而非 16-byte 是為了避免在 Three.js 端做角度換算，直接存弧度。

Stage 1 大小：8 + 9118 × 20 = **182,368 bytes ≈ 178 KB**  
3 個關卡合計 ≈ **530 KB**

---

## 3. CameraRig 重構

### 舊架構

```
CatmullRomCurve3(6 個手刻點)
progress: number [0-1]
advance(dt): progress += dt / duration → getPoint(progress) → lookAt(tangent)
```

### 新架構

```
frames: Float32Array  (x,y,z,yaw_rad,pitch_rad 連續排列)
frameCount: number
fps: number = 30
accumSec: number = 0   (累計秒數，用於幀索引計算)
```

`advance(dt)` 實作：

```javascript
advance(dt) {
  if (this.paused) return
  this.accumSec += dt
  const rawFrame = this.accumSec * this.fps
  const f0 = Math.min(Math.floor(rawFrame), this.frameCount - 1)
  const f1 = Math.min(f0 + 1,              this.frameCount - 1)
  const t  = rawFrame - Math.floor(rawFrame)   // 幀內插值 [0,1)

  // lerp 位置
  const p0 = f0 * 5, p1 = f1 * 5
  const x = lerp(frames[p0],   frames[p1],   t)
  const y = lerp(frames[p0+1], frames[p1+1], t)
  const z = lerp(frames[p0+2], frames[p1+2], t)

  // slerp 旋轉（以 Euler YXZ 轉 Quaternion 再 slerp）
  const q0 = eulerToQuat(frames[p0+3], frames[p0+4])
  const q1 = eulerToQuat(frames[p1+3], frames[p1+4])
  const q  = q0.slerp(q1, t)

  this.camera.position.set(x, y, z)
  this.camera.quaternion.copy(q)
}
```

`pause()` / `resume()` / `reset()` 介面不變，`main.js` 不需修改。

### Fallback

若 `camera.bin` 載入失敗（例如 Stage 2/3 資產尚未提取），退回舊的 CatmullRom 模式（從 `stage*.json` 的 `railPath` 讀取）。

---

## 4. 資料載入（`game/src/render/CameraPathLoader.js`）

```javascript
export async function loadCameraPath(stageId) {
  const url = `/assets/${stageId}/camera.bin`
  const resp = await fetch(url)
  if (!resp.ok) return null
  const buf = await resp.arrayBuffer()
  const header = new Uint32Array(buf, 0, 2)
  const frameCount = header[0]
  const frames = new Float32Array(buf, 8, frameCount * 5)
  return { frameCount, fps: header[1], frames }
}
```

在 `main.js` 的 `loadStage()` 中於 `StageEnvironment.create()` 之前呼叫：

```javascript
const camData = await loadCameraPath(stageId)
cameraRig = camData
  ? new CameraRig(renderer.camera, camData)
  : new CameraRig(renderer.camera, railWaypoints, level.duration)
```

---

## 5. 順帶修復

### 5-A 準星（Crosshair）

在 `game/src/hud/HUD.js` 新增一個固定置中的 CSS 元素：

```css
position: fixed;
left: 50%; top: 50%;
transform: translate(-50%, -50%);
color: white;
font-size: 20px;
pointer-events: none;
```

顯示 `+` 或 `○` 符號。命中敵人時短暫閃紅色（0.1秒）。

### 5-B 燈光增強

在 `game/src/render/Renderer.js` 的 `_addLights()` 中：

```javascript
const ambient  = new THREE.AmbientLight(0xffffff, 0.8)   // 0.4 → 0.8
const sun      = new THREE.DirectionalLight(0xffffff, 1.2)
sun.position.set(10, 20, 10)

const fill = new THREE.DirectionalLight(0x8899bb, 0.6)   // 新增補光
fill.position.set(-10, 5, -10)
```

---

## 6. 測試策略

| 層次 | 測試 |
|------|------|
| 單元 | `camera-reader.test.mjs`：合成 16-byte BIN → 驗證 x,y,z,yaw,pitch 解碼正確 |
| 單元 | `CameraRig.test.js`（更新）：驗證 frame-based advance + pause/resume |
| 手動 | 開 dev server，Stage 1 啟動後鏡頭應沿港口場景移動，方向與原版一致 |
| 手動 | 對比原版截圖，確認鏡頭位置大致相符 |

---

## 7. 不在本 Spec 範圍內

- CAMMOV3（Boss 序列）整合
- 敵人出現位置與 CAMMOV 幀對應
- Stage 2/3 的 GLB 場景提取（需另外跑 extractor）
- Route A/B 分歧鏡頭
- BGM

---

## 8. 檔案異動清單

**新建：**
- `tools/extract-stage-assets/lib/camera-reader.mjs`
- `tools/extract-stage-assets/test/camera-reader.test.mjs`
- `tools/extract-stage-assets/extract-camera.mjs`
- `game/src/render/CameraPathLoader.js`
- `game/public/assets/stage1/camera.bin`（執行 CLI 後）

**修改：**
- `game/src/render/CameraRig.js`（重構為 frame-based，保留 fallback）
- `game/src/render/Renderer.js`（燈光增強）
- `game/src/hud/HUD.js`（準星）
- `game/src/main.js`（loadStage 呼叫 CameraPathLoader）
- `game/tests/CameraRig.test.js`（更新測試）
