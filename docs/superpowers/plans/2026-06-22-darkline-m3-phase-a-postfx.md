# DARKLINE M3 Phase A — 後處理電影感層 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在共用 `Renderer` 加一條 cinematic 後處理管線（`pmndrs/postprocessing` EffectComposer：tone mapping + 亮度門檻 bloom + 暖色分級 + 暈影 + film grain + 微色差），讓 keeper 夕陽街景一口氣升到電影感、保留塊狀平塗手感、維持 60fps。

**Architecture:** 純參數/設定抽進可單元測的 `cinematicConfig.js`（TDD）。組裝層 `postfx.js` 用 `postprocessing` 把參數變成 EffectComposer（吃 WebGL、jsdom 測不了 → Electron CDP 截圖驗）。`Renderer` 加 `{ cinematic }` 旗標：開時 clamp pixelRatio、建 composer、`render()` 走 `composer.render()`、resize 同步 composer；關時維持原 `webgl.render()`（零回歸）。`darkline.js` 開 `{ cinematic: true }`。

**Tech Stack:** Vite 6 + Three.js r0.168 + **`postprocessing`（pmndrs）pin `^6.37.0`**（相容 three 0.168）；Vitest 2（純函式）；Electron 真實視窗 + `electron/shot.cjs`（CDP 截圖驗視覺，見 `electron/README.md`）。

**權威 spec：** [M3 視覺外觀層 design](../specs/2026-06-22-darkline-m3-visual-layer-design.md) §3（Phase A）+ §0 keeper 鐵律。

> **對 spec 的一個務實取捨（已標，待用戶可否決）：** spec §3.2 把「LUT 色彩分級」列為首選。LUT 需要一張**手調的 `.cube` 資產**（對味/內容工）。為了讓 Phase A 自足、不卡在資產製作，本計畫**用 pmndrs 的程式化暖色分級（BrightnessContrast + HueSaturation，參數在 config、可單元測、Electron 即時調）當預設**，把「載入手調 LUT `.cube`」列為**可選精修 Task A5**（之後用戶要更細的調色再做）。dusk 街景本身已暖 + bloom + 程式化 grade 已能到味；LUT 是錦上添花、非阻塞。

---

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `game/src/render/cinematicConfig.js` | Create | **純**：`clampPixelRatio` + `DEFAULT_CINEMATIC` 參數 + `resolveCinematic(overrides)` 合併。可單元測。 |
| `game/tests/render/cinematicConfig.test.js` | Create | TDD：clamp 邊界 + 參數合併 + 預設範圍守衛。 |
| `game/src/render/postfx.js` | Create | 組裝層：`createCinematicComposer(webgl, scene, camera, cfg)` → EffectComposer（RenderPass + EffectPass[tone/grade/bloom/vignette/grain/CA] + OutputPass）。吃 WebGL，Electron 驗。 |
| `game/src/render/Renderer.js` | Modify | `constructor(container, opts={})`：`opts.cinematic` 時 clamp pixelRatio + 建 composer；`render()` 走 composer；`_onResize` 同步 composer。非 cinematic 維持原樣。 |
| `game/src/darkline/darkline.js:38` | Modify（1 行）| `new Renderer(el, { cinematic: true })` |
| `game/package.json` | Modify | deps 加 `"postprocessing": "^6.37.0"` |

> **KEEP 不動：** `sky.js`（Phase B 才換 dusk 天空）、`unlit.js`、`OriginalEnvironment.js`（keeper）、HUD/其餘引擎。Phase A 只加後處理、不碰場景幾何與天空。

---

## Task A1：cinematic 純參數模組（TDD）

**Files:**
- Create: `game/src/render/cinematicConfig.js`
- Test: `game/tests/render/cinematicConfig.test.js`

- [ ] **Step 1: 寫失敗測試**

