# DARKLINE M3 Phase D — VC2 退役 + 入口修 + 體積守衛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把死掉的舊 Virtua Cop 2 復刻遊戲整套從 repo 移除、公開入口改成暗線、加兩道守衛（資產路徑紀律 + 首載體積），讓共用引擎與暗線零回歸。

**Architecture:** 先立守衛（guard test + size script）→ 再切入口（刪 VC2/spike HTML、`darkline.html`→`index.html`、簡化 vite）→ 然後刪 VC2 源碼樹（main/scene-StageEnv/level/character/CameraPathLoader/m0 spike + 各自測試）→ 刪 VC2 工具與資產漏洞 → 全綠 + build + 體積 + 入口眼驗。`npm test` + `vite build` 是「沒誤刪暗線依賴」的傳遞性安全網（暗線生產樹不 import 任何被刪檔，已 code-verified）。

**Tech Stack:** Vite 6 + Three.js r0.168（`game/`）、Vitest 2（jsdom）、Node ESM、GitHub Actions → Cloudflare Workers（`wrangler.toml` assets=`./game/dist`，SPA）。

**權威 spec：** [M3 視覺外觀層 design](../specs/2026-06-22-darkline-m3-visual-layer-design.md) §2（Phase D）。

---

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `game/tests/darkline/asset-discipline.test.js` | Create | 守衛①：mission 資產路徑只在 `/darkline/`；暗線源碼不 import 退役 VC2 模組 |
| `tools/check-bundle-size.mjs` | Create | 守衛②：build 後首載 gzip 體積硬上限 |
| `game/package.json` | Modify | 加 `check:size` script |
| `.github/workflows/build-deploy.yml` | Modify | build 後跑 `check:size` 再 deploy |
| `game/vite.config.js` | Modify | 入口簡化成單一 `index.html`（移除 main/m0 多入口） |
| `game/darkline.html` → `game/index.html` | Rename | 暗線成為公開站首頁（`/`） |
| `game/index.html`(舊 VC2)、`game/{m0,m0-compare,viewer,contact-sheet,motion-strip}.html` | Delete | VC2/spike HTML 入口 |
| `game/src/main.js` | Delete | VC2 遊戲進入點 |
| `game/src/scene/StageEnvironment.js` | Delete | VC2 GLB stage（**保留 sibling `OriginalEnvironment.js`＝keeper**） |
| `game/src/level/`（整目錄：`LevelDirector.js`/`LevelLoader.js`/`levels/*.json`） | Delete | VC2 關卡系統 + 關卡資料 |
| `game/src/character/`（整目錄 7 檔） | Delete | VC2 角色組裝/動作（SEGA MOT） |
| `game/src/render/CameraPathLoader.js` | Delete | VC2 camera.bin 載入 |
| `game/src/darkline/m0/`（整目錄） | Delete | M0 spike（已被 M1 取代，暗線生產樹不引用） |
| `game/tests/{StageEnvironment,LevelDirector,LevelLoader,CameraPathLoader,CharacterFactory,CharacterAssembler,MotionData,MotionPlayer}.test.js`、`game/tests/darkline/m0/` | Delete | 被刪源碼的測試 |
| `game/src/gameplay/EnemyManager.js:106` | Modify | 清 dangling JSDoc `import('../scene/StageEnvironment.js')` 型別參照 |
| `tools/extract-stage-assets/` | Delete | VC2 SEGA 資產提取器（**保留 `tools/sprite-pipeline/`＝暗線**） |
| `game/public/m0/` | Delete | 含誤入版控的 4.75MB `enemy.png`（spike 殘留） |

**KEEP（共用引擎＝暗線底層，即使暫時未被引用也保留；dead-code 修剪是另案）：** `render/{Renderer,sky,unlit,CameraRig,WeaponViewModel,mergeStatic}`、`gameplay/{Shooter,EnemyManager,Enemy,BossController,Projectile,EnemyModelLoader}`、`scene/OriginalEnvironment`、`hud/HUD`、`GameLoop`、`GameManager`、`InputManager`、`locales/`、`game/src/darkline/`（除 `m0/`）、`tools/sprite-pipeline/`、`electron/`。

