# DARKLINE M0 垂直切片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用一個丟棄式垂直切片，在寫任何正式內容前證實 DARKLINE 的四個技術未知數能成立——不成立就在第一週發現，不押上整個案子。

**Architecture:** 在 `game/src/darkline/m0/` 開一個**隔離 spike**，重用現有引擎的 `Renderer` / `Shooter` / `GameLoop` / `InputManager`，但所有新邏輯（調色盤量化、公告板 sprite、自由移動碰撞、簡單 AI、存檔、段落切換）寫成**小而純、可單元測試**的模組。整合與視覺/延遲類驗證用明確的手動驗收步驟。M0 全部產物可丟，不汙染 production。

**Tech Stack:** three.js ^0.168（ESM）、Vite 6、Vitest 2、（Phase D）Electron。

> **模型使用提醒（承用戶要求）：** 每個 Task 標 **建議模型**。原則：純邏輯/規格明確 → **Sonnet**；整合判斷/視覺品味/延遲調校 → **Opus**。每個 **Phase 結尾有一個「Opus 統一檢查」檢查點**，用戶過了才進下一 Phase（也方便切 session、評估 token 額度）。

> **驗收性質提醒：** Phase A/B 的部分 Task 是「判斷題」（sprite 一致性好不好看、自由段好不好玩），無法單元測試——這些用**手動驗收 + 用戶/Opus 拍板**。可單元測試的純邏輯（量化、碰撞夾擠、AI 轉向、存檔往返、段落狀態機）一律走 TDD。

---

## 檔案結構（先鎖分工）

| 檔案 | 責任 | 可測 |
|---|---|---|
| `game/src/darkline/m0/palette.js` | RGBA 像素量化到固定調色盤（純函式） | ✅ TDD |
| `game/src/darkline/m0/buildSprite.js` | 瀏覽器端：載入 PNG → 過 palette → 輸出處理後貼圖 canvas | 手動 |
| `game/src/darkline/m0/BillboardSprite.js` | three.js 公告板 sprite：sprite sheet UV 動畫 + 角度選格 | 部分 TDD（UV 計算） |
| `game/src/darkline/m0/FreeRoamController.js` | PointerLock WASD + 滑鼠看，位置夾在房間 AABB 內 | ✅ TDD（夾擠純函式） |
| `game/src/darkline/m0/clamp.js` | 房間/障礙碰撞夾擠（純函式） | ✅ TDD |
| `game/src/darkline/m0/WanderAI.js` | 最簡敵人 AI：朝玩家移動、到距離就停下射擊（純函式 step） | ✅ TDD |
| `game/src/darkline/m0/SaveStore.js` | 進度存/讀 localStorage（注入 storage 可測） | ✅ TDD |
| `game/src/darkline/m0/Sequencer.js` | 段落狀態機：briefing→rail→free→save→done（純狀態機） | ✅ TDD |
| `game/src/darkline/m0/spike.js` | 把以上接成可跑的 spike（重用 Renderer/Shooter/GameLoop） | 手動 |
| `game/m0.html` | spike 入口頁（獨立於主遊戲 index.html） | 手動 |
| `game/tests/darkline/m0/*.test.js` | 上述純邏輯的測試 | — |
| `electron/main.cjs` + `electron/latency-probe.js` | Phase D 打包 + 延遲量測 | 手動 |

> 全部在 `darkline/m0/` 命名空間下，與 production（`scene/`、`gameplay/`、`level/`）零交叉修改。

---

# Phase A — Sprite 管線（驗證未知數 #1：Gemini 風格一致性靠程式收斂）

### Task A1: 調色盤量化純函式

**建議模型：** Sonnet（純邏輯、規格明確）

**Files:**
- Create: `game/src/darkline/m0/palette.js`
- Test: `game/tests/darkline/m0/palette.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/m0/palette.test.js
import { describe, it, expect } from 'vitest'
import { nearestColor, quantize } from '../../../src/darkline/m0/palette.js'

const PAL = [ [0,0,0], [255,255,255], [200,30,30] ] // 黑/白/紅

describe('nearestColor', () => {
  it('maps a near-black pixel to black', () => {
    expect(nearestColor([10, 8, 5], PAL)).toEqual([0, 0, 0])
  })
  it('maps a near-red pixel to the red entry', () => {
    expect(nearestColor([180, 40, 35], PAL)).toEqual([200, 30, 30])
  })
})

describe('quantize', () => {
  it('rewrites every pixel to a palette entry, preserving alpha', () => {
    // 1 white-ish + 1 red-ish pixel, both fully opaque
    const img = { width: 2, height: 1, data: new Uint8ClampedArray([
      250,250,250,255,  190,35,30,255,
    ]) }
    const out = quantize(img, PAL)
    expect([...out.data]).toEqual([255,255,255,255,  200,30,30,255])
  })
  it('leaves fully transparent pixels untouched', () => {
    const img = { width: 1, height: 1, data: new Uint8ClampedArray([123,45,67,0]) }
    const out = quantize(img, PAL)
    expect(out.data[3]).toBe(0)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/m0/palette.test.js`
