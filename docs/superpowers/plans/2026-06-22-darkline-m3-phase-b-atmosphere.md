# DARKLINE M3 Phase B — dusk 天空 / per-segment 霧 / 巷弄升級 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把跟暖街景打架的日景藍天換成 1953 dusk 暖天空 + per-segment 霧色，並把全場最醜的自由段巷弄升級到 keeper 街景的視覺詞彙（面分色塊體 + 亮窗 + 路燈 + 封閉 backdrop），疊在 Phase A 的後處理電影感上。

**Architecture:** `sky.js` 的 dome 已用 `topColor/horizonColor` uniform → 加 dusk 預設 + `setAtmosphere(scene, dome, atmos)` 供 per-segment 重新著色（純函式部分可單測；視覺走 Electron）。把 `OriginalEnvironment` 的 `shadedBox/flatStrip/pushWindows/streetlight` + 窗/燈調色抽進共用 `scene/streetKit.js`（refactor，既有測試守著零行為變更），讓 keeper 街景與 `AlleyScene` 共用同一套詞彙。`darkline.js` 在 `enterRail`/`enterFree` 依段落呼叫 `setAtmosphere`。

**Tech Stack:** Three.js r0.168（`game/`）+ Vitest 2（jsdom——THREE 幾何/材質可建構，故 builder 可單測；實際渲染走 Electron `shot.cjs` CDP）。Phase A 的後處理已上線（bloom 會讓本階段的亮窗/路燈/sun-glow 發光）。

**權威 spec：** [M3 視覺外觀層 design](../specs/2026-06-22-darkline-m3-visual-layer-design.md) §4 + §0 keeper 鐵律（**不打掉重建 keeper 街景，只疊**）。

---

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `game/src/render/sky.js` | Modify | dusk 預設（`DUSK_TAIPEI`/`DUSK_HARBOR`）+ `createSkyDome({top,horizon})` 參數化 + `applyAtmosphere(scene, atmos)` + 新 `setAtmosphere(scene, dome, atmos)` per-segment 重新著色 |
| `game/tests/sky.test.js` | Modify | 擴充：dusk 預設存在、`setAtmosphere` 更新 dome uniform + scene.fog、horizon==fogColor 守衛 |
| `game/src/scene/streetKit.js` | Create | 共用街景詞彙：`shadedBox`/`flatStrip`/`pushWindows`/`streetlight` + 窗/燈調色常數（從 OriginalEnvironment 抽出，零行為變更） |
| `game/tests/scene/streetKit.test.js` | Create | TDD：shadedBox 6 面材質、streetlight group 結構、pushWindows 累積 |
| `game/src/scene/OriginalEnvironment.js` | Modify | 改 import streetKit（移除本地 private 定義），其餘不動（keeper） |
| `game/src/darkline/free/AlleyScene.js` | Modify | `buildAlleyGroup` 改用 streetKit 詞彙（面分色牆/攤、亮窗、路燈、封閉 backdrop）|
| `game/tests/darkline/alley.test.js` | Modify | 擴充：group 含 shaded 牆、windows mesh、lamp、backdrop |
| `game/src/darkline/darkline.js` | Modify | `enterRail`/`enterFree` 依段落呼叫 `setAtmosphere`（taipei/harbor/alley dusk）|

> **KEEP 不動：** Phase A 的 `Renderer`/`postfx`/`cinematicConfig`；`buildOriginalEnvironment` 的行為（只換 import 來源）；`buildAlleyLayout`（純資料 layout 不變，只升級 `buildAlleyGroup` 的視覺）。

---

## Task B1：dusk 天空預設 + setAtmosphere（TDD）

**Files:**
- Modify: `game/src/render/sky.js`
- Test: `game/tests/sky.test.js`

> 先 Read `game/tests/sky.test.js` 看既有斷言風格，於其後**追加** describe，不改既有測試。

- [ ] **Step 1: 追加失敗測試**（加到 `game/tests/sky.test.js` 末尾）

