# DARKLINE M1 可玩骨架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在乾淨的 `game/src/darkline/` 命名空間下，把 1953 台北首部曲任務的「可玩骨架」端到端搭起來——簡報→軌道1→自由段→軌道2/Boss→結尾一條任務跑通、可存檔讀回、滑鼠手感（兩模型＋輕磁吸）可玩，佔位美術。

**Architecture:** 照「接縫骨架優先」：先建段落狀態機＋rail↔free 相機接管/輸入切換/存檔（兩段先 stub 跑通整流程），再深做自由段 production，再接重用引擎的軌道段，最後整合潤飾。純邏輯模組小而純、走 TDD；整合/視覺/手感走 preview 手動驗收。與 production `scene/gameplay/level` **零交叉改**，只「重用」其匯出的類別/函式。不沿用 m0 spike（純邏輯演算法可參考，但乾淨重寫）。

**Tech Stack:** three.js ^0.168（ESM）、Vite 6、Vitest 2。重用引擎：`render/Renderer`、`GameLoop`、`render/CameraRig`（curve 模式）、`scene/OriginalEnvironment`、`gameplay/EnemyManager`＋`Projectile`＋lock-on、`gameplay/BossController`、`gameplay/Shooter`、`input/InputManager`、`hud/HUD`、`audio/AudioManager`。

> **模型分工（承用戶要求）：** 純邏輯/規格明確 → **Sonnet**；接縫整合/視覺/手感/延遲判斷 → **Opus**。**每個 Phase 結尾有一個「Opus 統一檢查」檢查點**，用戶過了才進下一 Phase（方便切 session、評估 token）。

> **權威上游：** spec `docs/superpowers/specs/2026-06-15-darkline-m1-playable-skeleton-design.md`。有疑問先讀 spec，不要憑記憶。

---

## 檔案結構（先鎖分工）

| 檔案 | 責任 | 可測 |
|---|---|---|
| `game/src/darkline/core/i18n.js` | `t(key)` 查語言字典、缺鍵 echo、變數插值（純函式） | ✅ TDD |
| `game/src/locales/zh.json` | 繁中字串字典（簡報/結尾/HUD/字卡） | — |
| `game/src/darkline/core/SaveStore.js` | 段落級存檔往返 localStorage（注入 storage 可測） | ✅ TDD |
| `game/src/darkline/core/cards.js` | 簡報/結尾純文字 overlay（走 i18n） | 部分 TDD |
| `game/src/darkline/mission/MissionSequencer.js` | 段落狀態機（onEnter/onExit、注入段落表） | ✅ TDD |
| `game/src/darkline/mission/missions/first-island-chain.js` | 任務資料：段落表＋每段模式＋railPath/波次/巷弄 layout | 部分 TDD（結構不變式） |
| `game/src/darkline/mission/SeamController.js` | 接縫整合膠水：套相機控制者/輸入模式/存檔（純 payload 助手可測） | 部分 TDD |
| `game/src/darkline/free/clamp.js` | 房間「AABB 段清單」聯集夾擠＋障礙推出（純函式） | ✅ TDD |
| `game/src/darkline/free/FreeRoamController.js` | PointerLock WASD＋滑鼠看，位置過 clamp（純 moveDelta 可測） | ✅ TDD（moveDelta） |
| `game/src/darkline/free/WanderAI.js` | 最簡敵人 AI：逼近→停→射（純函式 step） | ✅ TDD |
| `game/src/darkline/free/AlleyScene.js` | 程序生成線性 L 巷弄（taipei 佔位）→ group＋room 段＋障礙＋出入點 | 部分 TDD（決定性） |
| `game/src/darkline/combat/aimAssist.js` | 輕量磁吸（準心＋目標 NDC＋力度 → 輔助瞄準點，純函式） | ✅ TDD |
| `game/src/darkline/combat/palette.js` | RGBA 量化到固定調色盤（純函式） | ✅ TDD |
| `game/src/darkline/combat/buildSprite.js` | 瀏覽器端 PNG→palette→canvas（M1 放寬 size/色數） | 手動 |
| `game/src/darkline/combat/BillboardSprite.js` | 公告板 sprite：UV 視窗＋角度選格 | ✅ TDD（UV/選格） |
| `game/src/darkline/darkline.js` | 整合層：接重用引擎＋串四段＋接縫 | 手動 |
| `game/darkline.html` | 任務入口頁（獨立於主 index.html / m0.html） | 手動 |
| `game/src/scene/OriginalEnvironment.js` | **小幅加** `TAIPEI1950S_PRESET`/`HARBOR_PRESET`＋騎樓柱（只加匯出，不改既有路徑） | ✅ TDD（preset） |
| `game/tests/darkline/*.test.js` | 上述純邏輯測試 | — |

> 全部新檔在 `darkline/` 命名空間下；唯一動到 production 的是 `OriginalEnvironment.js` **新增匯出**（Task C1，不改既有 `buildOriginalEnvironment`/`DOWNTOWN_PRESET`，零回歸）。

---

# Phase A — 骨架與接縫（先釘住 M1 真正的新風險）

> 目標：段落狀態機＋相機接管/輸入切換/存檔，**兩段先 stub**，把「簡報→軌道→自由→軌道→結尾」整流程＋接縫的輸入模式切換跑通。這是 M1 的去風險核心。

### Task A1: i18n（`t()` 純函式＋zh 字典）

**建議模型：** Sonnet（純邏輯）

**Files:**
- Create: `game/src/darkline/core/i18n.js`
- Create: `game/src/locales/zh.json`
- Test: `game/tests/darkline/i18n.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/i18n.test.js
import { describe, it, expect } from 'vitest'
import { translate, I18n } from '../../src/darkline/core/i18n.js'

const DICT = { 'hud.score': '分數', 'card.justice': 'JUSTICE SHOT', 'brief.line': '攔截 {name} 的交接' }

describe('translate', () => {
  it('returns the string for a known key', () => {
    expect(translate(DICT, 'hud.score')).toBe('分數')
  })
  it('echoes the key when missing (so a forgotten string is visible, not blank)', () => {
    expect(translate(DICT, 'nope.missing')).toBe('nope.missing')
  })
  it('interpolates {vars}', () => {
    expect(translate(DICT, 'brief.line', { name: '老周' })).toBe('攔截 老周 的交接')
  })
})

describe('I18n', () => {
  it('t() wraps translate over an instance dict', () => {
    const i = new I18n(DICT)
    expect(i.t('card.justice')).toBe('JUSTICE SHOT')
    expect(i.t('missing')).toBe('missing')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/i18n.test.js`