---

## Task 1：資產紀律守衛測試（TDD guard，先立護網）

**Files:**
- Create: `game/tests/darkline/asset-discipline.test.js`

理由：先把「暗線只用 `/darkline/` 資產、且不 import 退役 VC2 模組」釘成測試。它現在就該 PASS（暗線本來就乾淨）；之後每刪一批跑它 + 全套，確保沒把耦合改進來、也防未來回頭耦合。

- [ ] **Step 1: 寫測試**

```javascript
// game/tests/darkline/asset-discipline.test.js
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { MISSION } from '../../src/darkline/mission/missions/first-island-chain.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const darklineSrc = path.resolve(here, '../../src/darkline')

function jsFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === 'm0') continue // m0 spike is being retired in this phase
      out.push(...jsFiles(p))
    } else if (name.endsWith('.js')) {
      out.push(p)
    }
  }
  return out
}

const FORBIDDEN = ['/scene/StageEnvironment', '/level/', '/character/', '/render/CameraPathLoader', '/main.js']

describe('asset discipline', () => {
  it('mission asset paths live under /darkline/', () => {
    const found = []
    const walk = (o) => {
      for (const v of Object.values(o ?? {})) {
        if (typeof v === 'string' && /\.(png|jpe?g|webp)$/.test(v)) found.push(v)
        else if (v && typeof v === 'object') walk(v)
      }
    }
    walk(MISSION)
    expect(found.length).toBeGreaterThan(0)
    for (const p of found) expect(p.startsWith('/darkline/')).toBe(true)
  })

  it('DARKLINE source does not import retired VC2 modules', () => {
    const offenders = []
    for (const file of jsFiles(darklineSrc)) {
      const src = readFileSync(file, 'utf8')
      const re = /\bfrom\s+['"]([^'"]+)['"]/g
      let m
      while ((m = re.exec(src))) {
        if (FORBIDDEN.some(f => m[1].includes(f))) offenders.push(`${path.relative(darklineSrc, file)} -> ${m[1]}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
```

- [ ] **Step 2: 跑測試確認 PASS**

Run: `cd game && npx vitest run tests/darkline/asset-discipline.test.js`
Expected: PASS（2 test）。若 import 守衛 FAIL → 表示暗線真的耦合到 VC2，**停下先解耦再繼續**（後面的刪除會破壞它）。

- [ ] **Step 3: Commit**

```bash
git add game/tests/darkline/asset-discipline.test.js
git commit -m "test(m3-d): asset-discipline guard — darkline uses /darkline/ only, no VC2 imports"
```

---

## Task 2：首載體積守衛（script + npm script + CI）

**Files:**
- Create: `tools/check-bundle-size.mjs`
- Modify: `game/package.json`（加 `check:size`）
- Modify: `.github/workflows/build-deploy.yml`（build 後跑 check）

理由：spec §6 要求「預算變成會 fail build 的硬測試」。現在基線小（~185KB gz）必過；rail 先架好，Phase A/C 加 postprocessing/GSAP/字型時自動把關。

- [ ] **Step 1: 寫體積檢查 script**

```javascript
// tools/check-bundle-size.mjs
// Coarse first-load gzip budget: sums all shippable assets in the dist dir.
// Refine to true critical-path first-load later if needed (spec §6).
import { readdirSync, statSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const dist = path.resolve(process.argv[2] || 'dist')
const CEILING = 1_500_000 // bytes gzipped — leaves headroom under the <3MB target
const EXT = new Set(['.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.woff2', '.woff', '.ttf', '.cube'])

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (EXT.has(path.extname(p).toLowerCase())) out.push(p)
  }
  return out
}