```javascript
import { DUSK_TAIPEI, DUSK_HARBOR, setAtmosphere, applyAtmosphere, createSkyDome } from '../src/render/sky.js'
import * as THREE from 'three'

describe('dusk atmosphere', () => {
  it('exposes dusk presets whose fog colour matches the horizon', () => {
    for (const a of [DUSK_TAIPEI, DUSK_HARBOR]) {
      expect(a.fogColor).toBe(a.horizon)        // distant geometry must dissolve into the sky, not a mismatched fog
      expect(a.fogFar).toBeGreaterThan(a.fogNear)
    }
  })
  it('createSkyDome honours top/horizon params', () => {
    const dome = createSkyDome(100, { top: 0x112233, horizon: 0xaabbcc })
    expect(dome.material.uniforms.topColor.value.getHex()).toBe(0x112233)
    expect(dome.material.uniforms.horizonColor.value.getHex()).toBe(0xaabbcc)
  })
  it('setAtmosphere recolours dome uniforms + scene.fog + background', () => {
    const scene = new THREE.Scene()
    const dome = applyAtmosphere(scene, DUSK_TAIPEI)   // start dusk-taipei
    setAtmosphere(scene, dome, DUSK_HARBOR)            // switch to harbour
    expect(dome.material.uniforms.topColor.value.getHex()).toBe(DUSK_HARBOR.top)
    expect(dome.material.uniforms.horizonColor.value.getHex()).toBe(DUSK_HARBOR.horizon)
    expect(scene.fog.color.getHex()).toBe(DUSK_HARBOR.fogColor)
    expect(scene.fog.near).toBe(DUSK_HARBOR.fogNear)
    expect(scene.fog.far).toBe(DUSK_HARBOR.fogFar)
    expect(scene.background.getHex()).toBe(DUSK_HARBOR.fogColor)
  })
})
```

- [ ] **Step 2: 跑，確認 FAIL**

Run: `cd game && npx vitest run tests/sky.test.js`
Expected: FAIL（`DUSK_TAIPEI`/`setAtmosphere` 未匯出）。

- [ ] **Step 3: 改 `sky.js`**

把現有 `applyAtmosphere` 之前的 export 常數區與 `createSkyDome`/`applyAtmosphere` 改成（**保留** `SKY_TOP`/`SKY_HORIZON`/`FOG_*`/`SKY_RADIUS` 既有匯出不刪，避免回歸）：

```javascript
// ── DARKLINE dusk atmospheres (M3 Phase B). Warm low horizon → cool deep top,
// matching the keeper street's warm dusk palette. fogColor === horizon so distant
// blocks dissolve into the sky, not a mismatched haze. Per-segment via setAtmosphere.
export const DUSK_TAIPEI = { top: 0x2b3350, horizon: 0xb07a52, fogColor: 0xb07a52, fogNear: 220, fogFar: 1400 }
export const DUSK_HARBOR = { top: 0x26304a, horizon: 0x8f8a6e, fogColor: 0x8f8a6e, fogNear: 200, fogFar: 1500 }
```

改 `createSkyDome` 簽名吃顏色參數（預設 dusk-taipei，取代舊藍）：

```javascript
export function createSkyDome(radius = SKY_RADIUS, { top = DUSK_TAIPEI.top, horizon = DUSK_TAIPEI.horizon } = {}) {
  const geo = new THREE.SphereGeometry(radius, 32, 16)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(top) },
      horizonColor: { value: new THREE.Color(horizon) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      varying vec3 vDir;
      void main() {
        float t = smoothstep(0.0, 0.55, vDir.y);
        gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
      }
    `,
  })
  const dome = new THREE.Mesh(geo, mat)
  dome.name = 'sky_dome'
  dome.renderOrder = -1
  dome.frustumCulled = false
  dome.raycast = () => {}
  return dome
}
```

改 `applyAtmosphere` 吃 atmos（預設 dusk-taipei）：

```javascript
export function applyAtmosphere(scene, atmos = DUSK_TAIPEI) {
  const dome = createSkyDome(SKY_RADIUS, { top: atmos.top, horizon: atmos.horizon })
  scene.add(dome)
  scene.fog = new THREE.Fog(atmos.fogColor, atmos.fogNear, atmos.fogFar)
  scene.background = new THREE.Color(atmos.fogColor)
  return dome
}
```

新增 `setAtmosphere`（per-segment 重新著色；dome uniform + fog + background 就地更新）：

```javascript
/**
 * Recolour the existing sky dome + fog + background for a new segment, without
 * rebuilding the scene. Safe no-op on missing dome/scene.
 * @param {THREE.Scene} scene
 * @param {THREE.Mesh|null} dome  the mesh returned by applyAtmosphere (renderer.sky)
 * @param {{top:number,horizon:number,fogColor:number,fogNear:number,fogFar:number}} atmos
 */