```javascript
// game/tests/render/cinematicConfig.test.js
import { describe, it, expect } from 'vitest'
import { clampPixelRatio, DEFAULT_CINEMATIC, resolveCinematic } from '../../src/render/cinematicConfig.js'

describe('clampPixelRatio', () => {
  it('clamps to max 2 by default', () => {
    expect(clampPixelRatio(3)).toBe(2)
    expect(clampPixelRatio(1.5)).toBe(1.5)
  })
  it('honours a custom max', () => {
    expect(clampPixelRatio(3, 1.5)).toBe(1.5)
  })
  it('falls back to 1 for bad input', () => {
    expect(clampPixelRatio(0)).toBe(1)
    expect(clampPixelRatio(NaN)).toBe(1)
    expect(clampPixelRatio(undefined)).toBe(1)
  })
})

describe('cinematic config', () => {
  it('exposes sane defaults in range', () => {
    expect(DEFAULT_CINEMATIC.bloom.luminanceThreshold).toBeGreaterThan(0)
    expect(DEFAULT_CINEMATIC.bloom.luminanceThreshold).toBeLessThan(1)
    expect(DEFAULT_CINEMATIC.toneMapping).toBe('ACES_FILMIC')
    expect(DEFAULT_CINEMATIC.vignette.darkness).toBeGreaterThan(0)
  })
  it('deep-merges overrides without mutating the default', () => {
    const r = resolveCinematic({ bloom: { intensity: 2 } })
    expect(r.bloom.intensity).toBe(2)
    expect(r.bloom.luminanceThreshold).toBe(DEFAULT_CINEMATIC.bloom.luminanceThreshold) // untouched
    expect(r.vignette.darkness).toBe(DEFAULT_CINEMATIC.vignette.darkness)
    expect(DEFAULT_CINEMATIC.bloom.intensity).not.toBe(2) // default not mutated
  })
})
```

- [ ] **Step 2: 跑，確認 FAIL**

Run: `cd game && npx vitest run tests/render/cinematicConfig.test.js`
Expected: FAIL（module not found）。

- [ ] **Step 3: 實作**

```javascript
// game/src/render/cinematicConfig.js
// Pure cinematic-postfx params + helpers. No three.js / WebGL here so it unit-tests
// cleanly; postfx.js turns these numbers into real effects.

export function clampPixelRatio(dpr, max = 2) {
  if (!Number.isFinite(dpr) || dpr <= 0) return 1
  return Math.min(dpr, max)
}

// Warm-amber dusk noir, tuned to bloom the lit windows / lamps / muzzle / amber UI
// without washing out the keeper's flat block shading. All Electron-tunable.
export const DEFAULT_CINEMATIC = {
  toneMapping: 'ACES_FILMIC',        // postfx maps to ToneMappingMode
  bloom: { luminanceThreshold: 0.62, intensity: 0.9, radius: 0.72 },
  grade: { brightness: -0.015, contrast: 0.10, saturation: 0.12 }, // gentle: keep flat blocks readable
  vignette: { offset: 0.30, darkness: 0.72 },
  noise: { opacity: 0.055 },          // film grain — hides banding in flat fills
  chromaticAberration: { offset: 0.0009 }, // <1.5px feel; subtle CRT
}

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v) }

export function resolveCinematic(overrides = {}) {
  const merge = (base, ov) => {
    const out = Array.isArray(base) ? [...base] : { ...base }
    for (const k of Object.keys(ov || {})) {
      out[k] = isObj(base[k]) && isObj(ov[k]) ? merge(base[k], ov[k]) : ov[k]
    }
    return out
  }
  return merge(DEFAULT_CINEMATIC, overrides)
}
```

- [ ] **Step 4: 跑，確認 PASS**

Run: `cd game && npx vitest run tests/render/cinematicConfig.test.js`
Expected: PASS（全部）。

- [ ] **Step 5: Commit**

```bash
git add game/src/render/cinematicConfig.js game/tests/render/cinematicConfig.test.js
git commit -m "feat(m3-a): cinematic postfx config — pure params + clampPixelRatio (TDD)"
```