Expected: FAIL（`i18n.js` 不存在）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/core/i18n.js
// 極簡 i18n：t(key) 查一張扁平字典，缺鍵回 key 本身（讓漏掉的字串「看得見」而非空白），
// 支援 {var} 插值。M1 只 zh；M2 再加 en 字典 + 切換 UI。所有 UI 文字走這裡、不硬寫。
export function translate(dict, key, vars = {}) {
  let s = dict[key]
  if (s == null) return key
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

export class I18n {
  constructor(dict = {}) { this.dict = dict }
  t(key, vars) { return translate(this.dict, key, vars) }
}
```

```json
// game/src/locales/zh.json
{
  "menu.title": "暗線 — 第一島鏈",
  "menu.start": "開始任務",
  "brief.title": "簡報",
  "brief.body": "西緣貿易公司閣樓。攔截「暗線名單」的交接——別讓名單落入北方手裡。",
  "brief.continue": "（按 N 出發）",
  "card.justice": "JUSTICE SHOT",
  "card.ohno": "OH NO!",
  "hud.intel": "取得線索",
  "free.exit": "前往碼頭（走到巷尾）",
  "ending.title": "任務完成",
  "ending.body": "名單到手了。但這只是開始——待第一島鏈再次收緊之日。",
  "loading": "載入中…"
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/i18n.test.js`
Expected: PASS（4 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/core/i18n.js game/src/locales/zh.json game/tests/darkline/i18n.test.js
git commit -m "feat(m1): i18n scaffold — t() + zh dict, missing-key echoes"
```

---

### Task A2: SaveStore（段落級存檔往返）

**建議模型：** Sonnet（純邏輯，注入 storage）

**Files:**
- Create: `game/src/darkline/core/SaveStore.js`
- Test: `game/tests/darkline/savestore.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/savestore.test.js
import { describe, it, expect } from 'vitest'
import { SaveStore } from '../../src/darkline/core/SaveStore.js'

function fakeStorage() {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  }
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
    s.save({ segment: 'rail2boss', score: 0 })
    s.clear()
    expect(s.load()).toBeNull()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/savestore.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/core/SaveStore.js
// 段落級存檔：接縫點寫 {segment, score}，讀回從該段開頭重入。注入 storage 讓它可測。
const KEY = 'darkline.m1.save'
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

Run: `cd game && npx vitest run tests/darkline/savestore.test.js`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/core/SaveStore.js game/tests/darkline/savestore.test.js
git commit -m "feat(m1): SaveStore — segment-level checkpoint round-trip"
```

---

### Task A3: MissionSequencer（段落狀態機，onEnter/onExit）

**建議模型：** Sonnet（純狀態機）

**Files:**
- Create: `game/src/darkline/mission/MissionSequencer.js`
- Test: `game/tests/darkline/sequencer.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/sequencer.test.js
import { describe, it, expect } from 'vitest'
import { MissionSequencer } from '../../src/darkline/mission/MissionSequencer.js'

const SEGS = ['briefing', 'rail1', 'free', 'rail2boss', 'ending']

describe('MissionSequencer', () => {
  it('starts at the first segment', () => {
    expect(new MissionSequencer(SEGS).current).toBe('briefing')
  })
  it('advances through the segment list', () => {
    const s = new MissionSequencer(SEGS)
    s.next(); expect(s.current).toBe('rail1')
    s.next(); expect(s.current).toBe('free')
  })
  it('fires onExit(from) then onEnter(to) in order on each advance', () => {
    const log = []
    const s = new MissionSequencer(SEGS, {
      onExit: seg => log.push(`exit:${seg}`),
      onEnter: seg => log.push(`enter:${seg}`),
    })
    s.next()
    expect(log).toEqual(['exit:briefing', 'enter:rail1'])
  })
  it('reports done at the last segment and next() is a no-op there', () => {
    const s = new MissionSequencer(SEGS)
    s.next(); s.next(); s.next(); s.next()
    expect(s.current).toBe('ending')
    expect(s.isDone).toBe(true)
    s.next()
    expect(s.current).toBe('ending')
  })
  it('throws on an empty segment list', () => {
    expect(() => new MissionSequencer([])).toThrow()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/sequencer.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/mission/MissionSequencer.js
// M1 任務骨架：固定段落順序的狀態機。整合層在每次 onExit/onEnter 切換相機控制者、
// 輸入模式、存檔（見 SeamController）。段落表注入，方便測試與日後別的任務重用。
export class MissionSequencer {
  constructor(segments, { onEnter, onExit } = {}) {
    if (!segments?.length) throw new Error('MissionSequencer needs at least one segment')
    this.segments = segments
    this._i = 0
    this._onEnter = onEnter
    this._onExit = onExit
  }
  get current() { return this.segments[this._i] }
  get isDone() { return this._i === this.segments.length - 1 }
  next() {
    if (this.isDone) return this.current
    const from = this.segments[this._i]
    this._i++
    this._onExit?.(from)
    this._onEnter?.(this.current)
    return this.current
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/sequencer.test.js`
Expected: PASS（5 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/mission/MissionSequencer.js game/tests/darkline/sequencer.test.js
git commit -m "feat(m1): MissionSequencer — segment state machine w/ onEnter/onExit"
```

---

### Task A4: 任務資料骨架（段落表＋每段模式＋接縫 payload）

**建議模型：** Sonnet（資料＋純不變式）

**Files:**
- Create: `game/src/darkline/mission/missions/first-island-chain.js`
- Create: `game/src/darkline/mission/SeamController.js`
- Test: `game/tests/darkline/mission-config.test.js`

- [ ] **Step 1: 寫失敗測試（測段落表結構不變式＋接縫 payload 純函式）**

```js
// game/tests/darkline/mission-config.test.js
import { describe, it, expect } from 'vitest'
import { SEGMENTS, SEGMENT_MODES, MISSION } from '../../src/darkline/mission/missions/first-island-chain.js'
import { savePayloadFor } from '../../src/darkline/mission/SeamController.js'

describe('mission segment table', () => {
  it('has the 5 M1 beats in order', () => {
    expect(SEGMENTS).toEqual(['briefing', 'rail1', 'free', 'rail2boss', 'ending'])
  })
  it('declares a valid camera+input mode for every segment', () => {
    for (const seg of SEGMENTS) {
      const m = SEGMENT_MODES[seg]
      expect(['rail', 'free', 'none']).toContain(m.camera)
      expect(['cursor', 'pointerlock', 'none']).toContain(m.input)
    }
  })
  it('uses free pointer-lock for the free segment and cursor for rails', () => {
    expect(SEGMENT_MODES.free).toMatchObject({ camera: 'free', input: 'pointerlock' })
    expect(SEGMENT_MODES.rail1).toMatchObject({ camera: 'rail', input: 'cursor' })
    expect(SEGMENT_MODES.rail2boss).toMatchObject({ camera: 'rail', input: 'cursor' })
  })
  it('exposes briefing/ending text keys', () => {
    expect(MISSION.briefingKey).toBe('brief.body')
    expect(MISSION.endingKey).toBe('ending.body')
  })
})

describe('savePayloadFor', () => {
  it('builds a checkpoint payload only for segments flagged save', () => {
    expect(savePayloadFor('free', 1500)).toEqual({ segment: 'free', score: 1500 })
  })
  it('returns null for segments not flagged save', () => {
    expect(savePayloadFor('briefing', 0)).toBeNull()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/mission-config.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作（A4 先放骨架；rail/alley 詳細資料留 Phase B/C 補）**

```js
// game/src/darkline/mission/missions/first-island-chain.js
// 1953 台北首部曲任務資料：段落表 + 每段「相機/輸入模式」+ 存檔旗標 + 文字鍵。
// rail1/rail2boss 的 railPath/波次、free 的巷弄 layout 在 Phase B/C 補進 MISSION。
export const SEGMENTS = ['briefing', 'rail1', 'free', 'rail2boss', 'ending']

// camera: 'rail'(CameraRig curve) | 'free'(FreeRoam pointerlock) | 'none'(overlay)
// input:  'cursor'(自由游標光槍) | 'pointerlock'(中央準心) | 'none'
// save:   進入該段時是否寫存檔點
export const SEGMENT_MODES = {
  briefing:  { camera: 'none', input: 'none',        save: false },
  rail1:     { camera: 'rail', input: 'cursor',      save: false },
  free:      { camera: 'free', input: 'pointerlock', save: true  },
  rail2boss: { camera: 'rail', input: 'cursor',      save: true  },
  ending:    { camera: 'none', input: 'none',        save: false },
}

export const MISSION = {
  id: 'first-island-chain',
  briefingKey: 'brief.body',
  endingKey: 'ending.body',
  // 以下由 Phase B/C 填入：
  // rail1:     { path: Vector3[], duration, waves: [...], clearPoints: [...] }
  // free:      { alleySeed, ... }
  // rail2boss: { path, duration, waves, boss: {...} }
}
```

```js
// game/src/darkline/mission/SeamController.js
// 接縫整合膠水：在 MissionSequencer 的 onEnter 被呼叫，依該段的 SEGMENT_MODES 套用
// 「相機控制者 / 輸入模式 / 存檔」。DOM/PointerLock 那段在 darkline.js 整合驗（手動）；
// 這裡只放可純測的存檔 payload 助手。
import { SEGMENT_MODES } from './missions/first-island-chain.js'

/**
 * 若該段標記 save，回傳要寫入 SaveStore 的 checkpoint payload；否則 null。
 * @param {string} segment
 * @param {number} score
 * @returns {{segment:string, score:number}|null}
 */
export function savePayloadFor(segment, score) {
  return SEGMENT_MODES[segment]?.save ? { segment, score } : null
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/mission-config.test.js`
Expected: PASS（6 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/mission/missions/first-island-chain.js game/src/darkline/mission/SeamController.js game/tests/darkline/mission-config.test.js
git commit -m "feat(m1): mission segment table + seam save-payload helper"
```

---

### Task A5: 整合層接線（兩段 stub，整流程＋接縫輸入切換跑通）

**建議模型：** Opus（整合＋接縫手感＋全迴圈判斷）

**Files:**
- Create: `game/darkline.html`
- Create: `game/src/darkline/darkline.js`

- [ ] **Step 1: 建入口頁**

```html
<!-- game/darkline.html -->
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>DARKLINE M1</title>
<style>
  html,body{margin:0;height:100%;background:#000;overflow:hidden}
  #c{width:100vw;height:100vh}
  #crosshair{position:fixed;width:14px;height:14px;border:2px solid #f4e2b0;border-radius:50%;
    transform:translate(-50%,-50%);pointer-events:none;z-index:6;display:none}
  #hint{position:fixed;left:8px;top:8px;color:#9c9;font:12px monospace;z-index:5}
  #overlay{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:center;
    align-items:center;color:#f4e2b0;font:16px/1.6 system-ui;background:rgba(8,8,12,.92);z-index:8;text-align:center;padding:0 12vw}
  #overlay h1{font-size:28px;letter-spacing:.1em}
  #overlay.hidden{display:none}
</style></head>
<body>
<div id="c"></div>
<div id="crosshair"></div>
<div id="hint">DARKLINE M1</div>
<div id="overlay"><h1></h1><p></p></div>
<script type="module" src="/src/darkline/darkline.js"></script>
</body></html>
```

- [ ] **Step 2: 寫整合層（Phase A：rail/free 用 stub，但接縫的相機接管＋輸入模式切換是真的）**

```js
// game/src/darkline/darkline.js
// M1 整合層。Phase A 先把「簡報→軌道→自由→軌道→結尾」整流程 + 接縫跑通：
// rail 段 = 相機靜止 stub、free 段 = 真 pointerlock + 一個盒子房間 stub。
// 後續 Phase 把 stub 換成真 rail 引擎 / 真巷弄。重用 game/ 引擎、其餘走 darkline/ 模組。
import * as THREE from 'three'
import { Renderer } from '../render/Renderer.js'
import { GameLoop } from '../GameLoop.js'
import { I18n } from './core/i18n.js'
import zh from '../locales/zh.json'
import { SaveStore } from './core/SaveStore.js'
import { MissionSequencer } from './mission/MissionSequencer.js'
import { SEGMENTS, SEGMENT_MODES } from './mission/missions/first-island-chain.js'
import { savePayloadFor } from './mission/SeamController.js'

const i18n = new I18n(zh)
const renderer = new Renderer(document.getElementById('c'))
const save = new SaveStore()
const dom = document.getElementById('c')
const crosshair = document.getElementById('crosshair')
const hint = document.getElementById('hint')
const overlay = document.getElementById('overlay')
let score = 0

// ── 輸入模式切換（接縫的一半）──────────────────────────────────────────────
function setInputMode(mode) {
  if (mode === 'pointerlock') {
    crosshair.style.display = 'block'
    crosshair.style.left = '50%'; crosshair.style.top = '50%'   // 置中
    dom.requestPointerLock?.()
  } else if (mode === 'cursor') {
    crosshair.style.display = 'block'
    if (document.pointerLockElement) document.exitPointerLock?.()
  } else {
    crosshair.style.display = 'none'
    if (document.pointerLockElement) document.exitPointerLock?.()
  }
}

function showOverlay(titleKey, bodyKey) {
  overlay.classList.remove('hidden')
  overlay.querySelector('h1').textContent = i18n.t(titleKey)
  overlay.querySelector('p').textContent = i18n.t(bodyKey) + '\n\n' + i18n.t('brief.continue')
}
function hideOverlay() { overlay.classList.add('hidden') }

// ── Phase A stub 段落（之後 Phase 換成真內容）────────────────────────────────
const freeStub = new THREE.Group()
function buildFreeStub() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 24),
    new THREE.MeshBasicMaterial({ color: 0x3a3530 }))
  floor.rotation.x = -Math.PI / 2; floor.position.z = -8
  freeStub.add(floor)
  renderer.scene.add(freeStub)
}

// ── 接縫：套相機控制者 + 輸入模式 + 存檔（依 SEGMENT_MODES）────────────────────
function applySegment(seg) {
  const mode = SEGMENT_MODES[seg]
  setInputMode(mode.input)
  if (seg === 'briefing') showOverlay('brief.title', 'brief.body')
  else if (seg === 'ending') showOverlay('ending.title', 'ending.body')
  else hideOverlay()
  if (seg === 'rail1' || seg === 'rail2boss') renderer.camera.position.set(0, 1.6, 4)
  if (seg === 'free') { renderer.camera.position.set(0, 1.6, 0); buildFreeStub() }
  const payload = savePayloadFor(seg, score)
  if (payload) save.save(payload)
  hint.textContent = `段落：${seg}（${mode.camera}/${mode.input}）`
}

const seq = new MissionSequencer(SEGMENTS, { onEnter: applySegment })
applySegment(seq.current)   // 進 briefing

window.addEventListener('keydown', e => { if (e.code === 'KeyN') seq.next() })

const loop = new GameLoop(() => { renderer.render() })
loop.start()

// debug 出口
window.__dl = { seq, save, i18n, renderer, get score() { return score } }
```

> **註：** `import zh from '../locales/zh.json'` 依賴 Vite 的 JSON 匯入（預設支援）。若 lint/類型抱怨，改 `import zh from '../locales/zh.json' assert { type: 'json' }` 或 fetch 載入；M1 用 Vite 直接 import 最簡。

- [ ] **Step 3: 手動驗證——跑起來看全迴圈＋接縫**

Run: `cd game && npm run dev`，瀏覽器開 `http://localhost:5173/darkline.html`
預期可觀察：
- 開場 briefing overlay（標題＝「簡報」、內文＝攔截名單）。按 N → rail1（overlay 收、crosshair 顯示為「游標」模式、hint 顯示 `rail/cursor`）。
- 按 N → free：crosshair 置中、點畫面鎖游標（pointerlock）、地板 stub 出現、hint 顯示 `free/pointerlock`；console `__dl.save.load()` 應回 `{segment:'free',score:0}`。
- 按 N → rail2boss（pointerlock 解除、回 cursor、`__dl.save.load()` 回 `{segment:'rail2boss',score:0}`）。
- 按 N → ending overlay（「任務完成」）。再按 N 不動（isDone）。
- **接縫驗收點：** free 進出時 crosshair 模式有切換、pointerlock 有進有出、存檔點有寫。

- [ ] **Step 4: Commit**

```bash
git add game/darkline.html game/src/darkline/darkline.js
git commit -m "feat(m1): wire mission skeleton — 5-beat loop + seam input switch + save (stubs)"
```

---

### ✅ Phase A 檢查點 — 交用戶用 Opus 統一檢查

- [ ] **判斷題（用戶/Opus 拍板）：**
  1. 整流程（briefing→rail→free→rail→ending）跑通、按 N 推進順暢嗎？
  2. **接縫的輸入模式切換**（cursor↔pointerlock、crosshair 顯隱、pointerlock 進出）順不順、有沒有殘留狀態？
  3. 存檔點在 free/rail2boss 有正確寫入、`__dl.save.load()` 讀得回嗎？
- [ ] 用戶以 Opus 通讀 Phase A diff（i18n/SaveStore/MissionSequencer/mission 資料/SeamController/darkline 接線＋測試），確認接縫機制無誤後開 Phase B。

> ⚠️ 此檢查點過了代表「骨架＋接縫」這條 M1 最大新風險已驗證；之後每加深一段都在這條跑通的流程裡驗。

---

# Phase B — 自由段 production（線性巷弄：走 + 碰撞 + AI + sprite + 磁吸瞄準）

### Task B1: 房間「AABB 段清單」碰撞夾擠（純函式）

**建議模型：** Sonnet（純幾何）

**Files:**
- Create: `game/src/darkline/free/clamp.js`
- Test: `game/tests/darkline/clamp.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/clamp.test.js
import { describe, it, expect } from 'vitest'
import { clampToSegments } from '../../src/darkline/free/clamp.js'

// L 形巷弄：縱向長段 + 橫向轉折段（在右下角相接）
const ARM_A = { minX: -2, maxX: 2, minZ: -20, maxZ: 0 }   // 縱向主巷
const ARM_B = { minX: -2, maxX: 8, minZ: -20, maxZ: -16 }  // 轉折往 +x

describe('clampToSegments', () => {
  it('keeps an in-bounds point unchanged', () => {
    expect(clampToSegments({ x: 0, z: -5 }, [ARM_A], [], 0.3)).toEqual({ x: 0, z: -5 })
  })
  it('clamps past a wall accounting for radius', () => {
    expect(clampToSegments({ x: 9, z: -5 }, [ARM_A], [], 0.3)).toEqual({ x: 1.7, z: -5 })
  })
  it('lets the mover into the L-bend arm (union of segments)', () => {
    // x=6,z=-18 is outside ARM_A but inside ARM_B → stays
    expect(clampToSegments({ x: 6, z: -18 }, [ARM_A, ARM_B], [], 0.3)).toEqual({ x: 6, z: -18 })
  })
  it('pushes the point out of a box obstacle along the smaller overlap axis', () => {
    const obs = [{ minX: -1, maxX: 1, minZ: -6, maxZ: -4 }]
    const r = clampToSegments({ x: 0.9, z: -5 }, [ARM_A], obs, 0.3)
    expect(r.x).toBeCloseTo(1.3, 5)
    expect(r.z).toBe(-5)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/clamp.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/free/clamp.js
// 平地 2D 碰撞：把點夾進「房間 AABB 段清單」的聯集（L 形巷弄 = 2+ 個相接矩形），
// 再推出每個 AABB 障礙。刻意極簡（M1 不做物理）。純函式（x/z 平面）。
export function clampToSegments(p, segments, obstacles = [], radius = 0.3) {
  // 已在某段內（扣半徑）→ 保留；否則 snap 到「夾進後最近」的那一段。
  let best = { x: p.x, z: p.z }, bestD = Infinity
  for (const s of segments) {
    const cx = Math.min(Math.max(p.x, s.minX + radius), s.maxX - radius)
    const cz = Math.min(Math.max(p.z, s.minZ + radius), s.maxZ - radius)
    if (cx === p.x && cz === p.z) { best = { x: cx, z: cz }; bestD = 0; break }
    const dx = cx - p.x, dz = cz - p.z
    const d = dx * dx + dz * dz
    if (d < bestD) { bestD = d; best = { x: cx, z: cz } }
  }
  let { x, z } = best
  for (const o of obstacles) {
    const insideX = x > o.minX - radius && x < o.maxX + radius
    const insideZ = z > o.minZ - radius && z < o.maxZ + radius
    if (!(insideX && insideZ)) continue
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

Run: `cd game && npx vitest run tests/darkline/clamp.test.js`
Expected: PASS（4 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/free/clamp.js game/tests/darkline/clamp.test.js
git commit -m "feat(m1): segment-list room clamp (L-alley union) + obstacle push-out"
```

---

### Task B2: 最簡敵人 AI（逼近→停→射）

**建議模型：** Sonnet（純邏輯狀態 step）

**Files:**
- Create: `game/src/darkline/free/WanderAI.js`
- Test: `game/tests/darkline/wanderai.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/wanderai.test.js
import { describe, it, expect } from 'vitest'
import { stepAI } from '../../src/darkline/free/WanderAI.js'

describe('stepAI', () => {
  const cfg = { speed: 2, range: 3, fireCooldown: 1 }
  it('advances toward the player when out of range', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0 }, { x: 10, z: 0 }, 0.5, cfg)
    expect(r.x).toBeCloseTo(1, 5)   // 2 u/s * 0.5s toward +x
    expect(r.fired).toBe(false)
  })
  it('stops and fires when within range and off cooldown', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0 }, { x: 2, z: 0 }, 0.5, cfg)
    expect(r.x).toBe(0)             // in range → no move
    expect(r.fired).toBe(true)
    expect(r.cooldown).toBeCloseTo(1, 5)
  })
  it('counts down cooldown without firing', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0.8 }, { x: 2, z: 0 }, 0.5, cfg)
    expect(r.fired).toBe(false)
    expect(r.cooldown).toBeCloseTo(0.3, 5)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/wanderai.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/free/WanderAI.js
// 一隻敵人最笨的腦：超出射程就朝玩家直線走；進射程就站定、冷卻到 0 就開一槍。
// 回傳新狀態（不可變）。整合層把回傳的新 x/z 過 clampToSegments（天然沿障礙滑動），
// 並把 fired=true 轉成一發子彈。線性巷弄不需要真 pathfinding。
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

Run: `cd game && npx vitest run tests/darkline/wanderai.test.js`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/free/WanderAI.js game/tests/darkline/wanderai.test.js
git commit -m "feat(m1): minimal enemy AI — seek then stop-and-fire"
```

---

### Task B3: 輕量磁吸瞄準（純函式）

**建議模型：** Sonnet（純幾何）

**Files:**
- Create: `game/src/darkline/combat/aimAssist.js`
- Test: `game/tests/darkline/aimassist.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/aimassist.test.js
import { describe, it, expect } from 'vitest'
import { assistAim } from '../../src/darkline/combat/aimAssist.js'

describe('assistAim', () => {
  const opts = { radius: 0.2, strength: 0.5 }
  it('returns the crosshair unchanged when no target is in range', () => {
    expect(assistAim({ x: 0, y: 0 }, [{ x: 0.9, y: 0 }], opts)).toEqual({ x: 0, y: 0 })
  })
  it('nudges toward a target within radius by strength', () => {
    const r = assistAim({ x: 0, y: 0 }, [{ x: 0.1, y: 0 }], opts)
    expect(r.x).toBeCloseTo(0.05, 5)   // halfway (strength 0.5)
    expect(r.y).toBeCloseTo(0, 5)
  })
  it('picks the nearest of several candidates', () => {
    const r = assistAim({ x: 0, y: 0 }, [{ x: 0.18, y: 0 }, { x: 0.06, y: 0 }], opts)
    expect(r.x).toBeCloseTo(0.03, 5)   // nudges toward the 0.06 one
  })
  it('strength 0 disables assist', () => {
    const r = assistAim({ x: 0, y: 0 }, [{ x: 0.1, y: 0 }], { radius: 0.2, strength: 0 })
    expect(r).toEqual({ x: 0, y: 0 })
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/aimassist.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/combat/aimAssist.js
// 輕量磁吸瞄準。準心與候選目標點皆為 normalized device coords（NDC, [-1,1]）。
// 把準心往「半徑內最近的目標」拉近 strength（0=無輔助、1=完全吸附）。無目標在範圍內
// → 原樣返回。rail/free 共用、力度各設（free 高、rail 低或 0）。純函式。
export function assistAim(cross, targets, { radius = 0.18, strength = 0.5 } = {}) {
  let best = null, bestD = Infinity
  for (const t of targets) {
    const d = Math.hypot(t.x - cross.x, t.y - cross.y)
    if (d < radius && d < bestD) { bestD = d; best = t }
  }
  if (!best || strength === 0) return { x: cross.x, y: cross.y }
  return {
    x: cross.x + (best.x - cross.x) * strength,
    y: cross.y + (best.y - cross.y) * strength,
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/aimassist.test.js`
Expected: PASS（4 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/combat/aimAssist.js game/tests/darkline/aimassist.test.js
git commit -m "feat(m1): light magnetic aim-assist (pure, tunable strength/radius)"
```

---

### Task B4: 調色盤量化（純函式）＋瀏覽器端 sprite 處理

**建議模型：** Sonnet（量化純測）／Opus（buildSprite 視覺）

**Files:**
- Create: `game/src/darkline/combat/palette.js`
- Create: `game/src/darkline/combat/buildSprite.js`
- Test: `game/tests/darkline/palette.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/palette.test.js
import { describe, it, expect } from 'vitest'
import { nearestColor, quantize } from '../../src/darkline/combat/palette.js'

const PAL = [[0, 0, 0], [255, 255, 255], [200, 30, 30]]

describe('nearestColor', () => {
  it('maps a near-black pixel to black', () => {
    expect(nearestColor([10, 8, 5], PAL)).toEqual([0, 0, 0])
  })
  it('maps a near-red pixel to the red entry', () => {
    expect(nearestColor([180, 40, 35], PAL)).toEqual([200, 30, 30])
  })
})

describe('quantize', () => {
  it('rewrites every opaque pixel to a palette entry, preserving alpha', () => {
    const img = { width: 2, height: 1, data: new Uint8ClampedArray([250, 250, 250, 255, 190, 35, 30, 255]) }
    const out = quantize(img, PAL)
    expect([...out.data]).toEqual([255, 255, 255, 255, 200, 30, 30, 255])
  })
  it('leaves fully transparent pixels untouched', () => {
    const img = { width: 1, height: 1, data: new Uint8ClampedArray([123, 45, 67, 0]) }
    expect(quantize(img, PAL).data[3]).toBe(0)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/palette.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作（palette 純函式 + buildSprite 放寬 size/色數）**

```js
// game/src/darkline/combat/palette.js
// 把任意 RGB 對應到調色盤中歐氏距離最近的顏色——「Duke3D 共用 256 色盤」的程式版：
// 不管 Gemini 吐什麼顏色，全收斂到同一盒蠟筆 → 風格自動統一。純函式。
export function nearestColor([r, g, b], palette) {
  let best = palette[0], bestD = Infinity
  for (const c of palette) {
    const dr = r - c[0], dg = g - c[1], db = b - c[2]
    const d = dr * dr + dg * dg + db * db
    if (d < bestD) { bestD = d; best = c }
  }
  return best
}

// img: { width, height, data: Uint8ClampedArray(RGBA) }（同 canvas ImageData 形狀）。
// 回傳新的同形狀物件；alpha 0 的像素原樣保留。
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

```js
// game/src/darkline/combat/buildSprite.js
// 載入一張（Gemini 生的）PNG → 過調色盤量化 → 縮到固定解析度，回傳給 three.js
// CanvasTexture 的 <canvas>。M1 相對 M0 放寬參數：size 96→128、色數 12→24（提清晰度，
// 承 M0「偏暗、臉糊」筆記）。1950s noir 暖灰調 + 諜報冷色點綴。
import { quantize } from './palette.js'

export const DARKLINE_PALETTE = [
  [10, 10, 14], [26, 24, 28], [44, 40, 42], [64, 58, 54], [88, 80, 72], [116, 106, 94],
  [150, 138, 120], [186, 172, 150], [216, 204, 182], [240, 232, 214],
  [70, 26, 24], [120, 40, 34], [168, 64, 46], [78, 64, 40], [128, 108, 60], [180, 156, 84],
  [40, 52, 64], [58, 76, 92], [92, 112, 128], [40, 60, 50], [70, 96, 76], [44, 44, 60],
  [96, 60, 44], [150, 120, 96],
]

export async function loadImage(url) {
  const img = new Image()
  img.src = url
  await img.decode()
  return img
}

// img: HTMLImageElement; size: 目標方形邊長（M1 預設 128）
export function processToCanvas(img, palette = DARKLINE_PALETTE, size = 128) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, size, size)
  const id = ctx.getImageData(0, 0, size, size)
  const q = quantize({ width: size, height: size, data: id.data }, palette)
  ctx.putImageData(new ImageData(q.data, size, size), 0, 0)
  return c
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/palette.test.js`
Expected: PASS（4 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/combat/palette.js game/src/darkline/combat/buildSprite.js game/tests/darkline/palette.test.js
git commit -m "feat(m1): sprite pipeline — palette quantize + wider 24-color/128px build"
```

---

### Task B5: 公告板 sprite（UV 視窗＋角度選格）

**建議模型：** Sonnet（UV 純測；three.js 接線照三步）

**Files:**
- Create: `game/src/darkline/combat/BillboardSprite.js`
- Test: `game/tests/darkline/billboard.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/billboard.test.js
import { describe, it, expect } from 'vitest'
import { frameUV, angleToColumn } from '../../src/darkline/combat/BillboardSprite.js'

describe('frameUV', () => {
  it('returns offset/repeat for a 4-col x 2-row sheet, cell (col=1,row=0)', () => {
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

Run: `cd game && npx vitest run tests/darkline/billboard.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/combat/BillboardSprite.js
import * as THREE from 'three'

// sprite sheet：cols 欄 = 視角方向，rows 列 = 動畫格。回傳貼圖 UV 視窗。
// 視覺上 row 由上往下數；WebGL 紋理 v=0 在底部，故 oy 用 (rows-1-row)。
// M1 敵人單格（cols=1,rows=1）；保留多格能力供 M2（多角度 sheet 若需要）。
export function frameUV(col, row, cols, rows) {
  return { ox: col / cols, oy: (rows - 1 - row) / rows, rx: 1 / cols, ry: 1 / rows }
}

// rel：敵人「面向」相對於「敵人→相機」的夾角（弧度）。0 = 正對相機 → 第 0 欄。
export function angleToColumn(rel, cols) {
  const seg = (2 * Math.PI) / cols
  let a = rel + seg / 2
  a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  return Math.floor(a / seg) % cols
}

export class BillboardSprite {
  constructor(texture, { cols = 1, rows = 1, worldSize = 2 } = {}) {
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.colorSpace = THREE.SRGBColorSpace
    this.cols = cols; this.rows = rows
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(worldSize, worldSize, 1)
    this.setCell(0, 0)
  }
  setCell(col, row) {
    const { ox, oy, rx, ry } = frameUV(col, row, this.cols, this.rows)
    const t = this.sprite.material.map
    t.offset.set(ox, oy); t.repeat.set(rx, ry); t.needsUpdate = true
  }
  faceFrame(facing, camPos, selfPos, animRow = 0) {
    const toCam = Math.atan2(camPos.x - selfPos.x, camPos.z - selfPos.z)
    this.setCell(angleToColumn(facing - toCam, this.cols), animRow)
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/billboard.test.js`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/combat/BillboardSprite.js game/tests/darkline/billboard.test.js
git commit -m "feat(m1): billboard sprite — sheet UV + angle-to-column"
```

---

### Task B6: 自由移動控制器（PointerLock WASD，位置過段清單 clamp）

**建議模型：** Opus（DOM/PointerLock 整合＋手感）

**Files:**
- Create: `game/src/darkline/free/FreeRoamController.js`
- Test: `game/tests/darkline/freeroam.test.js`

- [ ] **Step 1: 寫失敗測試（測純移動向量推導，不碰 DOM）**

```js
// game/tests/darkline/freeroam.test.js
import { describe, it, expect } from 'vitest'
import { moveDelta } from '../../src/darkline/free/FreeRoamController.js'

describe('moveDelta', () => {
  it('moves along -z when facing yaw=0 and pressing forward', () => {
    const d = moveDelta({ forward: true }, 0, 3, 0.5)
    expect(d.dx).toBeCloseTo(0, 5)
    expect(d.dz).toBeCloseTo(-1.5, 5)
  })
  it('strafes along +x when facing yaw=0 and pressing right', () => {
    const d = moveDelta({ right: true }, 0, 3, 0.5)
    expect(d.dx).toBeCloseTo(1.5, 5)
    expect(d.dz).toBeCloseTo(0, 5)
  })
  it('returns zero with no keys', () => {
    expect(moveDelta({}, 0, 3, 0.5)).toEqual({ dx: 0, dz: 0 })
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/freeroam.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/free/FreeRoamController.js
import { clampToSegments } from './clamp.js'

// 純函式：依按鍵 + 偏航角算本幀位移（未夾擠）。yaw=0 時「前」= -z。
export function moveDelta(keys, yaw, speed, dt) {
  let fx = 0, fz = 0
  if (keys.forward) fz -= 1
  if (keys.back) fz += 1
  if (keys.left) fx -= 1
  if (keys.right) fx += 1
  const len = Math.hypot(fx, fz)
  if (len === 0) return { dx: 0, dz: 0 }
  fx /= len; fz /= len
  const sin = Math.sin(yaw), cos = Math.cos(yaw)
  const wx = fx * cos + fz * sin
  const wz = -fx * sin + fz * cos
  return { dx: wx * speed * dt, dz: wz * speed * dt }
}

// 整合類：綁 PointerLock + 鍵盤；每幀 update(dt) 把相機夾在巷弄段聯集內。
export class FreeRoamController {
  constructor(camera, dom, segments, obstacles = [], { speed = 3, eye = 1.6, radius = 0.3 } = {}) {
    this.camera = camera; this.dom = dom; this.segments = segments
    this.obstacles = obstacles; this.speed = speed; this.eye = eye; this.radius = radius
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
      this.yaw -= e.movementX * 0.0025
      this.pitch -= e.movementY * 0.0025
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch))
    }
    this._lock = () => { this.enabled = document.pointerLockElement === this.dom }
  }
  attach() {
    this._click = () => this.dom.requestPointerLock()
    this.dom.addEventListener('click', this._click)
    document.addEventListener('pointerlockchange', this._lock)
    document.addEventListener('mousemove', this._mm)
    window.addEventListener('keydown', this._kd)
    window.addEventListener('keyup', this._ku)
  }
  detach() {
    this.dom.removeEventListener('click', this._click)
    document.removeEventListener('pointerlockchange', this._lock)
    document.removeEventListener('mousemove', this._mm)
    window.removeEventListener('keydown', this._kd)
    window.removeEventListener('keyup', this._ku)
    this.keys = { forward: false, back: false, left: false, right: false }
  }
  update(dt) {
    const { dx, dz } = moveDelta(this.keys, this.yaw, this.speed, dt)
    const p = clampToSegments(
      { x: this.camera.position.x + dx, z: this.camera.position.z + dz },
      this.segments, this.obstacles, this.radius,
    )
    this.camera.position.set(p.x, this.eye, p.z)
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/freeroam.test.js`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/free/FreeRoamController.js game/tests/darkline/freeroam.test.js
git commit -m "feat(m1): free-roam controller — pointerlock WASD, clamped to alley segments"
```

---

### Task B7: 線性 L 巷弄程序場景（決定性）

**建議模型：** Opus（視覺佈局判斷）

**Files:**
- Create: `game/src/darkline/free/AlleyScene.js`
- Test: `game/tests/darkline/alley.test.js`

- [ ] **Step 1: 寫失敗測試（測決定性與出入點結構，不碰 three 渲染細節）**

```js
// game/tests/darkline/alley.test.js
import { describe, it, expect } from 'vitest'
import { buildAlleyLayout } from '../../src/darkline/free/AlleyScene.js'

describe('buildAlleyLayout', () => {
  it('returns L-shaped room segments, obstacles, and the key points', () => {
    const lay = buildAlleyLayout(42)
    expect(lay.segments.length).toBeGreaterThanOrEqual(2)   // L = 2+ arms
    expect(Array.isArray(lay.obstacles)).toBe(true)
    expect(lay.entry).toHaveProperty('x'); expect(lay.entry).toHaveProperty('z')
    expect(lay.exitTrigger).toMatchObject({ minX: expect.any(Number), maxZ: expect.any(Number) })
    expect(lay.enemySpawns.length).toBeGreaterThanOrEqual(2)
    expect(lay.intel).toHaveProperty('x')
    expect(lay.innocent).toHaveProperty('x')
  })
  it('is deterministic for a given seed', () => {
    expect(buildAlleyLayout(7)).toEqual(buildAlleyLayout(7))
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/alley.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作（layout 純資料可測；buildAlleyGroup 建 three group 給整合層）**

```js
// game/src/darkline/free/AlleyScene.js
// 線性 L 形台北巷弄（M1 佔位）。layout 是純資料（房間段/障礙/出入點/spawn）——可單測、
// 給 clamp 與整合層用；buildAlleyGroup 把 layout 變成 unlit three 幾何（地面/兩側牆/攤位/
// 出口光帶）。1950s 暖灰調，與 sprite 同氛圍。seed 決定性。
import * as THREE from 'three'

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WALL = 0x2a2622, GROUND = 0x352f29, STALL = 0x4a3a2a, EXIT = 0xffe6a8

// 純資料 layout：主巷沿 -z（ARM_A），巷尾往 +x 轉折（ARM_B）；攤位障礙、出入點、spawn。
export function buildAlleyLayout(seed = 1) {
  const rng = mulberry32(seed)
  const ARM_A = { minX: -2.5, maxX: 2.5, minZ: -22, maxZ: 0 }
  const ARM_B = { minX: -2.5, maxX: 9, minZ: -22, maxZ: -17 }
  const segments = [ARM_A, ARM_B]
  // 兩三個攤位木箱障礙（主巷內，交錯擺，逼玩家繞）
  const obstacles = [
    { minX: -2.5, maxX: -0.6, minZ: -8, maxZ: -6.5 },
    { minX: 0.7, maxX: 2.5, minZ: -14, maxZ: -12.5 },
  ]
  return {
    seed,
    segments,
    obstacles,
    entry: { x: 0, z: -1 },                          // 下車點（接縫進入）
    exitTrigger: { minX: 5, maxX: 9, minZ: -22, maxZ: -17 },  // 巷尾轉折盡頭＝上車觸發區
    enemySpawns: [
      { x: 1.2, z: -10, type: 'agent' },
      { x: -1.0, z: -16, type: 'agent' },
      { x: 7, z: -19, type: 'agent' },               // 轉折處伏擊
    ],
    intel: { x: -1.8, z: -5 + rng() * 0.001 },        // 情報點（按 E 拾取）
    innocent: { x: 1.5, z: -19 },                     // 投誠者（要保護）
  }
}

// 把 layout 變成可加進 scene 的 three.Group（unlit 佔位幾何）。
export function buildAlleyGroup(layout) {
  const g = new THREE.Group()
  g.name = 'taipei_alley'
  const mat = hex => new THREE.MeshBasicMaterial({ color: hex })
  // 地面：覆蓋兩臂聯集（取整體 bbox）
  const minX = Math.min(...layout.segments.map(s => s.minX))
  const maxX = Math.max(...layout.segments.map(s => s.maxX))
  const minZ = Math.min(...layout.segments.map(s => s.minZ))
  const maxZ = Math.max(...layout.segments.map(s => s.maxZ))
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX + 2, maxZ - minZ + 2), mat(GROUND))
  floor.rotation.x = -Math.PI / 2
  floor.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2)
  g.add(floor)
  // 兩側牆（沿主巷各一道矮牆，用 box 充當騎樓/巷壁）
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, maxZ - minZ), mat(WALL))
    wall.position.set(side === -1 ? layout.segments[0].minX : layout.segments[0].maxX, 2, (minZ + maxZ) / 2)
    g.add(wall)
  }
  // 攤位木箱
  for (const o of layout.obstacles) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(o.maxX - o.minX, 1.1, o.maxZ - o.minZ), mat(STALL))
    box.position.set((o.minX + o.maxX) / 2, 0.55, (o.minZ + o.maxZ) / 2)
    g.add(box)
  }
  // 出口光帶（巷尾，提示上車點）
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), mat(EXIT))
  exit.rotation.x = -Math.PI / 2
  exit.position.set((layout.exitTrigger.minX + layout.exitTrigger.maxX) / 2, 0.02, (layout.exitTrigger.minZ + layout.exitTrigger.maxZ) / 2)
  g.add(exit)
  return g
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/alley.test.js`
Expected: PASS（2 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/free/AlleyScene.js game/tests/darkline/alley.test.js
git commit -m "feat(m1): procedural L-alley — deterministic layout + unlit placeholder geo"
```

---

### Task B8: 把自由段接進整合層（真巷弄＋sprite 敵＋磁吸射擊＋互動＋出口接縫）

**建議模型：** Opus（整合＋手感＋好不好玩判斷）

**Files:**
- Modify: `game/src/darkline/darkline.js`
- Modify: `game/src/darkline/mission/missions/first-island-chain.js`（加 `free` 資料）

- [ ] **Step 1: 在 mission 資料加 free 區塊**

在 `MISSION` 物件補上：
```js
// game/src/darkline/mission/missions/first-island-chain.js — MISSION 內補：
export const MISSION = {
  id: 'first-island-chain',
  briefingKey: 'brief.body',
  endingKey: 'ending.body',
  free: {
    alleySeed: 1953,
    enemy: { hp: 2, ai: { speed: 1.6, range: 4.5, fireCooldown: 1.6 }, sprite: '/m0/enemy.png', worldSize: 1.9 },
    assist: { radius: 0.22, strength: 0.5 },   // free 段磁吸力度較高
    intelScore: 300,
  },
}
```
> sprite 路徑沿用 M0 的 `game/public/m0/enemy.png`（gitignored 佔位）；M1 美術升質另議。

- [ ] **Step 2: 改寫 `darkline.js` 的 free 段（取代 Phase A 的 freeStub）**

把 Phase A 的 `buildFreeStub` / free 分支換成真自由段。新增 import 與 free 段邏輯：
```js
// darkline.js 頂部新增 import：
import { Shooter } from '../gameplay/Shooter.js'
import { FreeRoamController } from './free/FreeRoamController.js'
import { buildAlleyLayout, buildAlleyGroup } from './free/AlleyScene.js'
import { stepAI } from './free/WanderAI.js'
import { assistAim } from './combat/aimAssist.js'
import { BillboardSprite } from './combat/BillboardSprite.js'
import { loadImage, processToCanvas } from './combat/buildSprite.js'
import { MISSION } from './mission/missions/first-island-chain.js'

// 模組層新增：
const shooter = new Shooter(renderer.camera)
let free = null            // { controller, group, layout, enemies[], intelMesh, exitTrigger, done }

async function enterFree() {
  const layout = buildAlleyLayout(MISSION.free.alleySeed)
  const group = buildAlleyGroup(layout)
  renderer.scene.add(group)
  renderer.camera.position.set(layout.entry.x, 1.6, layout.entry.z)
  const controller = new FreeRoamController(renderer.camera, dom, layout.segments, layout.obstacles)
  controller.attach()

  // sprite 敵人（過調色盤管線；單張 billboard）
  const img = await loadImage(MISSION.free.enemy.sprite)
  const enemies = layout.enemySpawns.map(sp => {
    // 每隻一張獨立 CanvasTexture（共用同一張過完調色盤管線的來源圖）
    const bb = new BillboardSprite(new THREE.CanvasTexture(processToCanvas(img)),
      { worldSize: MISSION.free.enemy.worldSize })
    bb.sprite.position.set(sp.x, 0.95, sp.z)
    renderer.scene.add(bb.sprite)
    return { bb, x: sp.x, z: sp.z, cooldown: 1, hp: MISSION.free.enemy.hp, alive: true }
  })

  // 情報點（小發光方塊，按 E 拾取）
  const intelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x6ad0ff }))
  intelMesh.position.set(layout.intel.x, 0.6, layout.intel.z)
  renderer.scene.add(intelMesh)

  free = { controller, group, layout, enemies, intelMesh, exitTrigger: layout.exitTrigger, intelTaken: false }
}

function exitFree() {
  if (!free) return
  free.controller.detach()
  renderer.scene.remove(free.group)
  free.enemies.forEach(e => renderer.scene.remove(e.bb.sprite))
  renderer.scene.remove(free.intelMesh)
  free = null
}

function inside(trigger, p) {
  return p.x > trigger.minX && p.x < trigger.maxX && p.z > trigger.minZ && p.z < trigger.maxZ
}
```

調整 `applySegment`：`free` 分支改呼叫 `await enterFree()`，離開 free（onExit）呼叫 `exitFree()`。把 Sequencer 改成同時掛 onEnter/onExit：
```js
const seq = new MissionSequencer(SEGMENTS, {
  onEnter: applySegment,
  onExit: seg => { if (seg === 'free') exitFree() },
})
```
（`applySegment` 內 `if (seg==='free')` 改成 `await enterFree()`；把 `applySegment` 標記 `async`，A5 的 `import` 已就緒。）

左鍵射擊（pointerlock 下準心置中 NDC=(0,0)，過磁吸）：
```js
window.addEventListener('mousedown', e => {
  if (e.button !== 0 || seq.current !== 'free' || !free) return
  const targets = free.enemies.filter(en => en.alive).map(en => {
    const v = en.bb.sprite.position.clone().project(renderer.camera)
    return { x: v.x, y: v.y, ref: en }
  })
  const aim = assistAim({ x: 0, y: 0 }, targets, MISSION.free.assist)
  const hits = shooter.getHits(aim, free.enemies.filter(en => en.alive).map(en => en.bb.sprite))
  if (hits.length) {
    const en = free.enemies.find(en => en.bb.sprite === hits[0].object)
    if (en) { en.hp -= 1; if (en.hp <= 0) { en.alive = false; en.bb.sprite.visible = false } }
  }
})

window.addEventListener('keydown', e => {
  if (e.code === 'KeyE' && seq.current === 'free' && free && !free.intelTaken) {
    const d = Math.hypot(renderer.camera.position.x - free.layout.intel.x,
                         renderer.camera.position.z - free.layout.intel.z)
    if (d < 1.6) {
      free.intelTaken = true; score += MISSION.free.intelScore
      free.intelMesh.visible = false
      hint.textContent = i18n.t('hud.intel')
    }
  }
})
```

free 段每幀更新（在 GameLoop 的 tick 內）：
```js
const loop = new GameLoop(dt => {
  if (seq.current === 'free' && free) {
    free.controller.update(dt)
    const cam = renderer.camera.position
    for (const en of free.enemies) {
      if (!en.alive) continue
      const r = stepAI(en, { x: cam.x, z: cam.z }, dt, MISSION.free.enemy.ai)
      const c = clampFreePos(r.x, r.z)   // 過巷弄碰撞（沿障礙滑）
      en.x = c.x; en.z = c.z; en.cooldown = r.cooldown
      en.bb.sprite.position.set(en.x, 0.95, en.z)
      en.bb.faceFrame(0, cam, en.bb.sprite.position)
      // r.fired → M1 先做畫面提示即可（傷害系統留待玩家 HP 接 HUD，可選）
    }
    // 走到巷尾出口 → 進下一段（rail2boss）
    if (inside(free.exitTrigger, cam)) { seq.next() }
  }
  renderer.render()
})
```
其中 `clampFreePos` 用 `clampToSegments`（import 到 darkline.js 或在 free 物件存一份）：
```js
import { clampToSegments } from './free/clamp.js'
function clampFreePos(x, z) {
  return clampToSegments({ x, z }, free.layout.segments, free.layout.obstacles, 0.3)
}
```

- [ ] **Step 3: 手動驗證——自由段實跑**

Run: `cd game && npm run dev` → `http://localhost:5173/darkline.html`
（先確認 `game/public/m0/enemy.png` 存在；無則用任一 PNG 暫代。）
按 N 兩次進 free：
- 點畫面鎖游標、WASD 走動、滑鼠看；撞牆/攤位被擋（不穿牆）。
- 3 隻 sprite 敵面向你、朝你逼近；準心置中、左鍵命中（磁吸幫忙）後消失（hp 2 → 兩槍）。
- 走近藍方塊按 E → hint 顯「取得線索」、score +300（`__dl.score`）、方塊消失。
- 走到巷尾出口光帶 → 自動進 rail2boss（pointerlock 解除、回 cursor）。
- 回頭驗：`__dl.save.load()` 在進 free 時寫了 `{segment:'free'}`、進 rail2boss 時寫了 `{segment:'rail2boss', score:300}`。

- [ ] **Step 4: Commit**

```bash
git add game/src/darkline/darkline.js game/src/darkline/mission/missions/first-island-chain.js
git commit -m "feat(m1): free segment live — alley + sprite enemies + assist shooting + intel + exit seam"
```

---

### ✅ Phase B 檢查點 — 交用戶用 Opus 統一檢查（自由段好不好玩 + 接縫端到端）

- [ ] **判斷題（用戶/Opus 拍板）：**
  1. **自由段好不好玩？** 走動射擊在巷弄裡有沒有「交火感」？磁吸力度（0.5）太黏還是太弱？
  2. **接縫端到端**：rail1(stub)→下車→自由段→上車→rail2(stub) 整段順不順？輸入模式切換乾不乾淨？
  3. **sprite 清晰度**：128px/24 色比 M0 的 96/12 清楚多少？臉還糊嗎？要不要再放寬？
  4. 碰撞（撞牆/繞攤位/敵人沿障礙滑）有沒有破綻？
- [ ] **決策：** 磁吸力度/sprite 參數依手感微調；若自由段「好玩且可控」確認 → 維持 spec 50:50 方向。
- [ ] 用戶以 Opus 通讀 Phase B diff，確認後開 Phase C。

---

# Phase C — 軌道段（重用引擎：CameraRig curve + EnemyManager + lock-on + Boss）

### Task C1: OriginalEnvironment 加 taipei1950s / harbor preset（不改既有路徑）

**建議模型：** Sonnet（preset 資料＋決定性測試）

**Files:**
- Modify: `game/src/scene/OriginalEnvironment.js`（**只新增匯出**，不改 `buildOriginalEnvironment` / `DOWNTOWN_PRESET`）
- Test: `game/tests/darkline/presets.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/presets.test.js
import { describe, it, expect } from 'vitest'
import { buildOriginalEnvironment, TAIPEI1950S_PRESET, HARBOR_PRESET } from '../../src/scene/OriginalEnvironment.js'

describe('darkline rail presets', () => {
  it('exposes taipei1950s + harbor preset configs with street dims', () => {
    for (const p of [TAIPEI1950S_PRESET, HARBOR_PRESET]) {
      expect(p).toHaveProperty('seed')
      expect(p).toHaveProperty('zStart'); expect(p).toHaveProperty('zEnd')
      expect(p.zStart).toBeGreaterThan(p.zEnd)
    }
  })
  it('builds a deterministic group from a preset (a named ground mesh present)', () => {
    const g = buildOriginalEnvironment(TAIPEI1950S_PRESET)
    expect(g.getObjectByName('ground')).toBeTruthy()
    // determinism: same seed → same child count
    expect(buildOriginalEnvironment(TAIPEI1950S_PRESET).children.length).toBe(g.children.length)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/presets.test.js`
Expected: FAIL（preset 未匯出）

- [ ] **Step 3: 實作（在 `OriginalEnvironment.js` 末尾、`DOWNTOWN_PRESET` 之後新增匯出）**

在 `game/src/scene/OriginalEnvironment.js` 加（不動既有任何行）：
```js
// ── DARKLINE rail presets（M1 佔位；沿用 downtown 街廊建構器，換暖灰/港邊調色） ──────
// 1950s 台北騎樓街：暖灰調、街道略窄、樓較密（佔位；真騎樓柱/招牌升質留 M2）。
export const TAIPEI1950S_PRESET = {
  seed: 1953,
  zStart: 10,
  zEnd: -180,
  streetHalf: 5,
  sidewalk: 3.5,
  bayDepth: 11,
}

// 碼頭：開闊、樓更稀疏（佔位；真碼頭水面/棧橋留 M2，M1 用同建構器換調色與尺度近似）。
export const HARBOR_PRESET = {
  seed: 1949,
  zStart: 10,
  zEnd: -200,
  streetHalf: 8,
  sidewalk: 2,
  bayDepth: 18,
}
```
> 註：M1 兩段軌道都用同一 `buildOriginalEnvironment` 建構器配不同 preset（佔位）。**真正的騎樓柱廊 / 碼頭水面屬美術升質，留 M2**（spec §7.3、§11）。本 Task 只加匯出常數，零改既有行為 → 既有 stage1/downtown1 零回歸。

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/presets.test.js`
Expected: PASS（2 passed）

並跑既有場景測試確認零回歸：`cd game && npx vitest run` → 既有測試全綠。

- [ ] **Step 5: Commit**

```bash
git add game/src/scene/OriginalEnvironment.js game/tests/darkline/presets.test.js
git commit -m "feat(m1): taipei1950s + harbor rail presets (additive, zero regression)"
```

---

### Task C2: 軌道資料（rail1 / rail2boss 的 railPath + 波次 + boss）

**建議模型：** Sonnet（資料＋結構不變式）

**Files:**
- Modify: `game/src/darkline/mission/missions/first-island-chain.js`（加 `rail1` / `rail2boss`）
- Test: `game/tests/darkline/rail-data.test.js`

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/rail-data.test.js
import { describe, it, expect } from 'vitest'
import { MISSION } from '../../src/darkline/mission/missions/first-island-chain.js'

describe('rail segment data', () => {
  for (const key of ['rail1', 'rail2boss']) {
    it(`${key} has a multi-point path, a duration, and waves`, () => {
      const r = MISSION[key]
      expect(r.path.length).toBeGreaterThanOrEqual(2)
      expect(r.duration).toBeGreaterThan(0)
      expect(r.waves.length).toBeGreaterThanOrEqual(1)
      for (const w of r.waves) {
        expect(w).toHaveProperty('time')
        expect(Array.isArray(w.enemies)).toBe(true)
      }
    })
  }
  it('rail2boss declares a boss', () => {
    expect(MISSION.rail2boss.boss).toMatchObject({ hp: expect.any(Number) })
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/rail-data.test.js`
Expected: FAIL（rail1/rail2boss 未定義）

- [ ] **Step 3: 實作（在 MISSION 補 rail1 / rail2boss；path 用 [x,y,z] 三元組，整合層轉 Vector3）**

在 `MISSION` 內補：
```js
// game/src/darkline/mission/missions/first-island-chain.js — MISSION 內補：
  rail1: {
    preset: 'taipei1950s',
    // 相機沿騎樓街推進的 waypoints（[x,y,z]，整合層轉 THREE.Vector3）
    path: [[0, 1.6, 8], [0, 1.6, -20], [3, 1.6, -55], [0, 1.6, -95], [-2, 1.6, -140]],
    duration: 38,
    // 波次：time（秒）+ enemies（type/position 相機相對 offset [x右,y,z前負]/hp）+ clearPoint
    waves: [
      { time: 3,  clearPoint: true, enemies: [
        { type: 'grunt', position: [-2, 0, -10], hp: 1 },
        { type: 'grunt', position: [2, 0, -12], hp: 1 },
        { type: 'gunman', position: [0, 0, -14], hp: 2 } ] },
      { time: 16, clearPoint: true, enemies: [
        { type: 'grunt', position: [-3, 0, -11], hp: 1 },
        { type: 'heavy', position: [2, 0, -13], hp: 3 } ] },
    ],
  },
  rail2boss: {
    preset: 'harbor',
    path: [[0, 1.6, 8], [0, 1.6, -30], [4, 1.6, -70], [0, 1.6, -120]],
    duration: 30,
    waves: [
      { time: 3, clearPoint: true, enemies: [
        { type: 'grunt', position: [-2, 0, -12], hp: 1 },
        { type: 'gunman', position: [2, 0, -13], hp: 2 } ] },
    ],
    boss: { time: 14, hp: 16, position: [0, 0, -16], phases: 3 },
  },
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/rail-data.test.js`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/mission/missions/first-island-chain.js game/tests/darkline/rail-data.test.js
git commit -m "feat(m1): rail1/rail2boss data — paths, clearPoint waves, boss"
```

---

### Task C3: 軌道驅動器接進整合層（重用 CameraRig + EnemyManager + Boss + 游標射擊）

**建議模型：** Opus（整合＋clearPoint 閘門＋射擊鏈判斷）

**Files:**
- Create: `game/src/darkline/mission/RailController.js`
- Modify: `game/src/darkline/darkline.js`（rail1/rail2boss 分支換成真驅動器）

- [ ] **Step 1: 寫 RailController（封裝一段軌道：CameraRig curve + EnemyManager + clearPoint 閘門 + boss）**

```js
// game/src/darkline/mission/RailController.js
// 驅動「一段軌道」：CameraRig curve 推進相機（沿 path），到每個 wave.time spawn 該波；
// clearPoint 波未清完前暫停相機（aliveCount>0 → rig.pause），清完恢復；boss 用
// BossController 跑階段。重用 game/ 的 CameraRig / EnemyManager / BossController。
// 段落結束＝相機推到底（progress 1）且無存活敵人 → onComplete()。
import * as THREE from 'three'
import { CameraRig } from '../../render/CameraRig.js'
import { EnemyManager } from '../../gameplay/EnemyManager.js'
import { BossController } from '../../gameplay/BossController.js'

export class RailController {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   * @param {object} railData MISSION.rail1 / MISSION.rail2boss
   * @param {object} [opts] { onComplete, onEnemyAttack, onBossPhase, difficulty }
   */
  constructor(scene, camera, railData, opts = {}) {
    this.scene = scene; this.camera = camera; this.data = railData; this.opts = opts
    const waypoints = railData.path.map(p => new THREE.Vector3(p[0], p[1], p[2]))
    this.rig = new CameraRig(camera, waypoints, railData.duration)
    this.enemies = new EnemyManager(scene, new Map(), camera)
    this.enemies.difficulty = opts.difficulty ?? 'normal'
    this.enemies.onEnemyAttack = opts.onEnemyAttack ?? (() => {})
    this._waves = railData.waves.map(w => ({ ...w, fired: false }))
    this._boss = railData.boss ? { ...railData.boss, fired: false } : null
    this.bossController = null
    this._elapsed = 0
    this._done = false
  }

  update(dt) {
    if (this._done) return
    this._elapsed += dt
    // 到時觸發波次
    for (const w of this._waves) {
      if (!w.fired && this._elapsed >= w.time) {
        w.fired = true
        this.enemies.spawnWave(w.enemies)
        w._gating = !!w.clearPoint
      }
    }
    // boss
    if (this._boss && !this._boss.fired && this._elapsed >= this._boss.time) {
      this._boss.fired = true
      this.enemies.spawnWave([{ type: 'boss', position: this._boss.position, hp: this._boss.hp }])
      const bossEnemy = this.enemies.enemies[this.enemies.enemies.length - 1]
      this.bossController = new BossController(bossEnemy, {
        phases: this._boss.phases,
        onPhase: p => this.opts.onBossPhase?.(p, this.bossController),
      })
    }
    // clearPoint 閘門：任一已觸發的 clearPoint 波尚有存活敵人 → 暫停相機
    const gating = this._waves.some(w => w.fired && w._gating) || (this._boss?.fired)
    const aliveBlock = this.enemies.aliveCount() > 0
    if (gating && aliveBlock) this.rig.pause(); else this.rig.resume()
    this.rig.advance(dt)
    this.enemies.update(dt)
    if (this.bossController && !this.bossController.boss.isDead?.()) this.bossController.update()
    // 完成：相機到底 + 全清
    const atEnd = this.rig.progress != null ? this.rig.progress >= 1 : false
    if (atEnd && this.enemies.aliveCount() === 0 && this._waves.every(w => w.fired) &&
        (!this._boss || this._boss.fired)) {
      this._done = true
      this.opts.onComplete?.()
    }
  }

  /** @returns {THREE.Object3D[]} 可被玩家 raycast 的敵人 mesh */
  enemyMeshes() { return this.enemies.getActiveMeshes() }
  projectileMeshes() { return this.enemies.getProjectileMeshes() }
  dispose() { this.enemies.clear() }
}
```

- [ ] **Step 2: 改 `darkline.js` 的 rail 分支用 RailController + 游標射擊**

新增 import 與 rail 狀態：
```js
import { RailController } from './mission/RailController.js'
import { resolveEnemy, zoneOfHit } from '../gameplay/EnemyManager.js'
import { buildOriginalEnvironment, TAIPEI1950S_PRESET, HARBOR_PRESET } from '../scene/OriginalEnvironment.js'
// 註：MISSION 已在 Task B8 import；勿重複 import（同模組重複 import 是錯誤）。

let rail = null   // { controller, env }
const PRESETS = { taipei1950s: TAIPEI1950S_PRESET, harbor: HARBOR_PRESET }

function enterRail(key) {
  const data = MISSION[key]
  const env = buildOriginalEnvironment(PRESETS[data.preset])
  renderer.scene.add(env)
  const controller = new RailController(renderer.scene, renderer.camera, data, {
    onComplete: () => seq.next(),
    onEnemyAttack: () => { /* M1：可接玩家 HP/HUD，先留提示 */ },
    onBossPhase: () => { /* M1：可出增援，先留 */ },
  })
  rail = { controller, env, key }
}
function exitRail() {
  if (!rail) return
  rail.controller.dispose()
  renderer.scene.remove(rail.env)
  rail = null
}
```

rail 段游標射擊（自由游標：滑鼠 NDC 來自 InputManager 風格；此處直接用 mousemove 記 NDC）：
```js
let cursorNDC = { x: 0, y: 0 }
window.addEventListener('mousemove', e => {
  cursorNDC = { x: (e.clientX / window.innerWidth) * 2 - 1, y: -(e.clientY / window.innerHeight) * 2 + 1 }
  if (seq.current === 'rail1' || seq.current === 'rail2boss') {
    crosshair.style.left = e.clientX + 'px'; crosshair.style.top = e.clientY + 'px'
  }
})
window.addEventListener('mousedown', e => {
  if (e.button !== 0 || !rail) return
  // rail 段磁吸力度低（spec：rail 接近原版光槍，磁吸可關/極低）
  const aim = cursorNDC   // M1 rail 先不加磁吸；C 檢查點再決定
  const hits = shooter.getHits(aim, rail.controller.enemyMeshes())
  if (hits.length) {
    const enemy = resolveEnemy(hits[0].object)
    if (enemy) {
      const zone = zoneOfHit(hits[0].object)
      enemy.hit(1, zone)
    }
  }
})
```

更新 `applySegment` 的 rail 分支：`if (seg==='rail1'||seg==='rail2boss') enterRail(seg)`；Sequencer 的 onExit 補 `if (seg==='rail1'||seg==='rail2boss') exitRail()`。GameLoop tick 補 rail 更新：
```js
const loop = new GameLoop(dt => {
  if ((seq.current === 'rail1' || seq.current === 'rail2boss') && rail) rail.controller.update(dt)
  else if (seq.current === 'free' && free) { /* …Phase B 的 free 更新… */ }
  renderer.render()
})
```

- [ ] **Step 3: 手動驗證——軌道段實跑（端到端骨架成形）**

Run: `cd game && npm run dev` → `http://localhost:5173/darkline.html`
- briefing → N → rail1：騎樓街程序場景渲染、相機沿 path 推進、t≈3 第一波 spawn（程序人形）、clearPoint 停相機到清完才前進、游標移動 crosshair 跟、左鍵爆頭/打身判定（`resolveEnemy`/`zoneOfHit`）、清完續行至底 → 自動 onComplete 進 free。
- free（Phase B）→ 出口 → rail2boss：碼頭 preset、波次、t≈14 boss spawn（大隻）、打到 hp 0。
- boss 死 + 到底 → onComplete 進 ending。
- 全程 `__dl.save.load()` 在 free/rail2boss 進入時有寫。

- [ ] **Step 4: Commit**

```bash
git add game/src/darkline/mission/RailController.js game/src/darkline/darkline.js
git commit -m "feat(m1): rail segments live — CameraRig+EnemyManager+clearPoint+boss, cursor shooting"
```

---

### ✅ Phase C 檢查點 — 交用戶用 Opus 統一檢查

- [ ] **判斷題：**
  1. 軌道段（騎樓/碼頭）跑通嗎？clearPoint 閘門（停→清→前進）對嗎？
  2. **rail 自由游標光槍 vs free pointer-lock** 兩種手感在同一任務裡切換，順不順、突不突兀？
  3. rail 段要不要也加一點磁吸（目前 0）？還是純手瞄更像光槍？
  4. boss（重用 BossController）行為堪用嗎？
- [ ] 用戶以 Opus 通讀 Phase C diff，確認後開 Phase D。

---

# Phase D — 整合潤飾 + 全迴圈 + 存檔讀回

### Task D1: 簡報/結尾字卡模組（走 i18n）

**建議模型：** Sonnet（小模組）

**Files:**
- Create: `game/src/darkline/core/cards.js`
- Test: `game/tests/darkline/cards.test.js`

- [ ] **Step 1: 寫失敗測試（測純文字組裝，不碰真 DOM——注入假 element）**

```js
// game/tests/darkline/cards.test.js
import { describe, it, expect } from 'vitest'
import { renderCard } from '../../src/darkline/core/cards.js'
import { I18n } from '../../src/darkline/core/i18n.js'

const i18n = new I18n({ 'ending.title': '任務完成', 'ending.body': '名單到手了。' })

describe('renderCard', () => {
  it('fills a card element with translated title + body', () => {
    const el = { querySelector: sel => store[sel], }
    const store = { h1: { textContent: '' }, p: { textContent: '' } }
    el.querySelector = sel => store[sel === 'h1' ? 'h1' : 'p']
    renderCard(el, i18n, 'ending.title', 'ending.body')
    expect(store.h1.textContent).toBe('任務完成')
    expect(store.p.textContent).toContain('名單到手了。')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/cards.test.js`
Expected: FAIL（未定義）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/core/cards.js
// 簡報/結尾純文字 overlay 填字（走 i18n）。M1 只填字 + 顯示；圖/演出留 M2。
// 注入 element（含 h1/p 子節點）讓它可測。
export function renderCard(el, i18n, titleKey, bodyKey) {
  el.querySelector('h1').textContent = i18n.t(titleKey)
  el.querySelector('p').textContent = i18n.t(bodyKey)
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/cards.test.js`
Expected: PASS（1 passed）

- [ ] **Step 5: 接進 darkline.js**（把 A5 的 `showOverlay` 內部改用 `renderCard`，行為不變）並 Commit

```bash
git add game/src/darkline/core/cards.js game/tests/darkline/cards.test.js game/src/darkline/darkline.js
git commit -m "feat(m1): briefing/ending card module (i18n-driven)"
```

---

### Task D2: 全迴圈 + 存檔讀回（從存檔段落重入）

**建議模型：** Opus（整合＋全迴圈判斷）

**Files:**
- Modify: `game/src/darkline/darkline.js`

- [ ] **Step 1: 加「讀檔重入」**

在 boot 時若有存檔，提供從該段重入（M1：URL `?resume` 或開場一個「繼續」鈕）。最簡：boot 時讀存檔，若有 `?resume`，把 Sequencer 快轉到該段並套用：
```js
// darkline.js boot 段：
function startFrom(segment) {
  // 快轉 Sequencer 到 segment（重放 applySegment，不重放前段內容）
  while (!seq.isDone && seq.current !== segment) seq.next()
}
const params = new URLSearchParams(location.search)
const saved = save.load()
if (params.has('resume') && saved?.segment) {
  startFrom(saved.segment)
  score = saved.score ?? 0
}
```
> 註：M1 的「讀回」驗收＝能從 `free` / `rail2boss` 存檔點重入該段（spec §8.2「讀回從該段開頭」）。`?resume` 是 M1 佔位入口；正式選單「繼續遊戲」鈕留 M2。

- [ ] **Step 2: 手動驗證——全迴圈 + 讀回**

Run: `cd game && npm run dev` → `http://localhost:5173/darkline.html`
- 完整跑一輪：briefing → rail1 → free → rail2boss → ending，無中斷、無 console error。
- 玩到 free（存檔寫入）後，開 `http://localhost:5173/darkline.html?resume` → 應直接從 free 段開始（相機在巷口、pointerlock、score 還原）。
- 玩到 rail2boss 後 `?resume` → 從碼頭段開始。

- [ ] **Step 3: Commit**

```bash
git add game/src/darkline/darkline.js
git commit -m "feat(m1): full mission loop + resume-from-checkpoint (?resume)"
```

---

### Task D3: 滑鼠手感／磁吸力度調校 pass

**建議模型：** Opus（手感）

**Files:**
- Modify: `game/src/darkline/mission/missions/first-island-chain.js`（free.assist）、`game/src/darkline/darkline.js`（rail 磁吸開關）

- [ ] **Step 1: 依 Phase B/C 檢查點回饋調參**
  - free 段 `assist.radius`/`strength`（起始 0.22 / 0.5）。
  - rail 段是否加低磁吸（依 Phase C 檢查點 #3 決議；若加，rail 用 `strength≈0.2`、`radius≈0.12`，套同 `assistAim`）。
  - free 段 pointer-lock 滑鼠靈敏度（`FreeRoamController` 的 `0.0025`）。

- [ ] **Step 2: 手動驗證**——以「能不能舒服地爆頭」為準，preview 實打數十發，記錄定稿值。

- [ ] **Step 3: Commit**

```bash
git add game/src/darkline/mission/missions/first-island-chain.js game/src/darkline/darkline.js
git commit -m "tune(m1): mouse aim feel — assist strength/radius, sensitivity"
```

---

### ✅ Phase D 檢查點 + M1 總結 — 交用戶用 Opus 統一檢查

- [ ] **驗收標準逐項勾稽（spec §2/§12）：** 選單→簡報卡→軌道1→下車接縫→自由段（走/碰撞/AI/射擊/互動）→上車接縫→軌道2/Boss→結尾卡→整輪跑通→`?resume` 讀回→滑鼠手感可玩→純邏輯測試綠→preview 端到端無 error。
- [ ] **判斷題：** M1「可玩骨架」成立嗎？接縫＋兩種滑鼠手感＋自由段，整體是「一個能玩的任務雛形」嗎？
- [ ] **決策（M2 輸入）：** 記下要帶進 M2 的：sprite 美術升質（風格聖經）、英文翻譯＋切換、情報解碼小遊戲、簡報/結尾演出、軌道敵人 sprite 化、自由段動線變寬/分支。寫進 ROADMAP「M1 完成」節。
- [ ] 用戶以 Opus 通讀整個 M1，確認後 M1 結束 → 進 M2 規劃（另開 spec→plan）。

---

## Self-Review（對照 spec）

- **spec §2 驗收標準（5 拍 + 接縫 + 存檔讀回）** → Phase A 骨架/接縫 + B 自由 + C 軌道 + D 全迴圈/讀回 ✅
- **§4 ① 接縫骨架優先** → Phase A 先做 ✅；**② 線性巷弄** → Task B7 L 形段清單 ✅；**③ 兩種滑鼠模型** → rail 游標(C3)/free pointerlock(B6/B8) ✅；**④ 輕磁吸** → Task B3 + B8(free) + D3(rail 可選) ✅
- **§5 段落骨架 MissionSequencer** → A3 ✅；**§5.2 SeamController（相機接管/輸入切換/存檔）** → A4 + A5 ✅
- **§6 自由段（碰撞/AI/sprite/磁吸/互動）** → B1–B8 ✅；**§7 軌道段（preset/path/波次/boss 重用引擎）** → C1–C3 ✅；**§7.3 軌道敵人不換 sprite** → C 用 EnemyManager 程序人形 ✅
- **§8.1 aimAssist** → B3 ✅；**§8.2 SaveStore** → A2 ✅；**§8.3 i18n** → A1 ✅；**§8.4 cards** → D1 ✅；**§8.5 美術管線放寬** → B4 ✅
- **§9 darkline/ 結構 + 重用清單** → 檔案結構表 + 各 Task import 對齊（Renderer/GameLoop/CameraRig/EnemyManager/BossController/Shooter/OriginalEnvironment）✅
- **§10 測試策略 + 每 Phase Opus 檢查點** → 純邏輯全 TDD、4 個 Phase 檢查點 ✅
- **無 placeholder**：每個 code step 有完整可跑程式碼；型別/函式名跨 Task 一致（`translate`/`SaveStore`/`MissionSequencer`/`SEGMENT_MODES`/`savePayloadFor`/`clampToSegments`/`stepAI`/`assistAim`/`quantize`/`frameUV`/`moveDelta`/`buildAlleyLayout`/`RailController`/`buildOriginalEnvironment`）✅
- **隔離原則**：唯一動 production 的是 `OriginalEnvironment.js` 純新增匯出（C1，零回歸）✅
- **註記**：①free 段敵人 `r.fired`→玩家傷害/HUD 在 M1 留為提示掛點（spec 未要求 M1 完整玩家 HP；可在 D 視情況接 `HUD`）；②`buildSprite` sprite 來源沿用 M0 `/m0/enemy.png`（gitignored 佔位），M1 美術升質與資產壓縮另議（spec §11、ROADMAP M0 後續成本）。