export function setAtmosphere(scene, dome, atmos) {
  if (dome && dome.material && dome.material.uniforms) {
    dome.material.uniforms.topColor.value.setHex(atmos.top)
    dome.material.uniforms.horizonColor.value.setHex(atmos.horizon)
  }
  if (scene) {
    if (scene.fog) { scene.fog.color.setHex(atmos.fogColor); scene.fog.near = atmos.fogNear; scene.fog.far = atmos.fogFar }
    else scene.fog = new THREE.Fog(atmos.fogColor, atmos.fogNear, atmos.fogFar)
    scene.background = new THREE.Color(atmos.fogColor)
  }
}
```

- [ ] **Step 4: 跑，確認 PASS + 全套無回歸**

Run: `cd game && npx vitest run tests/sky.test.js && npm test`
Expected: sky 新測 PASS；全套綠（既有 sky 測仍過——舊 `SKY_TOP`/`applyAtmosphere(scene)` 無參時走 dusk-taipei 預設，行為改變僅在「顏色值」，既有測試若斷言舊藍 hex 需一併更新；若有，改成斷言 dusk 預設值）。

- [ ] **Step 5: Commit**

```bash
git add game/src/render/sky.js game/tests/sky.test.js
git commit -m "feat(m3-b): dusk sky presets (taipei/harbor) + setAtmosphere per-segment recolour (TDD)"
```

---

## Task B2：抽共用街景模組 streetKit（refactor，TDD）

**Files:**
- Create: `game/src/scene/streetKit.js`
- Test: `game/tests/scene/streetKit.test.js`
- Modify: `game/src/scene/OriginalEnvironment.js`（改 import，移除本地定義）

> 目的：讓 keeper 街景與 `AlleyScene` 共用同一套面分色塊體/亮窗/路燈詞彙（B4 要用）。這是 refactor——`buildOriginalEnvironment` 行為**零變更**，`OriginalEnvironment.test.js` 必須維持綠。

- [ ] **Step 1: 寫 streetKit 測試（先紅）**

```javascript
// game/tests/scene/streetKit.test.js
import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { shadedBox, streetlight, pushWindows, WINDOW_LIT, LAMP_COLOR } from '../../src/scene/streetKit.js'

describe('streetKit.shadedBox', () => {
  it('returns a box mesh with 6 per-face materials (fake key light)', () => {
    const m = shadedBox(2, 3, 4, 0x445566)
    expect(m).toBeInstanceOf(THREE.Mesh)
    expect(Array.isArray(m.material)).toBe(true)
    expect(m.material).toHaveLength(6)
    // +y (top, index 2) is the brightest face, -y (index 3) the darkest
    expect(m.material[2].color.getHSL({}).l).toBeGreaterThan(m.material[3].color.getHSL({}).l)
  })
})

describe('streetKit.streetlight', () => {
  it('returns a group with a pole + a lamp', () => {
    const g = streetlight(1, -5, 1)
    expect(g).toBeInstanceOf(THREE.Group)
    expect(g.children).toHaveLength(2)
  })
})

describe('streetKit.pushWindows', () => {
  it('accumulates window quad positions + colours into the acc buffers', () => {
    const acc = { pos: [], col: [] }
    let n = 0; const rng = () => (n++ % 7) / 7
    pushWindows(acc, 3, -10, 10, 12, rng)
    expect(acc.pos.length).toBeGreaterThan(0)
    expect(acc.pos.length).toBe(acc.col.length) // 1 colour triple per position triple
    expect(acc.pos.length % 9).toBe(0)           // 3 verts × 3 coords per triangle, 2 tris/quad → multiple of 9... (6 verts×3=18/quad)
  })
})