Expected: FAIL（`palette.js` 不存在 / 函式未定義）

- [ ] **Step 3: 最小實作**

```js
// game/src/darkline/m0/palette.js
// 把任意 RGB 對應到調色盤中歐氏距離最近的顏色。這是「Duke3D 共用 256 色盤」
// 概念的程式版：不管 Gemini 吐什麼顏色，全部收斂到同一盒蠟筆 → 風格自動統一。

export function nearestColor([r, g, b], palette) {
  let best = palette[0], bestD = Infinity
  for (const c of palette) {
    const dr = r - c[0], dg = g - c[1], db = b - c[2]
    const d = dr*dr + dg*dg + db*db
    if (d < bestD) { bestD = d; best = c }
  }
  return best
}

// img: { width, height, data: Uint8ClampedArray(RGBA) } —— 與 canvas ImageData 同形狀。
// 回傳新的同形狀物件；完全透明（alpha 0）的像素原樣保留。
export function quantize(img, palette) {
  const data = new Uint8ClampedArray(img.data)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const [r, g, b] = nearestColor([data[i], data[i + 1], data[i + 2]], palette)
    data[i] = r; data[i + 1] = g; data[i + 2] = b
  }
  return { width: img.width, height: img.height, data }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/m0/palette.test.js`
Expected: PASS（4 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/m0/palette.js game/tests/darkline/m0/palette.test.js
git commit -m "feat(m0): palette quantize — force art through a fixed palette"
```

---

### Task A2: 瀏覽器端 sprite 處理（PNG → palette → 描邊 → 縮放）

**建議模型：** Opus（牽涉視覺品質判斷與 canvas 細節）

**Files:**
- Create: `game/src/darkline/m0/buildSprite.js`

- [ ] **Step 1: 實作（手動驗證，無單元測試——依賴 canvas/圖片）**

```js
// game/src/darkline/m0/buildSprite.js
// 載入一張（Gemini 生的）PNG，過調色盤量化 + 1px 描邊 + 縮到固定解析度，
// 回傳一個可丟給 three.js CanvasTexture 的 <canvas>。風格一致性靠這裡收斂。
import { quantize } from './palette.js'

// M0 用的固定調色盤（1950s noir 暖灰調，先粗略，之後再調）。
export const M0_PALETTE = [
  [12,12,16], [40,36,40], [88,78,70], [140,128,112], [196,182,160], [236,228,210],
  [120,30,28], [180,60,40], [60,70,90], [110,120,140], [70,90,60], [150,150,60],
]

export async function loadImage(url) {
  const img = new Image()
  img.src = url
  await img.decode()
  return img
}

// img: HTMLImageElement;  size: 目標方形邊長（如 96）
export function processToCanvas(img, palette = M0_PALETTE, size = 96) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, size, size)
  const id = ctx.getImageData(0, 0, size, size)
  const q = quantize({ width: size, height: size, data: id.data }, palette)
  const out = new ImageData(q.data, size, size)
  ctx.putImageData(out, 0, 0)
  return c
}
```

- [ ] **Step 2: 手動驗證（接在 Task A3 的 spike 頁一起看）**
這個 Task 的「驗證」是**用戶生一張 Gemini 敵人圖丟進來，看過完管線後風格是否被收斂**——放到 Phase A 結尾的 Opus 檢查點一起做。

- [ ] **Step 3: Commit**

```bash
git add game/src/darkline/m0/buildSprite.js
git commit -m "feat(m0): browser sprite processing — palette+downscale to canvas"
```

---

### Task A3: 公告板 sprite（sprite sheet UV 動畫 + 角度選格）

**建議模型：** Sonnet（UV 計算可測；three.js 接線照三步走）

**Files:**
- Create: `game/src/darkline/m0/BillboardSprite.js`
- Test: `game/tests/darkline/m0/billboard.test.js`

- [ ] **Step 1: 寫失敗測試（只測純 UV/選格邏輯）**

```js
// game/tests/darkline/m0/billboard.test.js
import { describe, it, expect } from 'vitest'
import { frameUV, angleToColumn } from '../../../src/darkline/m0/BillboardSprite.js'

describe('frameUV', () => {
  it('returns offset/repeat for a 4-col x 2-row sheet, cell (col=1,row=0)', () => {
    // rows count from the TOP visually; texture v=0 is bottom, so row0 → v offset 0.5
    expect(frameUV(1, 0, 4, 2)).toEqual({ ox: 0.25, oy: 0.5, rx: 0.25, ry: 0.5 })
  })
})