---

## Task A2：postfx 組裝 + Renderer cinematic 接線（整合，Electron 驗）

**Files:**
- Modify: `game/package.json`（加 `postprocessing` dep）
- Create: `game/src/render/postfx.js`
- Modify: `game/src/render/Renderer.js`
- Modify: `game/src/darkline/darkline.js:38`

> 本 task 把後處理「接上去且能跑」。視覺對味在 A2 末段用 Electron CDP 截圖驗（隱藏 preview rAF 凍、見 [[project-vc2-env-gotchas]]）。

- [ ] **Step 1: 裝 dep**

Run: `cd game && npm install postprocessing@^6.37.0`
Expected: `package.json` deps 出現 `"postprocessing": "^6.37.0"`，`package-lock.json` 更新，無 peer 衝突（相容 three 0.168）。

- [ ] **Step 2: 寫 `postfx.js`（組裝層）**

```javascript
// game/src/render/postfx.js
// Builds the cinematic EffectComposer from a resolved cinematicConfig.
// Uses pmndrs/postprocessing: effects merge into one EffectPass (≈ one
// fullscreen draw) so the whole stack stays cheap on an unlit scene.
import * as THREE from 'three'
import {
  EffectComposer, RenderPass, EffectPass,
  ToneMappingEffect, ToneMappingMode,
  BrightnessContrastEffect, HueSaturationEffect,
  BloomEffect, VignetteEffect, NoiseEffect, ChromaticAberrationEffect,
  BlendFunction,
} from 'postprocessing'

export function createCinematicComposer(webgl, scene, camera, cfg) {
  const composer = new EffectComposer(webgl)
  composer.addPass(new RenderPass(scene, camera))

  const tone = new ToneMappingEffect({
    mode: ToneMappingMode[cfg.toneMapping] ?? ToneMappingMode.ACES_FILMIC,
  })
  const grade = new BrightnessContrastEffect({
    brightness: cfg.grade.brightness, contrast: cfg.grade.contrast,
  })
  const hueSat = new HueSaturationEffect({ saturation: cfg.grade.saturation })
  const bloom = new BloomEffect({
    luminanceThreshold: cfg.bloom.luminanceThreshold,
    intensity: cfg.bloom.intensity,
    radius: cfg.bloom.radius,
    mipmapBlur: true,                 // cheap multi-tap blur
  })
  const vignette = new VignetteEffect({ offset: cfg.vignette.offset, darkness: cfg.vignette.darkness })
  const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY })
  noise.blendMode.opacity.value = cfg.noise.opacity
  const ca = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(cfg.chromaticAberration.offset, cfg.chromaticAberration.offset),
  })

  // Merge order: scene render → tonemap → grade → bloom (own convolution) →
  // vignette → grain → CA → output color/space.
  // pmndrs EffectComposer handles final output/colour-space itself — no OutputPass
  // (that symbol is three.js examples/jsm-only).
  composer.addPass(new EffectPass(camera, tone, grade, hueSat, bloom, vignette, noise, ca))
  return composer
}
```

- [ ] **Step 3: 改 `Renderer.js`（cinematic 旗標 + composer）**

把 imports + class 改成（保留既有 sky/unlit 行為；非 cinematic 路徑完全不變）：