describe('streetKit palette', () => {
  it('exports the lit-window + lamp colours', () => {
    expect(Array.isArray(WINDOW_LIT)).toBe(true)
    expect(typeof LAMP_COLOR).toBe('number')
  })
})
```

> 註：`acc.pos.length % 9` 對 — 每窗 2 三角 ×3 頂點 ×3 座標 = 18，是 9 的倍數；保留此寬鬆守衛即可。

- [ ] **Step 2: 跑，確認 FAIL**（`streetKit.js` 不存在）

Run: `cd game && npx vitest run tests/scene/streetKit.test.js`
Expected: FAIL。

- [ ] **Step 3: 建 `game/src/scene/streetKit.js`**（從 `OriginalEnvironment.js` 原樣搬出，加 export）

```javascript
import * as THREE from 'three'

// Shared "downtown at dusk" street vocabulary — used by both the rail street
// (OriginalEnvironment) and the free-roam alley (AlleyScene) so they read as the
// same world. Unlit (MeshBasicMaterial); depth faked by per-face box shading +
// warm/cold lit windows. Extracted verbatim from OriginalEnvironment (no behaviour change).

export const WINDOW_LIT  = [0xffe6a8, 0xffd27a, 0xe9f0ff]
export const WINDOW_DARK = 0x1c2330
export const LAMP_COLOR  = 0xffeccb

/** BoxGeometry face order is [+x,-x,+y,-y,+z,-z]; shade each to fake a key light. */
export function shadedBox(w, h, d, baseHex) {
  const base = new THREE.Color(baseHex)
  const face = f => new THREE.MeshBasicMaterial({ color: base.clone().multiplyScalar(f) })
  const mats = [face(0.84), face(0.66), face(1.0), face(0.45), face(0.92), face(0.74)]
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats)
}

export function flatStrip(width, depth, color, y, x, z, { decorative = false } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ color }))
  m.rotation.x = -Math.PI / 2
  m.position.set(x, y, z)
  if (decorative) m.raycast = () => {}
  return m
}

/** Accumulate one wall's window grid into shared position/color buffers (x-constant face). */
export function pushWindows(acc, faceX, zCenter, depth, height, rng) {
  const WIN_W = 0.7, WIN_H = 1.0, GAP_Z = 1.3, GAP_Y = 1.6, MARGIN = 1.2
  const usableZ = depth - MARGIN * 2
  const usableY = height - MARGIN * 2
  if (usableZ < WIN_W || usableY < WIN_H) return
  const cols = Math.max(1, Math.floor(usableZ / GAP_Z))
  const rows = Math.max(1, Math.floor(usableY / GAP_Y))
  const z0 = zCenter - (cols - 1) * GAP_Z / 2
  for (let r = 0; r < rows; r++) {
    const cy = MARGIN + r * GAP_Y + WIN_H / 2
    for (let c = 0; c < cols; c++) {
      const cz = z0 + c * GAP_Z
      const lit = rng() < 0.45
      const hex = lit ? WINDOW_LIT[(rng() * WINDOW_LIT.length) | 0] : WINDOW_DARK
      const col = new THREE.Color(hex)
      const za = cz - WIN_W / 2, zb = cz + WIN_W / 2
      const ya = cy - WIN_H / 2, yb = cy + WIN_H / 2
      const quad = [
        [faceX, ya, za], [faceX, ya, zb], [faceX, yb, zb],
        [faceX, ya, za], [faceX, yb, zb], [faceX, yb, za],
      ]
      for (const [x, y, z] of quad) { acc.pos.push(x, y, z); acc.col.push(col.r, col.g, col.b) }
    }
  }
}