describe('angleToColumn', () => {
  it('maps relative angle 0 (facing camera) to column 0', () => {
    expect(angleToColumn(0, 8)).toBe(0)
  })
  it('wraps negative angles into range', () => {
    expect(angleToColumn(-Math.PI / 4 + 0.001, 8)).toBe(7)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/m0/billboard.test.js`
Expected: FAIL（函式未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/m0/BillboardSprite.js
import * as THREE from 'three'

// sprite sheet：cols 欄 = 視角方向，rows 列 = 動畫格。回傳貼圖 UV 視窗。
// 視覺上 row 由上往下數；WebGL 紋理 v=0 在底部，故 oy 用 (rows-1-row)。
export function frameUV(col, row, cols, rows) {
  return { ox: col / cols, oy: (rows - 1 - row) / rows, rx: 1 / cols, ry: 1 / rows }
}

// rel：敵人「面向」相對於「敵人→相機」的夾角（弧度）。0 = 正對相機 → 第 0 欄。
export function angleToColumn(rel, cols) {
  const seg = (2 * Math.PI) / cols
  let a = rel + seg / 2          // 置中對齊每欄
  a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  return Math.floor(a / seg) % cols
}

// 一個面向相機的 sprite。texture：CanvasTexture（來自 buildSprite）或載入的貼圖。
export class BillboardSprite {
  constructor(texture, { cols = 1, rows = 1, worldSize = 2 } = {}) {
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.colorSpace = THREE.SRGBColorSpace
    this.cols = cols; this.rows = rows
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    this.sprite = new THREE.Sprite(mat)            // Sprite 永遠面向相機
    this.sprite.scale.set(worldSize, worldSize, 1)
    this.setCell(0, 0)
  }
  setCell(col, row) {
    const { ox, oy, rx, ry } = frameUV(col, row, this.cols, this.rows)
    const t = this.sprite.material.map
    t.offset.set(ox, oy); t.repeat.set(rx, ry); t.needsUpdate = true
  }
  // facing：敵人世界朝向(弧度)；camPos/selfPos：THREE.Vector3
  faceFrame(facing, camPos, selfPos, animRow = 0) {
    const toCam = Math.atan2(camPos.x - selfPos.x, camPos.z - selfPos.z)
    this.setCell(angleToColumn(facing - toCam, this.cols), animRow)
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/m0/billboard.test.js`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/m0/BillboardSprite.js game/tests/darkline/m0/billboard.test.js
git commit -m "feat(m0): billboard sprite — sheet UV anim + angle-to-column"
```

---

### ✅ Phase A 檢查點 — 交用戶用 Opus 統一檢查

- [ ] **驗收（手動 + Opus）：**
  1. 用戶用 Gemini 生 1 張敵人圖（如「1950s 便衣特務、像素風」），存到 `game/public/m0/enemy.png`。
  2. 在 spike 頁（Phase B 會建）或臨時 canvas 用 `processToCanvas()` 過管線。
  3. **判斷題（用戶/Opus 拍板）：** 過完調色盤後，風格是否被收斂到一致？多生 2~3 張同管線後，彼此像不像「同一個遊戲的東西」？
  4. **決策：** 一致性可接受 → 繼續；明顯不行 → 在此調整 `M0_PALETTE`／加描邊／改用圖生圖鎖底稿，再驗。
- [ ] 用戶以 Opus 通讀 Phase A 的 diff（palette/buildSprite/BillboardSprite + 測試），確認無誤後再開 Phase B。

> ⚠️ 殘留風險：調色盤鎖**顏色**一致，鎖不了**跨動畫格形狀**一致。本檢查點若發現「同一敵人走路會走鐘」，記錄下來帶進 Phase B 的動畫格驗證（緩解：壓到 2~3 格、圖生圖鎖底稿、人工描修）。

---

# Phase B — 自由段（驗證未知數 #2：走動 + 碰撞 + 簡單 AI + 射擊好不好玩）

### Task B1: 房間/障礙碰撞夾擠（純函式）

**建議模型：** Sonnet（純幾何）

**Files:**
- Create: `game/src/darkline/m0/clamp.js`
- Test: `game/tests/darkline/m0/clamp.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/m0/clamp.test.js
import { describe, it, expect } from 'vitest'
import { clampToRoom } from '../../../src/darkline/m0/clamp.js'

const ROOM = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }

describe('clampToRoom', () => {
  it('keeps an in-bounds point unchanged', () => {
    expect(clampToRoom({ x: 1, z: -2 }, ROOM, [], 0.3)).toEqual({ x: 1, z: -2 })
  })
  it('clamps past a wall, accounting for radius', () => {
    expect(clampToRoom({ x: 9, z: 0 }, ROOM, [], 0.3)).toEqual({ x: 4.7, z: 0 })
  })
  it('pushes the point out of a box obstacle along the smaller overlap axis', () => {
    const obs = [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }]
    // entering from the right, small x-overlap → pushed to +x face + radius
    const r = clampToRoom({ x: 0.9, z: 0 }, ROOM, obs, 0.3)
    expect(r.x).toBeCloseTo(1.3, 5)
    expect(r.z).toBe(0)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/m0/clamp.test.js`
Expected: FAIL（函式未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/m0/clamp.js
// 平地 2D 碰撞：把點夾進房間矩形，再推出每個 AABB 障礙。刻意極簡（M0 不做物理）。
export function clampToRoom(p, room, obstacles = [], radius = 0.3) {
  let x = Math.min(Math.max(p.x, room.minX + radius), room.maxX - radius)
  let z = Math.min(Math.max(p.z, room.minZ + radius), room.maxZ - radius)
  for (const o of obstacles) {
    const insideX = x > o.minX - radius && x < o.maxX + radius
    const insideZ = z > o.minZ - radius && z < o.maxZ + radius
    if (!(insideX && insideZ)) continue
    // 四個面各自的「推出距離」，取最小的那一面推出去
    const dl = x - (o.minX - radius)   // 往 -x 推
    const dr = (o.maxX + radius) - x   // 往 +x 推
    const db = z - (o.minZ - radius)   // 往 -z 推
    const dt = (o.maxZ + radius) - z   // 往 +z 推
    const m = Math.min(dl, dr, db, dt)
    if (m === dl) x = o.minX - radius
    else if (m === dr) x = o.maxX + radius
    else if (m === db) z = o.minZ - radius
    else z = o.maxZ + radius
  }
  return { x, z }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/m0/clamp.test.js`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/m0/clamp.js game/tests/darkline/m0/clamp.test.js
git commit -m "feat(m0): 2D room+obstacle collision clamp"
```

---

### Task B2: 最簡敵人 AI（朝玩家走、到距離停下射擊）

**建議模型：** Sonnet（純邏輯狀態 step）

**Files:**
- Create: `game/src/darkline/m0/WanderAI.js`
- Test: `game/tests/darkline/m0/wanderai.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/m0/wanderai.test.js
import { describe, it, expect } from 'vitest'
import { stepAI } from '../../../src/darkline/m0/WanderAI.js'

describe('stepAI', () => {
  const cfg = { speed: 2, range: 3, fireCooldown: 1 }
  it('advances toward the player when out of range', () => {
    const s = { x: 0, z: 0, cooldown: 0 }
    const r = stepAI(s, { x: 10, z: 0 }, 0.5, cfg)
    expect(r.x).toBeCloseTo(1, 5)   // 2 u/s * 0.5s toward +x
    expect(r.fired).toBe(false)
  })
  it('stops and fires when within range and off cooldown', () => {
    const s = { x: 0, z: 0, cooldown: 0 }
    const r = stepAI(s, { x: 2, z: 0 }, 0.5, cfg)
    expect(r.x).toBe(0)             // already in range → no move
    expect(r.fired).toBe(true)
    expect(r.cooldown).toBeCloseTo(1, 5)
  })
  it('counts down cooldown without firing', () => {
    const s = { x: 0, z: 0, cooldown: 0.8 }
    const r = stepAI(s, { x: 2, z: 0 }, 0.5, cfg)
    expect(r.fired).toBe(false)
    expect(r.cooldown).toBeCloseTo(0.3, 5)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/m0/wanderai.test.js`
Expected: FAIL（函式未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/m0/WanderAI.js
// 一隻敵人最笨的腦：超出射程就朝玩家直線走；進射程就站定、冷卻到 0 就開一槍。
// 回傳新狀態（不可變）。整合層負責把 fired=true 轉成一發子彈。
export function stepAI(s, player, dt, cfg) {
  const dx = player.x - s.x, dz = player.z - s.z
  const dist = Math.hypot(dx, dz) || 1
  let { x, z, cooldown } = s
  let fired = false
  if (dist > cfg.range) {
    const step = cfg.speed * dt
    x += (dx / dist) * step
    z += (dz / dist) * step
    cooldown = Math.max(0, cooldown - dt)
  } else if (cooldown <= 0) {
    fired = true
    cooldown = cfg.fireCooldown
  } else {
    cooldown = Math.max(0, cooldown - dt)
  }
  return { x, z, cooldown, fired }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/m0/wanderai.test.js`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/m0/WanderAI.js game/tests/darkline/m0/wanderai.test.js
git commit -m "feat(m0): minimal enemy AI — seek then stop-and-fire"
```

---

### Task B3: 自由移動相機控制器（PointerLock + WASD，位置過 clamp）

**建議模型：** Opus（DOM/PointerLock 整合 + 手感）

**Files:**
- Create: `game/src/darkline/m0/FreeRoamController.js`
- Test: `game/tests/darkline/m0/freeroam.test.js`

- [ ] **Step 1: 寫失敗測試（測純移動向量推導，不碰 DOM）**

```js
// game/tests/darkline/m0/freeroam.test.js
import { describe, it, expect } from 'vitest'
import { moveDelta } from '../../../src/darkline/m0/FreeRoamController.js'

describe('moveDelta', () => {
  it('moves along -z when facing yaw=0 and pressing forward', () => {
    const d = moveDelta({ forward: true }, 0, 3, 0.5)  // yaw 0, speed 3, dt .5
    expect(d.dx).toBeCloseTo(0, 5)
    expect(d.dz).toBeCloseTo(-1.5, 5)
  })
  it('strafes along +x when facing yaw=0 and pressing right', () => {
    const d = moveDelta({ right: true }, 0, 3, 0.5)
    expect(d.dx).toBeCloseTo(1.5, 5)
    expect(d.dz).toBeCloseTo(0, 5)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/m0/freeroam.test.js`
Expected: FAIL（函式未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/m0/FreeRoamController.js
import * as THREE from 'three'
import { clampToRoom } from './clamp.js'

// 純函式：依按鍵 + 偏航角算出本幀位移（未夾擠）。yaw=0 時「前」= -z。
export function moveDelta(keys, yaw, speed, dt) {
  let fx = 0, fz = 0
  if (keys.forward) fz -= 1
  if (keys.back)    fz += 1
  if (keys.left)    fx -= 1
  if (keys.right)   fx += 1
  const len = Math.hypot(fx, fz)
  if (len === 0) return { dx: 0, dz: 0 }
  fx /= len; fz /= len
  const sin = Math.sin(yaw), cos = Math.cos(yaw)
  // 把本地(右,前)旋到世界
  const wx = fx * cos + fz * sin
  const wz = -fx * sin + fz * cos
  return { dx: wx * speed * dt, dz: wz * speed * dt }
}

// 整合類：綁 PointerLock + 鍵盤；每幀 update(dt) 把相機夾在房間內。
export class FreeRoamController {
  constructor(camera, dom, room, obstacles = [], { speed = 3, eye = 1.6 } = {}) {
    this.camera = camera; this.dom = dom; this.room = room
    this.obstacles = obstacles; this.speed = speed; this.eye = eye
    this.yaw = 0; this.pitch = 0; this.enabled = false
    this.keys = { forward: false, back: false, left: false, right: false }
    this._onKey = (e, down) => {
      const k = { KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right' }[e.code]
      if (k) this.keys[k] = down
    }
    this._kd = e => this._onKey(e, true)
    this._ku = e => this._onKey(e, false)
    this._mm = e => {
      if (!this.enabled) return
      this.yaw   -= e.movementX * 0.0025
      this.pitch -= e.movementY * 0.0025
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch))
    }
    this._lock = () => { this.enabled = document.pointerLockElement === this.dom }
  }
  attach() {
    this.dom.addEventListener('click', () => this.dom.requestPointerLock())
    document.addEventListener('pointerlockchange', this._lock)
    document.addEventListener('mousemove', this._mm)
    window.addEventListener('keydown', this._kd)
    window.addEventListener('keyup', this._ku)
  }
  detach() {
    document.removeEventListener('pointerlockchange', this._lock)
    document.removeEventListener('mousemove', this._mm)
    window.removeEventListener('keydown', this._kd)
    window.removeEventListener('keyup', this._ku)
  }
  update(dt) {
    const { dx, dz } = moveDelta(this.keys, this.yaw, this.speed, dt)
    const p = clampToRoom(
      { x: this.camera.position.x + dx, z: this.camera.position.z + dz },
      this.room, this.obstacles, 0.3,
    )
    this.camera.position.set(p.x, this.eye, p.z)
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/m0/freeroam.test.js`
Expected: PASS（2 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/m0/FreeRoamController.js game/tests/darkline/m0/freeroam.test.js
git commit -m "feat(m0): free-roam controller — pointerlock WASD, clamped to room"
```

---

### ✅ Phase B 檢查點 — 交用戶用 Opus 統一檢查
（自由段「好不好玩」要等 Phase C 把房間+敵人+射擊接起來才驗——見 Phase C 檢查點。此處只請 Opus 通讀 clamp/WanderAI/FreeRoam 的 diff 與測試。）

- [ ] 用戶以 Opus 通讀 Phase B diff，確認碰撞/AI/移動邏輯無誤後開 Phase C。

---

# Phase C — 完整迴圈 + 存檔（驗證未知數 #3）

### Task C1: 存檔（localStorage 往返）

**建議模型：** Sonnet（純邏輯，注入 storage）

**Files:**
- Create: `game/src/darkline/m0/SaveStore.js`
- Test: `game/tests/darkline/m0/savestore.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/m0/savestore.test.js
import { describe, it, expect } from 'vitest'
import { SaveStore } from '../../../src/darkline/m0/SaveStore.js'

function fakeStorage() {
  const m = new Map()
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }
}

describe('SaveStore', () => {
  it('round-trips a checkpoint', () => {
    const s = new SaveStore(fakeStorage())
    s.save({ segment: 'free', score: 1200 })
    expect(s.load()).toEqual({ segment: 'free', score: 1200 })
  })
  it('returns null when empty', () => {
    expect(new SaveStore(fakeStorage()).load()).toBeNull()
  })
  it('clears a save', () => {
    const s = new SaveStore(fakeStorage())
    s.save({ segment: 'rail', score: 0 })
    s.clear()
    expect(s.load()).toBeNull()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/m0/savestore.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/m0/SaveStore.js
// 極簡存檔：序列化進度到注入的 storage（預設 localStorage）。注入讓它可測。
const KEY = 'darkline.m0.save'
export class SaveStore {
  constructor(storage = globalThis.localStorage) { this.storage = storage }
  save(state) { this.storage.setItem(KEY, JSON.stringify(state)) }
  load() {
    const raw = this.storage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  }
  clear() { this.storage.removeItem(KEY) }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/m0/savestore.test.js`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/m0/SaveStore.js game/tests/darkline/m0/savestore.test.js
git commit -m "feat(m0): SaveStore — localStorage checkpoint round-trip"
```

---

### Task C2: 段落狀態機（briefing→rail→free→save→done）

**建議模型：** Sonnet（純狀態機）

**Files:**
- Create: `game/src/darkline/m0/Sequencer.js`
- Test: `game/tests/darkline/m0/sequencer.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/m0/sequencer.test.js
import { describe, it, expect } from 'vitest'
import { Sequencer, SEGMENTS } from '../../../src/darkline/m0/Sequencer.js'

describe('Sequencer', () => {
  it('starts at briefing', () => {
    expect(new Sequencer().current).toBe('briefing')
  })
  it('advances through the fixed order', () => {
    const s = new Sequencer()
    expect(SEGMENTS).toEqual(['briefing', 'rail', 'free', 'done'])
    s.next(); expect(s.current).toBe('rail')
    s.next(); expect(s.current).toBe('free')
    s.next(); expect(s.current).toBe('done')
  })
  it('fires onEnter with the new segment', () => {
    const seen = []
    const s = new Sequencer({ onEnter: seg => seen.push(seg) })
    s.next(); s.next()
    expect(seen).toEqual(['rail', 'free'])
  })
  it('reports done', () => {
    const s = new Sequencer()
    s.next(); s.next(); s.next()
    expect(s.isDone).toBe(true)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/m0/sequencer.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/m0/Sequencer.js
// M0 的最小任務骨架：固定段落順序。整合層在每次 onEnter 切換相機控制/存檔。
export const SEGMENTS = ['briefing', 'rail', 'free', 'done']

export class Sequencer {
  constructor({ onEnter } = {}) { this._i = 0; this._onEnter = onEnter }
  get current() { return SEGMENTS[this._i] }
  get isDone() { return this.current === 'done' }
  next() {
    if (this._i < SEGMENTS.length - 1) {
      this._i++
      this._onEnter?.(this.current)
    }
    return this.current
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/m0/sequencer.test.js`
Expected: PASS（4 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/m0/Sequencer.js game/tests/darkline/m0/sequencer.test.js
git commit -m "feat(m0): Sequencer — fixed mission segment state machine"
```

---

### Task C3: 接成可跑的 spike（重用 Renderer/Shooter/GameLoop）

**建議模型：** Opus（整合 + 手感 + 全迴圈判斷）

**Files:**
- Create: `game/m0.html`
- Create: `game/src/darkline/m0/spike.js`

- [ ] **Step 1: 建入口頁**

```html
<!-- game/m0.html -->
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>DARKLINE M0 spike</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#c{width:100vw;height:100vh}
#hint{position:fixed;left:8px;top:8px;color:#9c9;font:12px monospace;z-index:5}</style></head>
<body>
<div id="c"></div>
<div id="hint">M0 spike — 點畫面進自由段，WASD 走、滑鼠看、左鍵射；按 N 進下一段</div>
<script type="module" src="/src/darkline/m0/spike.js"></script>
</body></html>
```

- [ ] **Step 2: 寫 spike 接線**

```js
// game/src/darkline/m0/spike.js
// 把四個未知數接成一條可跑迴圈：briefing → 短 rail → 自由房間(走+敵人+射) → 存檔 → done。
// 重用 production 的 Renderer/Shooter/GameLoop；其餘全用 m0/ 模組。丟棄式，不接主選單。
import * as THREE from 'three'
import { Renderer } from '../../render/Renderer.js'
import { GameLoop } from '../../GameLoop.js'
import { Shooter } from '../../gameplay/Shooter.js'
import { Sequencer } from './Sequencer.js'
import { SaveStore } from './SaveStore.js'
import { FreeRoamController } from './FreeRoamController.js'
import { BillboardSprite } from './BillboardSprite.js'
import { stepAI } from './WanderAI.js'
import { loadImage, processToCanvas } from './buildSprite.js'

const renderer = new Renderer(document.getElementById('c'))
const shooter = new Shooter(renderer.camera)
const save = new SaveStore()
const ROOM = { minX: -6, maxX: 6, minZ: -10, maxZ: 2 }

// 簡單房間：地板 + 四面牆（盒），燈光。
const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12),
  new THREE.MeshStandardMaterial({ color: 0x55504a }))
floor.rotation.x = -Math.PI / 2; floor.position.z = -4; renderer.scene.add(floor)
renderer.scene.add(new THREE.HemisphereLight(0xffe9c0, 0x202028, 1.1))

// 敵人 sprite（過調色盤管線；圖放 game/public/m0/enemy.png）。
let enemy = null
const ai = { x: 0, z: -8, cooldown: 1 }
const AICFG = { speed: 1.6, range: 4, fireCooldown: 1.5 }
let enemyAlive = true
async function spawnEnemy() {
  const img = await loadImage('/m0/enemy.png')
  const tex = new THREE.CanvasTexture(processToCanvas(img))
  enemy = new BillboardSprite(tex, { cols: 1, rows: 1, worldSize: 1.8 })
  enemy.sprite.position.set(ai.x, 0.9, ai.z)
  renderer.scene.add(enemy.sprite)
}

// 段落切換。
const free = new FreeRoamController(renderer.camera, document.getElementById('c'), ROOM)
const seq = new Sequencer({ onEnter: async seg => {
  document.getElementById('hint').textContent = `段落：${seg}`
  if (seg === 'rail') { renderer.camera.position.set(0, 1.6, 4) }
  if (seg === 'free') { free.attach(); await spawnEnemy(); save.save({ segment: 'free', score: 0 }) }
  if (seg === 'done') { free.detach(); document.getElementById('hint').textContent = 'DONE — 存檔已寫入，重整可見 segment=free' }
}})

window.addEventListener('keydown', e => { if (e.code === 'KeyN') seq.next() })

// 左鍵射擊：自由段時對 enemy.sprite 做 raycast。
window.addEventListener('mousedown', e => {
  if (e.button !== 0 || seq.current !== 'free' || !enemyAlive || !enemy) return
  const hits = shooter.getHits({ x: 0, y: 0 }, [enemy.sprite]) // pointerlock 下準心在中央
  if (hits.length) { enemyAlive = false; enemy.sprite.visible = false }
})

const loop = new GameLoop(dt => {
  if (seq.current === 'free') {
    free.update(dt)
    if (enemyAlive && enemy) {
      const r = stepAI(ai, renderer.camera.position, dt, AICFG)
      ai.x = r.x; ai.z = r.z; ai.cooldown = r.cooldown
      enemy.sprite.position.set(ai.x, 0.9, ai.z)
      enemy.faceFrame(0, renderer.camera.position, enemy.sprite.position)
    }
  }
  renderer.render()
})
loop.start()
window.__m0 = { seq, save, renderer, get enemyAlive() { return enemyAlive } }
```

- [ ] **Step 3: 手動驗證——跑起來看全迴圈**

Run: `cd game && npm run dev`，瀏覽器開 `http://localhost:5173/m0.html`
預期可觀察：
- 開場 briefing → 按 N 進 rail（相機就位）→ 按 N 進 free。
- free 段：點畫面鎖游標，WASD 走動、滑鼠看、撞牆會被擋（不穿牆）。
- 敵人 sprite 面向你、朝你靠近；左鍵命中後消失。
- 按 N 到 done；hint 顯示存檔已寫入。**重整頁面後** console 跑 `__m0.save.load()` 應回 `{segment:'free',score:0}`。

- [ ] **Step 4: Commit**

```bash
git add game/m0.html game/src/darkline/m0/spike.js
git commit -m "feat(m0): wire spike — rail→free→shoot→save full loop"
```

---

### ✅ Phase C 檢查點 — 交用戶用 Opus 統一檢查（最關鍵的決策閘）

- [ ] **判斷題（用戶/Opus 拍板）：**
  1. **自由段好不好玩？** 在房間裡走動射擊，是有趣、還是空盪盪很乾？
  2. **AI 多痛？** 把這隻笨 AI 養到「堪用」花了多少力氣？放大到一關的量級可行嗎？
  3. **sprite 在自由段繞著走**時，單張無多角度的破綻有多明顯？需要做到幾個角度才能接受？
  4. **全迴圈**（rail→free→存檔→讀回）是否順？
- [ ] **決策（決定首部曲比例）：**
  - 又好玩又做得動 → 首部曲自由比例可拉高，M1 往「自由為重」鋪。
  - AI/多角度是無底洞 → 縮小自由段、軌道為主幹（安全網），M1 以軌道為骨。
- [ ] 用戶以 Opus 通讀 Phase C diff 並記錄上述決策（寫進 ROADMAP / 新 spec 附註），作為 M1 計畫的輸入。

---

# Phase D — Electron 打包延遲 smoke test（驗證未知數 #4）

### Task D1: 最小 Electron 殼 + 延遲量測

**建議模型：** Opus（環境/延遲判斷）

**Files:**
- Create: `electron/main.cjs`
- Create: `electron/package.json`
- Create: `game/src/darkline/m0/latencyProbe.js`

- [ ] **Step 1: 建 Electron 殼**

```js
// electron/main.cjs
const { app, BrowserWindow } = require('electron')
const path = require('path')
function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 720, webPreferences: { backgroundThrottling: false } })
  // 載入 vite build 後的 m0 頁（先 `cd game && npm run build` 產出 dist）
  win.loadFile(path.join(__dirname, '..', 'game', 'dist', 'm0.html'))
}
app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
```

```json
// electron/package.json
{ "name": "darkline-m0-shell", "version": "0.0.0", "main": "main.cjs",
  "scripts": { "start": "electron ." }, "devDependencies": { "electron": "^33.0.0" } }
```

- [ ] **Step 2: 加延遲探針（mousedown → 下一個 render 的毫秒數）**

```js
// game/src/darkline/m0/latencyProbe.js
// 量「按下到畫面更新」的粗略延遲：mousedown 記時間戳，下一個 rAF 取差值，列出中位數。
export function installLatencyProbe() {
  const samples = []
  let pending = null
  window.addEventListener('mousedown', () => { pending = performance.now() })
  function tick() {
    if (pending != null) { samples.push(performance.now() - pending); pending = null
      if (samples.length % 10 === 0) {
        const s = [...samples].sort((a, b) => a - b)
        console.log(`[latency] n=${s.length} median=${s[s.length >> 1].toFixed(1)}ms`)
      }
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
```

- [ ] **Step 3: 在 spike 掛探針**（`spike.js` 頂部加一行）

```js
import { installLatencyProbe } from './latencyProbe.js'
installLatencyProbe()
```

- [ ] **Step 4: 手動驗證——打包並量延遲**

Run:
```bash
cd game && npm run build
cd ../electron && npm install && npm start
```
在視窗裡按左鍵數十次，看 console 的 `[latency] median`。
**驗收：** Electron 內中位延遲與瀏覽器內相比沒有明顯惡化（射擊感不黏）。記下兩邊數字。

- [ ] **Step 5: Commit**

```bash
git add electron/main.cjs electron/package.json game/src/darkline/m0/latencyProbe.js game/src/darkline/m0/spike.js
git commit -m "feat(m0): electron shell + input-latency probe smoke test"
```

---

### ✅ Phase D 檢查點 — 交用戶用 Opus 統一檢查
- [ ] **判斷題：** Electron 內射擊延遲可接受嗎？打包體積多大？啟動多快？
- [ ] **決策：** 可接受 → Steam(Electron) 主場成立，照 spec §10 推進；明顯惡化 → 記錄並在 M1 前找替代（NW.js / 純 Web 收費 / 其他殼）。

---

# M0 總結檢查點（四個未知數的裁決）

- [ ] 用戶以 Opus 通讀整個 M0，對四個未知數各下一句結論（可/有條件可/不可），寫進 ROADMAP：
  1. Gemini sprite 一致性（Phase A）
  2. 自由段好玩 + AI/多角度成本（Phase C）
  3. 全迴圈 + 存檔（Phase C）
  4. Electron 延遲（Phase D）
- [ ] 依結論**設定首部曲軌道:自由比例**，作為 M1 計畫（另開）的輸入。
- [ ] **M0 程式碼可整包丟棄或保留為參考**——production 的 M1 會在乾淨的 `darkline/` 結構下重寫，不直接沿用 spike。

---

## Self-Review（對照 spec §4 四個未知數）

- **未知數①（Gemini sprite 一致性）** → Task A1–A3 + Phase A 檢查點 ✅
- **未知數②（自由段好玩 + AI）** → Task B1–B3 + C3 + Phase C 檢查點 ✅
- **未知數③（rail→free→存檔全迴圈）** → Task C1–C3 ✅
- **未知數④（Electron 延遲）** → Task D1 + Phase D 檢查點 ✅
- **模型標註 + 每 Phase Opus 檢查點**（用戶要求）→ 每 Task 有「建議模型」、每 Phase 有檢查點 ✅
- **隔離原則**（不汙染 production）→ 全在 `darkline/m0/` + `m0.html` + `electron/`，零修改 `scene/`、`gameplay/`、`level/` ✅
- **無 placeholder**：所有 code step 有完整可跑程式碼；型別/函式名跨 Task 一致（`quantize`/`frameUV`/`angleToColumn`/`clampToRoom`/`stepAI`/`moveDelta`/`SaveStore`/`Sequencer`）✅
- **註記**：spike 在 PointerLock 下準心固定螢幕中央，故 `shooter.getHits({x:0,y:0}, …)` 用 NDC 中心；正式版滑鼠瞄準另議（spec §6，列入 M1）。
```