```javascript
import * as THREE from 'three'
import { applyAtmosphere, updateSky } from './sky.js'
import { clampPixelRatio, resolveCinematic } from './cinematicConfig.js'
import { createCinematicComposer } from './postfx.js'

export class Renderer {
  /** @type {THREE.WebGLRenderer} */ webgl
  /** @type {THREE.Scene} */ scene
  /** @type {THREE.PerspectiveCamera} */ camera
  /** @type {THREE.Mesh} */ sky
  /** @type {import('postprocessing').EffectComposer|null} */ composer = null

  constructor(container, opts = {}) {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000)
    this.sky = applyAtmosphere(this.scene)

    this.webgl = new THREE.WebGLRenderer({ antialias: !opts.cinematic }) // composer does its own AA when cinematic
    this.webgl.setPixelRatio(opts.cinematic ? clampPixelRatio(window.devicePixelRatio) : window.devicePixelRatio)
    this.webgl.setSize(window.innerWidth, window.innerHeight)
    this.webgl.toneMapping = THREE.NoToneMapping // tone mapping handled in the post pass
    container.appendChild(this.webgl.domElement)

    if (opts.cinematic) {
      const cfg = resolveCinematic(opts.cinematic === true ? {} : opts.cinematic)
      this.composer = createCinematicComposer(this.webgl, this.scene, this.camera, cfg)
    }

    window.addEventListener('resize', () => this._onResize())
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.webgl.setSize(w, h)
    if (this.composer) this.composer.setSize(w, h)
  }

  render() {
    updateSky(this.sky, this.camera)
    if (this.composer) this.composer.render()
    else this.webgl.render(this.scene, this.camera)
  }
}
```

- [ ] **Step 4: 開 darkline 的 cinematic**（`game/src/darkline/darkline.js:38`）

把：
```javascript
const renderer = new Renderer(document.getElementById('c'))
```
改為：
```javascript
const renderer = new Renderer(document.getElementById('c'), { cinematic: true })
```

- [ ] **Step 5: 測試 + build + 體積守衛**

Run: `cd game && npm test && npm run build && npm run check:size`
Expected: 純函式測試全綠（cinematicConfig 新測 + 既有 265）；`vite build` 成功（解析得到 `postprocessing`）；體積守衛：新增 postprocessing 後首載仍 < 1465 KB（預估 ~230–260 KB gz，遠低於上限）。**記錄 check:size 的 TOTAL。**

- [ ] **Step 6: Electron CDP 截圖驗（視覺活著、無 console 錯、scene 仍在）**

先確保 dev server 在跑（`cd game && npm run dev`，記 port，假設 5180）。截 rail1：
```bash
cd electron && DARKLINE_PORT=5180 DARKLINE_DEBUG_PORT=9222 npm start   # 背景另一個終端
node shot.cjs a2-rail1.png 5000 "document.getElementById('menu').classList.add('hidden'); window.__dl.seq.jumpTo('rail1')"
```
Expected: `a2-rail1.png` 渲染出夕陽街景（**現在經 ACES tone map + bloom + 暈影 + grain**）；亮窗/路燈有光暈、四角有暈影、整體不過曝、塊狀平塗仍可辨。**用 `window.__dl` 確認 console 無錯**（`shot.cjs` 不報錯即基本 OK）。把截圖讀回（Read image）人工確認沒糊掉/沒爆白。

- [ ] **Step 7: Commit**

```bash
git add game/package.json game/package-lock.json game/src/render/postfx.js game/src/render/Renderer.js game/src/darkline/darkline.js
git commit -m "feat(m3-a): cinematic EffectComposer — ACES + threshold bloom + grade + vignette + grain + CA (darkline only)"
```

---

## Task A3：對味調參（bloom 門檻 / grade 強度 / 暈影）— Electron 迭代

**Files:**
- Modify: `game/src/render/cinematicConfig.js`（只調 `DEFAULT_CINEMATIC` 數值）

> 這 task 不寫新邏輯，是用 Electron 把預設參數調到「電影感但保 keeper 塊狀調」。每次只改 `cinematicConfig.js` 的數值（A1 的測試對範圍而非確切值，故不破測試），重 build + 截圖看。