let total = 0
const rows = []
for (const f of walk(dist)) {
  const gz = gzipSync(readFileSync(f)).length
  total += gz
  rows.push([path.relative(dist, f), gz])
}
rows.sort((a, b) => b[1] - a[1])
for (const [f, gz] of rows.slice(0, 12)) console.log(`${(gz / 1024).toFixed(1).padStart(8)} KB  ${f}`)
console.log(`TOTAL gzip: ${(total / 1024).toFixed(1)} KB  (ceiling ${(CEILING / 1024).toFixed(0)} KB)`)
if (total > CEILING) { console.error('FAIL: first-load gzip budget exceeded'); process.exit(1) }
console.log('OK: under budget')
```

- [ ] **Step 2: 加 npm script**（`game/package.json` 的 `scripts`，在 `test` 後加一行）

```json
    "test": "vitest run --passWithNoTests",
    "check:size": "node ../tools/check-bundle-size.mjs dist"
```

- [ ] **Step 3: 本機驗證（需先有一次 build）**

Run: `cd game && npm run build && npm run check:size`
Expected: 印出 top assets + `TOTAL gzip: ~XXX KB (ceiling 1500 KB)` + `OK: under budget`、exit 0。
（註：此時 build 仍含舊多入口；Task 3 後會只剩暗線。守衛此刻就該過。）

- [ ] **Step 4: 接進 CI**（先 Read `.github/workflows/build-deploy.yml`，在 `npm run build` 那一步之後、`wrangler deploy` 之前插入）

```yaml
      - run: cd game && npm run check:size
```

- [ ] **Step 5: Commit**

```bash
git add tools/check-bundle-size.mjs game/package.json .github/workflows/build-deploy.yml
git commit -m "build(m3-d): first-load gzip size guard (script + npm + CI gate)"
```

---

## Task 3：切公開入口 — 暗線變 `/`，移除 VC2/spike HTML 入口

**Files:**
- Delete: `game/index.html`(舊 VC2)、`game/m0.html`、`game/m0-compare.html`、`game/viewer.html`、`game/contact-sheet.html`、`game/motion-strip.html`
- Rename: `game/darkline.html` → `game/index.html`
- Modify: `game/vite.config.js`（移除 `rollupOptions.input` 多入口，預設 `index.html`）

> 先切入口，**再**刪源碼（Task 4）——這樣 `vite build` 不會在中途引用到還沒刪的入口、也不會引用到剛刪的源碼。

- [ ] **Step 1: 刪 VC2/spike HTML 入口**

```bash
git rm game/index.html game/m0.html game/m0-compare.html game/viewer.html game/contact-sheet.html game/motion-strip.html
```

- [ ] **Step 2: 把暗線設為首頁**

```bash
git mv game/darkline.html game/index.html
```

- [ ] **Step 3: 簡化 vite 多入口**（`game/vite.config.js` 的 `build`）

把：
```javascript
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: './index.html', m0: './m0.html', darkline: './darkline.html' },
    },
  },
```
改為（單一預設入口 `index.html`，不需 rollupOptions.input）：
```javascript
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
```

- [ ] **Step 4: 更新指向舊檔名的參照**（grep 找出 `darkline.html` 的引用——多半在 `electron/` 啟動/截圖與 docs，改成載 `/` 或 `index.html`）

Run: `git grep -n "darkline.html" -- . ':!docs'`
逐一更新找到的引用（如 electron 啟動 URL `/darkline.html` → `/`）。`game/index.html` 內的 `<script type="module" src="/src/darkline/darkline.js">` 是絕對路徑、不受改名影響，確認仍在即可。

- [ ] **Step 5: 跑測試 + build 驗證**

Run: `cd game && npm test && npm run build && npm run check:size`
Expected: 測試全綠；build 只產 `dist/index.html`（暗線）+ 暗線 chunk + `dist/darkline/` sprite；體積守衛過。`game/src/main.js` 等雖仍存在，但已無入口引用、不會被打包。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(m3-d): public entry = DARKLINE — darkline.html→index.html, drop VC2/spike HTML, single vite entry"
```

---

## Task 4：刪 VC2 源碼樹（main / stage-env / level / character / camera-path / m0 spike）+ 清 dangling