/** A streetlight: thin pole + a small bright lamp quad facing the road. */
export function streetlight(x, z, faceSign) {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.5, 6), new THREE.MeshBasicMaterial({ color: 0x14171c }))
  pole.position.set(x, 2.25, z)
  g.add(pole)
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.9), new THREE.MeshBasicMaterial({ color: LAMP_COLOR }))
  lamp.position.set(x - faceSign * 0.6, 4.4, z)
  g.add(lamp)
  return g
}
```

- [ ] **Step 4: 改 `OriginalEnvironment.js` 用 streetKit**（移除本地 `shadedBox`/`flatStrip`/`pushWindows`/`streetlight` 定義 + `WINDOW_LIT`/`WINDOW_DARK`/`LAMP_COLOR` 常數，改成 import；保留 `GROUND_COLOR`/`SIDEWALK_COLOR`/`LANE_COLOR`/`BUILDING_COLORS`/`mulberry32`/presets/`buildOriginalEnvironment` 不動）

在檔頭 import 後加：
```javascript
import { shadedBox, flatStrip, pushWindows, streetlight, WINDOW_LIT, WINDOW_DARK, LAMP_COLOR } from './streetKit.js'
```
並刪除本檔內這些的本地 `function`/`const` 定義（行為相同，故 `buildOriginalEnvironment` 不需改）。

- [ ] **Step 5: 跑，確認 PASS + OriginalEnvironment 零回歸**

Run: `cd game && npx vitest run tests/scene/streetKit.test.js tests/OriginalEnvironment.test.js && npm test`
Expected: streetKit 新測 PASS；`OriginalEnvironment.test.js` 維持綠（行為未變）；全套綠。

- [ ] **Step 6: Commit**

```bash
git add game/src/scene/streetKit.js game/tests/scene/streetKit.test.js game/src/scene/OriginalEnvironment.js
git commit -m "refactor(m3-b): extract shared streetKit (shadedBox/windows/streetlight) from OriginalEnvironment"
```

---

## Task B3：per-segment dusk 接線 + keeper 淡出守衛（Electron 驗）

**Files:**
- Modify: `game/src/darkline/darkline.js`（`enterRail`/`enterFree` 呼叫 `setAtmosphere`）

> Phase A 的 `applyAtmosphere` 已在 Renderer ctor 用 dusk-taipei 預設跑過（B1）；本 task 讓每段切換對的 atmos，並驗 keeper 遠樓乾淨溶進新 dusk 地平線（§4.2 護欄）。

- [ ] **Step 1: import**（`darkline.js` 檔頭，sky 旁）

```javascript
import { setAtmosphere, DUSK_TAIPEI, DUSK_HARBOR } from '../render/sky.js'
```

- [ ] **Step 2: rail 段依 preset 切 atmos**：在 `enterRail` 內、`renderer.scene.add(env)` 之後加：

```javascript
  setAtmosphere(renderer.scene, renderer.sky, data.preset === 'harbor' ? DUSK_HARBOR : DUSK_TAIPEI)
```
（`data.preset` 即 MISSION rail 段的 `preset`：`'taipei1950s'`→DUSK_TAIPEI、`'harbor'`→DUSK_HARBOR。若 `enterRail` 用別的變數名拿 preset，依實際改。）

- [ ] **Step 3: free 段用 dusk-taipei**：在 `enterFree` 內、`renderer.scene.add(group)` 之後加：

```javascript
  setAtmosphere(renderer.scene, renderer.sky, DUSK_TAIPEI)