- [ ] **Step 1: 抓 before/after 對照**：用 Task A2 的 `shot.cjs` 截 rail1 + free（`jumpTo('free')`）兩段，對照 Phase A 前的舊截圖。檢查清單：① 亮窗/路燈/槍口有 bloom 但不溢出整片；② 四角暈影聚焦、不過黑；③ grain 看得出顆粒但不雜訊化；④ 色差 <1.5px、不像 bug；⑤ 夕陽街景塊狀平塗仍清楚（沒被 tone map 洗白/糊）。
- [ ] **Step 2: 依檢查表微調** `DEFAULT_CINEMATIC`（如 bloom 太強 → 調高 `luminanceThreshold` 或調低 `intensity`；太平 → 反之；過曝 → grade.brightness 更負）。每改一次：`npm run build` → `shot.cjs` → Read 圖。
- [ ] **Step 3: 全測試 + 體積**：`cd game && npm test && npm run build && npm run check:size`，全綠 + 體積過。
- [ ] **Step 4: Commit**

```bash
git add game/src/render/cinematicConfig.js
git commit -m "feat(m3-a): tune cinematic defaults — bloom/grade/vignette for dusk keeper street"
```

> **註：** 最終「對不對味」是用戶 Electron 判（A6 檢查點）；本 task 先收斂到一個 Claude 端截圖看來合理的預設。

---

## Task A4（可選，預設 OFF）：PS1 低解析 + vertex jitter 實驗旗標

**Files:**
- Modify: `game/src/render/cinematicConfig.js`（加 `ps1: { enabled: false, ... }`）
- Modify: `game/src/render/postfx.js`（enabled 時加 `PixelationEffect` 或低解析 RT）
- Modify: `game/src/render/Renderer.js`（傳 ps1 設定）

> spec §3.6：又快又賺 Creativity 分，但可能跟 keeper 手感衝突 → **shipped 預設 OFF**，用戶 Electron 對味才轉 ON（轉 ON 是一行 `cinematicConfig` 改）。**Phase A 不因此 task 卡住**——A2/A3 完成即可進 A6 檢查點；A4 可在檢查點時依用戶意願做或跳過。

- [ ] **Step 1:** `cinematicConfig.js` 的 `DEFAULT_CINEMATIC` 加 `ps1: { enabled: false, granularity: 3.0 }`，並在 A1 測試加一條「`DEFAULT_CINEMATIC.ps1.enabled === false`（shipped OFF）」。
- [ ] **Step 2:** `postfx.js` 在 `cfg.ps1.enabled` 時，於 EffectPass 末端加 `new PixelationEffect(cfg.ps1.granularity)`（import 自 `postprocessing`）。
- [ ] **Step 3:** 測試 + build + 體積綠；Electron 開旗標截圖看對味。
- [ ] **Step 4:** Commit `feat(m3-a): optional PS1 pixelation flag (default OFF)`。

---

## Task A5（可選精修）：LUT 暖琥珀分級槽

**Files:**
- Modify: `game/src/render/postfx.js`（加 `LUT3DEffect`/`LUTEffect` 槽，載 `/darkline/luts/*.cube`）
- Create: `game/public/darkline/luts/<amber-noir>.cube`（用戶/Claude 在 DaVinci/PS 由中性 identity strip 調出）

> spec §3.2 的「真 LUT」精修。需一張手調 `.cube`（對味/內容工，登 `CREDITS.md`）。**非阻塞**——A2 的程式化 grade 已給 mood；要更細的調色再做此 task。LUT 數 KB、計入 §6 預算（仍遠低於上限）。

- [ ] 待用戶要做時，另出細步驟（載 LUT 紋理 → `LUTEffect` 接進 EffectPass grade 位置 → Electron 對味）。

---

## Task A6：整輪驗證 + Phase A 檢查點

**Files:** 無（驗證）