**Files:**
- Delete: `game/src/main.js`、`game/src/scene/StageEnvironment.js`、`game/src/level/`（整目錄）、`game/src/character/`（整目錄）、`game/src/render/CameraPathLoader.js`、`game/src/darkline/m0/`（整目錄）
- Delete tests: `game/tests/{StageEnvironment,LevelDirector,LevelLoader,CameraPathLoader,CharacterFactory,CharacterAssembler,MotionData,MotionPlayer}.test.js`、`game/tests/darkline/m0/`（整目錄）
- Modify: `game/src/gameplay/EnemyManager.js:106`（清 dangling JSDoc）

> 安全性：grep 已證實暗線生產樹不 import 上述任一；唯一參照是 `EnemyManager.js:106` 的 **type-only** JSDoc（runtime 無關）。`npm test` + `vite build` 綠即傳遞性確認沒誤刪暗線依賴。**保留 `scene/OriginalEnvironment.js`（keeper）。**

- [ ] **Step 1: 刪源碼**

```bash
git rm game/src/main.js game/src/scene/StageEnvironment.js game/src/render/CameraPathLoader.js
git rm -r game/src/level game/src/character game/src/darkline/m0
```

- [ ] **Step 2: 刪對應測試**

```bash
git rm game/tests/StageEnvironment.test.js game/tests/LevelDirector.test.js game/tests/LevelLoader.test.js game/tests/CameraPathLoader.test.js game/tests/CharacterFactory.test.js game/tests/CharacterAssembler.test.js game/tests/MotionData.test.js game/tests/MotionPlayer.test.js
git rm -r game/tests/darkline/m0
```

- [ ] **Step 3: 清 EnemyManager 的 dangling JSDoc**（`game/src/gameplay/EnemyManager.js:106`）

把：
```javascript
  /** @type {import('../scene/StageEnvironment.js').StageEnvironment|null} */ environment = null
```
改為（去掉對已刪檔的型別參照，用結構型）：
```javascript
  /** @type {{root: import('three').Object3D}|null} */ environment = null
```

- [ ] **Step 4: 跑測試 + build 驗證**