```

- [ ] **Step 4: 測試 + build + 體積**

Run: `cd game && npm test && npm run build && npm run check:size`
Expected: 全綠 + build OK + 體積過（純接線，無新資產）。

- [ ] **Step 5: Electron CDP 驗 + keeper 淡出守衛**

dev server 在跑（5180）。截 rail1 / rail2boss(harbor) / free：
```bash
cd electron && DARKLINE_PORT=5180 DARKLINE_DEBUG_PORT=9222 npm start
node shot.cjs b3-rail1.png 5500 "document.getElementById('menu').classList.add('hidden'); window.__dl.seq.jumpTo('rail1')"
node shot.cjs b3-harbor.png 5500 "window.__dl.seq.jumpTo('rail2boss')"
node shot.cjs b3-free.png 5500 "window.__dl.seq.jumpTo('free')"
```
讀回三張，檢查：① 天空＝暖橘地平線→深藍頂的 dusk（不再藍天）；② **keeper 遠樓 + backdrop 乾淨溶進新地平線、無硬邊/banding seam**（若遠樓在霧裡突然斷掉或顏色硬切→回 B1 調 `DUSK_*.fogNear/fogFar` 或 horizon 飽和度，重 build 再截）；③ harbor 段是冷海霾、taipei 是暖霾；④ bloom（Phase A）讓亮窗/路燈在 dusk 下發光更明顯。

- [ ] **Step 6: Commit**

```bash
git add game/src/darkline/darkline.js
git commit -m "feat(m3-b): wire per-segment dusk atmosphere (taipei/harbor/alley) in darkline"
```

---

## Task B4：自由段巷弄升級到 keeper 詞彙（TDD + Electron）

**Files:**
- Modify: `game/src/darkline/free/AlleyScene.js`（`buildAlleyGroup` 用 streetKit）
- Test: `game/tests/darkline/alley.test.js`

> 全場最醜的一塊。`buildAlleyLayout`（純資料）不動；只升級 `buildAlleyGroup` 的視覺：面分色牆/攤、騎樓亮窗、路燈、封閉 backdrop，拉到與軌道街景同調。

- [ ] **Step 1: 先 Read `game/tests/darkline/alley.test.js`**，於末尾追加：

```javascript
import { buildAlleyLayout as _bl, buildAlleyGroup as _bg } from '../../src/darkline/free/AlleyScene.js'
import * as THREE from 'three'