- [ ] **Step 1: 全套自動驗**：`cd game && npm test && npm run build && npm run check:size` → 全綠 + 體積過（記 TOTAL）。
- [ ] **Step 2: Claude 端 CDP 截圖**：rail1 + free + 解碼面板（招牌時刻的琥珀）三張，確認 bloom/grade/暈影/grain 一致、無爆白/糊化、console 無錯。
- [ ] **Step 3: 用戶 Electron 對味（檢查點，Claude 代替不了）**：依 `electron/README.md` 真實視窗走 rail1→free，判：① 電影感夠不夠、有沒有過頭；② keeper 夕陽塊狀調**沒被洗白/糊掉**；③ 亮窗/路燈/槍火/解碼琥珀的 bloom 份量對嗎；④ **60fps**＝參考機 integrated-GPU 筆電 @1080p、`devicePixelRatio` clamp ≤2，frame-time p95 < 16.6ms 持續 30s（可用 `stats.js` 或 `performance` 量）；⑤ PS1 jitter（A4）要不要開。
- [ ] **Step 4: 依回饋微調**（改 `cinematicConfig` 數值 / 開關 A4 / 決定 A5）→ 重跑 Step 1–2。
- [ ] **Step 5: Phase A 收**：用戶對味過 → 進 **Phase B（dusk 天空 + per-segment 霧 + 巷弄升級）**（吃 A 的 bloom）。

---

## Self-Review（plan 對 spec §3 自查）

- **spec §3 覆蓋**：§3.1 EffectComposer（pmndrs，pin ^6.37.0）✅ A2；§3.2 合併 EffectPass（tone/grade/bloom/vignette/grain/CA）✅ A2 postfx；§3.3 **亮度門檻 bloom**（`BloomEffect.luminanceThreshold`，非按物件選——避開「亮窗烤進單一 mesh」坑）✅ A1/A2；§3.4 tone mapping NoToneMapping→ACES + 不洗白（gentle grade + Electron 把關）✅ A1/A3；§3.5 pixelRatio clamp ✅ A1 `clampPixelRatio` + A2、SMAA（pmndrs 的 EffectPass/SMAA——註：本計畫先靠 composer 預設 AA + `antialias:!cinematic`，若 Electron 看到鋸齒明顯，A3 微調時加 `SMAAEffect`，已備案）；§3.6 PS1 旗標預設 OFF ✅ A4；§3 檢查點（含 60fps 參考機/量法）✅ A6。
- **LUT 取捨**：spec §3.2「LUT 首選」→ 本計畫程式化 grade 當預設、LUT 列可選 A5，已於檔頭明標理由（不卡資產製作）。**待用戶可否決**。
- **無佔位**：A1 給完整純函式 + 測試；A2 給完整 postfx/Renderer/darkline 改動 + dep 指令 + Electron 驗法；A4/A5 明標「可選」且 A5 的細步驟誠實標「待要做時另出」（非藏佔位——它是可選精修、預設不做）。
- **型別/命名一致**：`clampPixelRatio`/`resolveCinematic`/`DEFAULT_CINEMATIC`/`createCinematicComposer` 跨 task 一致；`opts.cinematic`（Renderer）↔ darkline 傳 `{ cinematic: true }` 一致。
- **測試現實**：WebGL 在 jsdom 測不了 → 純參數 TDD（A1）、組裝/視覺走 Electron CDP（A2/A3/A6），符合專案既有驗證模式。
- **零回歸**：非 cinematic 路徑（`new Renderer(el)` 無 opts）行為完全不變；但現在只有 darkline 用 Renderer，且它開 cinematic。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-22-darkline-m3-phase-a-postfx.md`. 兩種執行方式：

**1. Subagent-Driven（建議）** — 每 task 派新 Opus subagent、task 間 spec+quality 雙審、逐 task commit。注意 A2/A3/A6 的「Electron CDP 截圖驗」要主控端起 dev server + Electron（subagent 可跑 `shot.cjs`，但「對不對味」最終是用戶 A6 親驗）。
**2. Inline Execution** — 本 session 直接逐 task 執行、到 A6 檢查點停給用戶 Electron 判。

哪一種？（也提醒：spec §3.2 的 LUT 取捨——程式化 grade 當預設、LUT 列可選 A5——你接受嗎？要的話我把 A5 提成預設必做。）