Run: `cd game && npm test && npm run build && npm run check:size`
Expected: 全套測試綠（剩餘＝引擎 + 暗線測試，無孤兒 import）；`vite build` 綠（無未解析 import → 證實沒有保留檔 runtime 依賴被刪檔）；體積守衛過。
若 build 報某保留檔找不到被刪模組 → 那是漏網的耦合，依報錯補刪/改該檔的 import 後重跑。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(m3-d): delete VC2 source — main/StageEnvironment/level/character/CameraPathLoader/m0 spike + their tests"
```

---

## Task 5：刪 VC2 工具與資產漏洞 + 收孤兒改動

**Files:**
- Delete: `tools/extract-stage-assets/`（整目錄）、`game/public/m0/`（整目錄，含 4.75MB `enemy.png`）
- 處理孤兒：`electron/package-lock.json`（保留的 electron 工具 lockfile → 收進版控）

> `game/public/m0/*.png` 已被 `.gitignore:68` 涵蓋，但 `enemy.png` 在規則前就 commit 故被追蹤；`git rm` 整個 m0/ 目錄即可。`stage2/3.json` 與 `StageEnvironment.js` 的孤兒工作改動已隨 Task 4 刪檔消失，無需另處理。`electron/` 是暗線的本機檢視工具（保留），其 lockfile 收進版控。

- [ ] **Step 1: 刪 VC2 工具 + 資產漏洞**

```bash
git rm -r tools/extract-stage-assets
git rm -r game/public/m0
```

- [ ] **Step 2: 收 electron 工具 lockfile（孤兒，屬保留的 electron 工具）**

```bash
git add electron/package-lock.json
```

- [ ] **Step 3: 確認工作區乾淨**

Run: `git status --short`
Expected: 無未追蹤/未暫存殘留（VC2 孤兒已清；若仍見 `game/src/level/levels/stage2.json` 等 modified，表示 Task 4 的 `git rm` 已連同刪除，status 應已不顯示）。

- [ ] **Step 4: 全套驗證**

Run: `cd game && npm test && npm run build && npm run check:size`
Expected: 全綠 + 體積過。`tools/sprite-pipeline` 的測試（若 `npm test` 涵蓋）不受影響。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(m3-d): remove VC2 asset extractor + 4.75MB m0 raw leak; track electron lockfile"
```

---

## Task 6：整輪驗證 + Phase D 檢查點

**Files:** 無（驗證）

- [ ] **Step 1: 全套測試 + build + 體積**

Run: `cd game && npm test && npm run build && npm run check:size`
Expected: 測試全綠、`dist/` 只含暗線（`index.html` + 暗線 chunk + `dist/darkline/` sprite，**無 `/assets/`、無 VC2 stage**）、`OK: under budget`。

- [ ] **Step 2: 確認無 dangling 與無 SEGA 依賴**

Run: `git grep -n "StageEnvironment\|CameraPathLoader\|/assets/" -- game/src ':!game/src/render/sky.js'`
Expected: 僅剩無害的歷史註解（如 `unlit.js`/`mergeStatic.js` 提及）；**無任何 import / runtime fetch**。看到註解可順手清（非阻塞）。

- [ ] **Step 3: 入口眼驗（Phase D 檢查點＝用戶本機）**

依 `electron/README.md` 起 dev server + Electron 真實視窗，開 `/`：
確認**第一眼＝暗線真美術（選單→簡報→軌道夕陽街景＋sprite 敵）**，不是舊 VC2 灰盒 fallback。
（隱藏 preview rAF 凍、走 `electron/shot.cjs` CDP 截圖，見 [[project-vc2-env-gotchas]]。）

- [ ] **Step 4: Phase D 檢查點判斷**

回報：① `npm run build` → `/` 第一眼是暗線真美術、無灰盒；② 測試綠、repo 無 SEGA 資產依賴、無 dangling；③ 首載體積守衛過。三項全過 → Phase D 收，進 **Phase A（後處理電影感層）**。

---

## Self-Review（plan 對 spec §2 自查）

- **spec §2 覆蓋**：Task 0 相依掃描＝已在計畫前完成（grep 實證，結論寫進 File Structure）＋ Task 1 import 守衛永久化；§2.1 刪除集 ✅ Task 3（HTML 入口）+ Task 4（源碼+測試）+ Task 5（工具+資產）；「保留 OriginalEnvironment、刪 StageEnvironment」✅ File Structure + Task 4 明示；§2.2 入口/vite ✅ Task 3；§2.3 dangling JSDoc ✅ Task 4 Step 3；§2.4 資產漏洞 git rm + 孤兒 ✅ Task 5（含「stage2/3.json/StageEnvironment 孤兒隨刪檔消失」「electron lockfile 非 VC2、收進版控」澄清）；§2.6 兩道 guard ✅ Task 1（路徑）+ Task 2（體積，含 CI）；§2 檢查點 ✅ Task 6。
- **無佔位**：guard test、size script、vite/JSON/JSDoc 改動皆給完整 before/after 與指令；CI 插入步驟給確切 run 行（先 Read 該 YAML 再插）。
- **型別/命名一致**：`check:size` npm script ↔ `tools/check-bundle-size.mjs` ↔ CI 同名；刪除集 = grep 實證的精確檔案路徑。
- **安全網**：每個刪除 task 後都 `npm test && npm run build && npm run check:size`；傳遞性依賴破壞會在 build 立刻現形。
- **YAGNI**：只移除 VC2 遊戲本體；暫時未引用的通用引擎（InputManager/mergeStatic）保留，dead-code 修剪列為另案、不在本計畫。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-22-darkline-m3-phase-d-vc2-retire.md`. 兩種執行方式：

**1. Subagent-Driven（建議）** — 每 task 派新 subagent、task 間我 review、快速迭代。
**2. Inline Execution** — 本 session 直接逐 task 執行、批次到檢查點停下給你看。

> 注意：Task 6 Step 3 的「入口眼驗」要你本機 Electron 跑一輪（Claude 隱藏視窗看不到 rAF 畫面）。其餘 task 全可自動驗（測試 + build + 體積）。