describe('alley keeper-vocab upgrade', () => {
  it('walls are shaded boxes (multi-material), not flat single-material', () => {
    const g = _bg(_bl(1))
    const shaded = g.children.filter(c => c.isMesh && Array.isArray(c.material) && c.material.length === 6)
    expect(shaded.length).toBeGreaterThanOrEqual(2) // at least the two side walls
  })
  it('has a lit-window mesh and at least one streetlight group', () => {
    const g = _bg(_bl(1))
    const hasWindows = g.children.some(c => c.isMesh && c.geometry?.getAttribute?.('color'))
    const hasLamp = g.children.some(c => c.isGroup && c.children.length === 2)
    expect(hasWindows).toBe(true)
    expect(hasLamp).toBe(true)
  })
})
```

- [ ] **Step 2: 跑，確認 FAIL**（現巷弄是平板單材質）

Run: `cd game && npx vitest run tests/darkline/alley.test.js`
Expected: FAIL（新斷言）。

- [ ] **Step 3: 改 `buildAlleyGroup`**（`AlleyScene.js`；import streetKit，牆/攤改 `shadedBox`，加 `pushWindows` 騎樓窗 + `streetlight` + 封閉 backdrop。保留 floor / exit 光帶 / `buildAlleyLayout`）

檔頭加：
```javascript
import { shadedBox, pushWindows, streetlight } from '../../../scene/streetKit.js'
```
把 `buildAlleyGroup` 改為：
```javascript
export function buildAlleyGroup(layout) {
  const g = new THREE.Group()
  g.name = 'taipei_alley'
  const mat = hex => new THREE.MeshBasicMaterial({ color: hex })
  const minX = Math.min(...layout.segments.map(s => s.minX))
  const maxX = Math.max(...layout.segments.map(s => s.maxX))
  const minZ = Math.min(...layout.segments.map(s => s.minZ))
  const maxZ = Math.max(...layout.segments.map(s => s.maxZ))
  const midZ = (minZ + maxZ) / 2
  const lenZ = maxZ - minZ

  // 地面（保留平面；街面 y=0 grounding 不變）
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX + 2, lenZ + 2), mat(GROUND))
  floor.rotation.x = -Math.PI / 2
  floor.position.set((minX + maxX) / 2, 0, midZ)
  g.add(floor)

  // 兩側牆＝面分色塊體（騎樓壁），各帶一面亮窗
  const win = { pos: [], col: [] }
  for (const side of [-1, 1]) {
    const wx = side === -1 ? layout.segments[0].minX : layout.segments[0].maxX
    const wall = shadedBox(0.4, 5, lenZ, side === -1 ? 0x39322b : 0x332d27)
    wall.position.set(wx, 2.5, midZ)
    g.add(wall)
    // 街面朝向的窗（牆內側面）
    const faceX = wx - side * 0.22
    pushWindows(win, faceX, midZ, lenZ, 5, () => 0.3) // 決定性：偏多亮窗（巷弄燈火）
  }
  if (win.pos.length) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(win.pos, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(win.col, 3))
    const windows = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }))
    windows.name = 'alley_windows'
    g.add(windows)
  }

  // 攤位＝面分色木箱
  for (const o of layout.obstacles) {
    const box = shadedBox(o.maxX - o.minX, 1.1, o.maxZ - o.minZ, STALL)
    box.position.set((o.minX + o.maxX) / 2, 0.55, (o.minZ + o.maxZ) / 2)
    g.add(box)
  }

  // 一盞路燈（巷中段）+ 封閉 backdrop（巷尾，免露天空洞）
  g.add(streetlight(layout.segments[0].minX + 0.4, midZ, -1))
  const backdrop = shadedBox(maxX - minX + 6, 7, 0.6, 0x2c2620)
  backdrop.position.set((minX + maxX) / 2, 3.5, minZ - 0.6)
  g.add(backdrop)

  // 出口光帶（保留）
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), mat(EXIT))
  exit.rotation.x = -Math.PI / 2
  exit.position.set((layout.exitTrigger.minX + layout.exitTrigger.maxX) / 2, 0.02, (layout.exitTrigger.minZ + layout.exitTrigger.maxZ) / 2)
  g.add(exit)
  return g
}
```
> 註：import 路徑 `'../../../scene/streetKit.js'` —— `AlleyScene.js` 在 `game/src/darkline/free/`，`streetKit.js` 在 `game/src/scene/`，故 `../../../scene/`。實作時用相對 `src` 結構核對；錯了 build 會立刻報。

- [ ] **Step 4: 跑，確認 PASS + 全套 + build**

Run: `cd game && npx vitest run tests/darkline/alley.test.js && npm test && npm run build && npm run check:size`
Expected: alley 新測 PASS；全套綠（`clamp`/`freeroam` 等用 `buildAlleyLayout` 的測試不受影響——layout 未動）；build + 體積過。

- [ ] **Step 5: Electron 驗**：`shot.cjs b4-free.png 5500 "...jumpTo('free')"` → 讀回確認巷弄=面分色牆+亮窗+路燈+封閉巷尾，與軌道街景同調、不再平板 debug 盒；sprite 敵仍在、可走動。

- [ ] **Step 6: Commit**

```bash
git add game/src/darkline/free/AlleyScene.js game/tests/darkline/alley.test.js
git commit -m "feat(m3-b): upgrade free-roam alley to keeper street vocab (shaded walls/windows/lamp/backdrop)"
```

---

## Task B5（可選，較輕）：場景點綴 — 招牌 / 塵霧 / harbor 水面

**Files:**
- Modify: `game/src/scene/streetKit.js`（加 `hangingSign(...)` + 可選 `dustLayer(...)`）
- Modify: `game/src/scene/OriginalEnvironment.js`（per-preset 掛招牌；HARBOR 加水面）

> spec §4.5。**可選、可迭代**——B1–B4 已把「天空打架」「巷弄最醜」兩大硬傷解掉；點綴是錦上添花。建議做完 B1–B4 的 Electron 對味（B6）後，依用戶想加什麼再做對應子項：
> - **吊掛招牌/橫幅**：`hangingSign(w,h,colorHex)` 回傳帶琥珀邊的 quad，沿街 bay 掛（資料驅動，呼應 #e8c87a UI motif）。
> - **塵霧層**：相機前一層 cheap additive `THREE.Points` 或緩慢飄移半透明 plane，密度依段落（巷弄較濃）。
> - **harbor 水面**：`HARBOR_PRESET` 加一張帶輕微 UV 捲動的水面 plane + 碼頭 box，取代「又一條街」。
>
> 每子項：streetKit 純 builder 加單測（回傳物件結構）→ 接進 environment → Electron 看份量。完成各自 commit `feat(m3-b): scene dressing — <子項>`。

---

## Task B6：整輪驗證 + Phase B 檢查點

**Files:** 無（驗證）

- [ ] **Step 1: 全自動驗**：`cd game && npm test && npm run build && npm run check:size` → 全綠 + 體積過。
- [ ] **Step 2: Claude 端 CDP 截圖**：rail1（taipei dusk）/ rail2boss（harbor 冷海霾）/ free（升級巷弄）三張，確認與 Phase A 的 bloom/grade 疊起來協調、keeper 遠樓乾淨溶入、無爆白/硬邊。
- [ ] **Step 3: 用戶 Electron 對味（檢查點）**：判 ① dusk 天空與暖街景同調了嗎（不再打架）；② keeper 遠樓淡出乾淨；③ 自由段巷弄拉到 keeper 調性了嗎；④ harbor 段有海港感（vs 又一條街）；⑤ 整體（A 後處理 + B 氛圍）電影感對味。
- [ ] **Step 4: 依回饋微調**（B1 atmos 顏色/霧距 或 B4 巷弄細節 或 B5 點綴）→ 重跑 Step 1–2。
- [ ] **Step 5: Phase B 收**：用戶過 → 進 **Phase C（UI 諜報化：OFL 字型 + design token + HUD restyle + loading boot + GSAP 轉場 + 解碼招牌時刻 + 最小手機 holding-state）**。

---

## Self-Review（plan 對 spec §4 自查）

- **spec §4 覆蓋**：§4.1 dusk 天空參數化 + per-segment 霧 + setAtmosphere ✅ B1+B3；§4.2 keeper 淡出護欄 ✅ B3 Step 5（明列「遠樓硬邊→回調 fog/horizon」）；§4.3 抽 shadedBox/pushWindows/streetlight 共用模組 ✅ B2；§4.4 巷弄升級 keeper 詞彙 ✅ B4；§4.5 點綴（招牌/塵霧/水面）✅ B5（可選、bounded）；§4 檢查點 ✅ B6。
- **keeper 鐵律**：B2 是零行為變更 refactor（OriginalEnvironment.test 守）；B1 改天空顏色（疊在 keeper 上、不動街景幾何），B3 明列護欄重驗遠樓淡出——不打掉重建。
- **無佔位**：B1–B4 給完整 before/after 程式 + 測試 + 指令；B5 明標「可選、較輕」並列出各子項的 builder 簽名與做法（非藏佔位——它是 spec 標的可選點綴，完成 B1–B4 後依用戶意願迭代）。
- **型別/命名一致**：`setAtmosphere`/`DUSK_TAIPEI`/`DUSK_HARBOR`（B1）↔ B3 import 一致；`shadedBox`/`pushWindows`/`streetlight`/`flatStrip`（streetKit B2）↔ OriginalEnvironment(B2)/AlleyScene(B4) import 一致。
- **測試現實**：THREE 幾何/材質 builder 在 jsdom 可建構 → B1/B2/B4 純結構斷言 TDD；實際渲染（天空色、bloom 疊加、淡出無硬邊）走 Electron CDP（B3/B4/B6），符合專案模式。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-22-darkline-m3-phase-b-atmosphere.md`. 兩種執行：

**1. Subagent-Driven（建議）** — 每 task 派新 Opus subagent、task 間 spec+quality 雙審、逐 task commit；B3/B4/B6 的 Electron CDP 截圖由主控端驅動，最終對味 B6 用戶親驗。
**2. Inline Execution** — 本 session 直接逐 task、到 B6 檢查點停給用戶 Electron 判。

哪一種？（B5 點綴預設列「可選」，B1–B4 為核心；你也可指定只做核心、點綴之後再說。）
