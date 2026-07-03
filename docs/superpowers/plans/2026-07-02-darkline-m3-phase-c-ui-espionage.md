# DARKLINE M3 Phase C — UI 諜報化 + 第一印象 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把全部 UI 收斂成一套諜報軍情語言（design token + OFL 電報字型 + HUD restyle），加 boot 開場、GSAP 段落轉場、打字機字卡、**解碼 scramble 收斂招牌時刻**，以及最小手機 holding-state——公開 URL 第一眼即「有 craft 的作品」而非街機佔位。

**Architecture:** token 先行（`:root` CSS 變數層，全 UI 吃 token）→ HUD/選單/overlay/decode 全面 restyle → 字型走「原始檔 gitignored、只 commit 子集 woff2」管線（glyph allow-list 從 locale 檔產生、測試把關 tofu）→ 動效分兩層：**時間可注入的純 stepper**（typewriter / scramble，由 GameLoop `step(dt)` 推進，jsdom 決定性可測）+ **GSAP** 只管段落 wipe 轉場（測試用 `gsap.updateRoot` 手動推時間）。boot gate 是純狀態機（fonts/frame/assets 三信號 + 最短顯示時長）。

**Tech Stack:** Vite 6 + Vitest 2 (jsdom)、three 0.168、gsap ^3.13（self-host via npm bundle）、subset-font ^2.5（harfbuzz wasm，Node 子集工具）、Cutive Mono（OFL）+ Noto Serif TC（OFL, variable → pin wght 400）。

**權威 spec：** [M3 視覺外觀層 design](../specs/2026-06-22-darkline-m3-visual-layer-design.md) §5（Phase C）＋§0 招牌時刻＋§6 資產預算。

**執行模式（2026-07-02 用戶指示）：** 本輪全程 **Fable** 模型（implementer + spec/quality 雙審都是；試跑驗證）。branch＝`feat/m3-visual-layer`，逐 task commit + push。Task C3/C5 需要網路（curl 下載字型原始檔、npm install）。

---

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `game/index.html` | Modify | `:root` design token 層、viewport meta、既有 CSS 全改吃 token、新 `#boot`/`#holding`/`#transition` 靜態節點與 CSS、`@font-face`、掃描線飄移/游標閃爍 keyframes |
| `game/tests/darkline/tokens.test.js` | Create | guard：token 都在 `:root`、各 UI 區塊吃 `var(--dl-*)`、無裸色值殘留、viewport meta、holding media query |
| `game/src/hud/HUD.js` | Modify | style 區塊 token 化 + 諜報 restyle（電報字卡 / clearance 命條 / 琥珀-紅 lock 圈 / crosshair hit 修正） |
| `game/tests/HUD.test.js` | Modify | 追加 restyle 斷言（token 引用、裸 `#ffe000` 清除、crosshair.hit selector 修正、命條結構不變） |
| `tools/glyph-allowlist.mjs` | Create | glyph allow-list 收集器（locale JSON 全值 + UI 字面量），script 與測試共用 |
| `tools/subset-fonts.mjs` | Create | 子集工具：Cutive Mono→ASCII、NotoSerifTC→allow-list（pin wght 400）、輸出 woff2 + glyph manifest、超預算即 exit 1 |
| `game/public/darkline/fonts/dl-latin.woff2` | Create(生成) | 電報 Latin 字型子集（≤40KB gz 前） |
| `game/public/darkline/fonts/dl-cjk.woff2` | Create(生成) | 思源宋 CJK 子集（≤300KB） |
| `game/public/darkline/fonts/dl-cjk.glyphs.json` | Create(生成) | 子集內容 manifest（tofu guard 比對用） |
| `game/tests/darkline/glyphs.test.js` | Create | tofu guard：locale/字面量每個 glyph ∈ manifest；woff2 體積預算斷言 |
| `game/src/darkline/ui/boot.js` | Create | `createBootGate`（fonts/frame/assets 信號 + minMs 純狀態機） |
| `game/tests/darkline/boot.test.js` | Create | TDD：信號齊+時間到才 ready、缺一不 ready |
| `game/src/darkline/ui/transition.js` | Create | GSAP 琥珀 wipe cover/reveal（Promise API） |
| `game/tests/darkline/transition.test.js` | Create | `gsap.updateRoot` 手動推時間驗 cover/reveal/isCovered |
| `game/src/darkline/ui/typewriter.js` | Create | 純 stepper 打字機（`step(dt)` 推進、`finish()` 跳完） |
| `game/tests/darkline/typewriter.test.js` | Create | TDD：typedCount / step / finish / 空字串 |
| `game/src/darkline/intel/scramble.js` | Create | `scrambleFrame` 純函式 + `createScramble` stepper（rng 可注入） |
| `game/tests/darkline/scramble.test.js` | Create | TDD：t=0 全亂、t=1 全明、前綴鎖定單調、rng 決定性 |
| `game/src/darkline/intel/DecodePanel.js` | Modify | `markSolved` 改走 scramble 收斂（招牌時刻）、新 `step(dt)` API |
| `game/tests/darkline/decodepanel.test.js` | Modify | 解碼成功斷言改「先亂碼、step 後收斂 + `.ok` + clue」 |
| `game/src/darkline/ui/holding.js` | Create | `renderHolding(el, i18n)` 直向持機畫面內容 |
| `game/tests/darkline/holding.test.js` | Create | renderHolding 文案/結構 + i18n 鍵存在 |
| `game/src/darkline/darkline.js` | Modify | boot gate 接線、LoadingManager 預載敵 sprite、transition/typewriter/scramble step 接 GameLoop、`advanceSegment` 包 wipe、renderHolding |
| `game/src/locales/zh.json` / `en.json` | Modify | 新鍵：`boot.link`、`holding.title`、`holding.body`、`holding.rotate` |
| `game/tests/darkline/i18n-keyalign.test.js` | Create | zh/en 鍵集合全等守衛（**注意**：`feat/first-act-narrative` 也有同路徑同用途檔，合併時任取一版） |
| `game/package.json` | Modify | dep `gsap`、devDep `subset-font`、script `fonts:build` |
| `.gitignore` | Modify | `/game/fonts-src/`（字型原始檔不進版控） |
| `CREDITS.md` | Modify | 字型（OFL）與 GSAP 條目 |

> **KEEP 不動：** Phase A `postfx`/`cinematicConfig`、Phase B `sky`/`streetKit`/`AlleyScene`、`decode.js` 謎題邏輯、`menu.js`（樣式在 index.html 吃 token 即可，DOM 不動）、`MissionSequencer`。**N 鍵在無字卡時直接 `seq.next()` 的 debug 跳段行為維持現狀**（另案處理，不在本 Phase 動玩法）。

**z-index 地圖（新增後）：** hud 5 / crosshair 6 / overlay 8 / decode 9 / menu 10 / **transition 11 / boot 12 / holding 13**。

**體積預估（§6 對照）：** 現況 170.6KB + gsap ~28KB + dl-cjk ≤300KB + dl-latin ≤40KB ≈ 540KB，遠低於守衛 1465KB。

---

## Task C1：design token 層 + index.html 全面 token 化

**Files:**
- Modify: `game/index.html`
- Test(Create): `game/tests/darkline/tokens.test.js`

- [ ] **Step 1: 寫失敗測試**（新檔 `game/tests/darkline/tokens.test.js`）

```javascript
// Phase C guard：design token 層存在、UI 區塊吃 token、無裸色值殘留。
// 直接讀 index.html 原文做字串斷言（jsdom 不解析 <style> cascade，字串守衛最穩）。
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')

describe('design tokens (index.html)', () => {
  it('defines the espionage token set in :root', () => {
    for (const t of ['--dl-amber:', '--dl-amber-bright:', '--dl-amber-rgb:', '--dl-paper:',
                     '--dl-red:', '--dl-intel-bg:', '--dl-scanline:', '--dl-ease:', '--dl-dur:',
                     '--dl-glow:', '--dl-font:']) {
      expect(html, `missing token ${t}`).toContain(t)
    }
  })
  it('UI blocks consume tokens, not raw palette values', () => {
    const afterRoot = html.slice(html.indexOf('}', html.indexOf(':root')))   // :root 區塊之後
    expect(afterRoot).not.toContain('#e8c87a')     // 琥珀一律走 var(--dl-amber)
    expect(afterRoot).not.toContain('#f4e2b0')     // 紙白一律走 var(--dl-paper)
    expect(afterRoot).not.toContain('232,200,122') // 半透明琥珀一律走 rgba(var(--dl-amber-rgb),…)
    expect(afterRoot).toContain('var(--dl-amber)')
    expect(afterRoot).toContain('var(--dl-font)')
  })
  it('has the viewport meta (mobile holding-state 前置)', () => {
    expect(html).toContain('name="viewport"')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/tokens.test.js`
Expected: FAIL（`--dl-amber:` 不存在）

- [ ] **Step 3: 實作 — index.html `<style>` 開頭插入 token 層 + viewport meta**

`<head>` 內 `<meta charset>` 之後加：

```html
<meta name="viewport" content="width=device-width,initial-scale=1">
```

`<style>` 第一行（`html,body` 規則之前）插入：

```css
/* ── Phase C design tokens：全 UI 一套諜報電報語言的單一來源 ── */
:root{
  --dl-amber:#e8c87a;            /* 主琥珀（電報磷光） */
  --dl-amber-bright:#ffe6a8;     /* 高亮琥珀（解碼成功/鎖圈早相位） */
  --dl-amber-dim:#c8b074;        /* 次級琥珀（密文/弱化） */
  --dl-amber-faint:#b59a5e;      /* 註腳提示 */
  --dl-amber-rgb:232,200,122;    /* 半透明琥珀用 rgba(var(--dl-amber-rgb),α) */
  --dl-paper:#f4e2b0;            /* 紙白（選單/按鈕框） */
  --dl-red:#ff4a3a;              /* 警示紅（受擊/末相位/boss） */
  --dl-intel-bg:rgba(6,7,10,.95);/* 情報深底 */
  --dl-intel-bg-solid:#0a0a12;   /* 反白/實心深底 */
  --dl-scanline:repeating-linear-gradient(0deg,rgba(0,0,0,0) 0 2px,rgba(0,0,0,.16) 2px 4px);
  --dl-ease:cubic-bezier(.22,1,.36,1);
  --dl-dur:240ms;
  --dl-glow:0 0 6px rgba(232,200,122,.4);
  --dl-glow-strong:0 0 10px rgba(232,200,122,.6);
  /* 字型 token：C3 的 @font-face 讓前兩個名字生效；之前自動走 fallback，零改動升級 */
  --dl-font:'DL Telegraph','DL Intel CJK',ui-monospace,'Courier New',Courier,monospace;
}
```

- [ ] **Step 4: 既有 CSS 換 token（機械替換，語意不變）**

在 `game/index.html` 既有規則中做以下替換（**只動 `<style>` 內、`:root` 以外**）：

| 舊值 | 新值 |
|---|---|
| `#e8c87a` | `var(--dl-amber)` |
| `#f4e2b0` | `var(--dl-paper)` |
| `#c8b074` | `var(--dl-amber-dim)` |
| `#b59a5e` | `var(--dl-amber-faint)` |
| `#ffe6a8`（decode-reveal.ok 一帶） | `var(--dl-amber-bright)` |
| `rgba(232,200,122,.X)`（所有 α） | `rgba(var(--dl-amber-rgb),.X)` |
| `rgba(255,230,168,.X)` | `rgba(255,230,168,.X)` 保留（bright 專用高光，僅兩處，不建 token） |
| `rgba(6,7,10,.95)` / `rgba(8,8,12,.96)` / `rgba(6,7,10,.92)` | `var(--dl-intel-bg)` |
| `#0a0a12` | `var(--dl-intel-bg-solid)` |
| `font:16px/1.85 ui-monospace,'Courier New',Courier,monospace` 等字型堆疊（overlay/decode 兩處 + decode-btn） | 對應改 `font:16px/1.85 var(--dl-font)` 等（保留原字級/行高） |
| `#menu` 的 `system-ui`（容器與 .menu-btn 兩處） | `var(--dl-font)` |
| `repeating-linear-gradient(0deg,rgba(0,0,0,0) 0 2px,rgba(0,0,0,.16) 2px 4px)`（overlay::after 與 decode-card::after） | `var(--dl-scanline)` |
| `#crosshair` 的 `border:2px solid #f4e2b0` | `border:2px solid var(--dl-paper)` |
| `#hint` 的 `color:#9c9;font:12px monospace` | `color:var(--dl-amber-faint);font:12px var(--dl-font);letter-spacing:.08em` |

`#menu .menu-title` 追加電報字距：`letter-spacing:.22em;text-shadow:var(--dl-glow-strong)`（原 `.12em` 改 `.22em`）。

- [ ] **Step 5: 跑測試綠 + 全套不回歸**

Run: `cd game && npx vitest run tests/darkline/tokens.test.js && npm test`
Expected: tokens 3 案 PASS，全套綠

- [ ] **Step 6: Commit**

```bash
git add game/index.html game/tests/darkline/tokens.test.js
git commit -m "feat(m3-c): design token layer (--dl-*) + tokenise menu/overlay/decode/crosshair/hint CSS"
```

---

## Task C2：HUD 諜報化 restyle（token + 電報字卡 + clearance 命條 + 琥珀-紅 lock 圈 + crosshair hit 修）

**Files:**
- Modify: `game/src/hud/HUD.js`（style 區塊 `_build()` 內 :41-122）
- Test: `game/tests/HUD.test.js`

> 先 Read `game/tests/HUD.test.js` 看既有斷言風格，於其後**追加** describe，不改既有行為測試（`_renderLives`/`_renderBullets`/lock 圈計算的行為全部不變——這是純視覺 restyle）。

- [ ] **Step 1: 追加失敗測試**（`game/tests/HUD.test.js` 末尾）

```javascript
describe('Phase C espionage restyle', () => {
  function styleText() {
    const host = document.createElement('div')
    new HUD(host, { maxHealth: 5, maxAmmo: 6 })
    return host.querySelector('style').textContent
  }
  it('consumes design tokens instead of arcade palette', () => {
    const css = styleText()
    expect(css).toContain('var(--dl-amber')          // amber / amber-bright 家族
    expect(css).toContain('var(--dl-font)')
    expect(css).not.toContain('#ffe000')             // 街機金全數退役
    expect(css).not.toContain('Arial Black')         // 街機字卡字體退役
    expect(css).not.toContain("'★'")                 // 星命改 clearance 章（CSS 章，不再吃字型 glyph）
  })
  it('crosshair hit flash targets the real circular crosshair (no ::before/.ring ghosts)', () => {
    const css = styleText()
    expect(css).not.toContain('#crosshair.hit::before')   // index.html 準心是圓圈，無 pseudo 十字
    expect(css).not.toContain('.ring')                    // 也沒有 .ring 子節點
    expect(css).toContain('#crosshair.hit')               // 但 hit 態存在（border/glow 版）
  })
  it('lives keep the full/empty contract (behavior unchanged)', () => {
    const host = document.createElement('div')
    const hud = new HUD(host, { maxHealth: 3, maxAmmo: 6 })
    hud.setHealth(2)
    const lives = [...host.querySelectorAll('.life')]
    expect(lives.map(l => l.classList.contains('full'))).toEqual([true, true, false])
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/HUD.test.js`
Expected: 新 describe FAIL（`#ffe000`、`Arial Black`、`#crosshair.hit::before` 都還在）

- [ ] **Step 3: 實作 — `HUD.js` style 區塊 restyle**

`_build()` 的 `style.textContent` 各段修改如下（DOM 結構與所有方法**零改動**）：

```css
    /* SCORE — 電報體琥珀 */
    #hud-top-left { position: absolute; top: 12px; left: 20px; display: flex; flex-direction: column; gap: 6px; }
    #hud-score-panel {
      font: 700 18px var(--dl-font);
      letter-spacing: .18em;
      text-shadow: 1px 1px 0 #000, var(--dl-glow);
    }
    #hud-score-label { color: var(--dl-amber-dim); margin-right: 8px; }
    #score { color: var(--dl-amber-bright); }

    /* Lives — clearance 章（純 CSS 琥珀章票，dog-ear 缺角），不再依賴 ★ glyph。
       剪影放 ::before：clip-path 會裁掉本體所有繪製（含陰影），glow 須用 parent filter 才看得見；
       空章＝同形淡填色（border 沿 clip 斜邊無筆畫，會有斷口，故捨 border）。 */
    #health-bar { display: flex; gap: 5px; }
    .life { position: relative; width: 14px; height: 19px; }
    .life::before {
      content: ''; position: absolute; inset: 0;
      clip-path: polygon(0 0, 100% 0, 100% 100%, 30% 100%, 0 76%);
    }
    .life.full::before  { background: var(--dl-amber); }
    .life.full          { filter: drop-shadow(var(--dl-glow)); }   /* 沿 dog-ear 輪廓發光 */
    .life.empty::before { background: rgba(var(--dl-amber-rgb), .18); }

    /* Ammo — 琥珀彈匣格 */
    #hud-bottom-right { position: absolute; bottom: 20px; right: 20px; }
    #ammo-bar { display: flex; gap: 4px; align-items: center; }
    .ammo-slot {
      width: 8px; height: 20px; border-radius: 1px;
      border: 1px solid #000; box-sizing: border-box;
    }
    .ammo-slot.full  { background: var(--dl-amber); box-shadow: var(--dl-glow); }
    .ammo-slot.empty { background: #2c2c30; }
    #reserve-mags { color: var(--dl-amber); font: 12px var(--dl-font); letter-spacing: .12em; margin-top: 4px; text-align: right; }
    #reserve-mags.reloading { color: var(--dl-red); }

    /* Title cards — tracked amber telegraph caps（去街機紅描邊） */
    #hud-card {
      position: absolute; top: 38%; left: 0; right: 0;
      text-align: center; pointer-events: none;
      font: 700 38px var(--dl-font);
      letter-spacing: .3em; color: var(--dl-amber);
      text-shadow: 2px 2px 0 #000, var(--dl-glow-strong);
      opacity: 0; transform: scale(0.92);
      transition: opacity var(--dl-dur) var(--dl-ease), transform var(--dl-dur) var(--dl-ease);
    }
    #hud-card.active { opacity: 1; transform: scale(1); }

    /* Boss bar — 琥珀框 + 紅情報填充 */
    #boss-bar {
      position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
      width: 56%; height: 14px; border: 1px solid var(--dl-amber); border-radius: 2px;
      background: var(--dl-intel-bg-solid); box-shadow: var(--dl-glow);
      display: none;
    }
    #boss-bar.active { display: block; }
    #boss-bar-fill {
      height: 100%; width: 100%;
      background: linear-gradient(#ff6a5a, var(--dl-red));
      transition: width 120ms ease-out;
    }

    /* Lock-on rings — 琥珀-紅情報配色（相位語意不變：green=早/×3、yellow=中、red=末） */
    #lock-overlay { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .lock-ring {
      position: absolute; box-sizing: border-box;
      border: 2px solid currentColor; border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 6px currentColor;
      opacity: 0.9;
    }
    .lock-ring.green  { color: var(--dl-amber-bright); }
    .lock-ring.yellow { color: var(--dl-amber); }
    .lock-ring.red    { color: var(--dl-red); }

    /* Damage flash —（維持紅暈，但吃 token） */
    #damage-flash {
      position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(220,0,0,0.6) 100%);
      opacity: 0; transition: opacity 220ms ease-out;
    }
    #damage-flash.active { opacity: 1; transition: opacity 40ms ease-in; }

    /* Crosshair hit flash — index.html 準心是簡單圓圈：hit＝紅框+紅光（修掉舊 pseudo 十字與 ring 子節點的幽靈 selector） */
    #crosshair.hit { border-color: var(--dl-red); box-shadow: 0 0 10px var(--dl-red); }
```

（`flashCrosshair()`、`_renderLives()`、`_renderBullets()` 等 JS 全部不動。）

- [ ] **Step 4: 跑測試綠 + 全套不回歸**

Run: `cd game && npx vitest run tests/HUD.test.js && npm test`
Expected: PASS 全綠

- [ ] **Step 5: Commit**

```bash
git add game/src/hud/HUD.js game/tests/HUD.test.js
git commit -m "feat(m3-c): HUD espionage restyle — telegraph caps, clearance life chits, amber-red lock rings, crosshair hit fix"
```

---

## Task C3：OFL 字型管線（子集工具 + tofu guard + @font-face + CREDITS）

**Files:**
- Create: `tools/glyph-allowlist.mjs`、`tools/subset-fonts.mjs`
- Create(生成): `game/public/darkline/fonts/{dl-latin.woff2, dl-cjk.woff2, dl-cjk.glyphs.json}`
- Test(Create): `game/tests/darkline/glyphs.test.js`
- Modify: `game/index.html`（@font-face）、`game/package.json`、`.gitignore`、`CREDITS.md`

- [ ] **Step 1: 建 allow-list 收集器**（新檔 `tools/glyph-allowlist.mjs`）

```javascript
// glyph allow-list：CJK 子集要涵蓋的全部非 ASCII 字元。
// 來源＝locale JSON 全部值 + 不在 locale 裡的 UI 字面量。文案長新字 → 這裡自動長 →
// glyphs.test.js 比對 manifest 抓到「忘記重跑 fonts:build」。
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// ASCII 可列印區（Latin 子集固定範圍；也一併塞進 CJK 子集當保底）
export const LATIN_PRINTABLE = (() => {
  let s = ''
  for (let c = 0x20; c <= 0x7e; c++) s += String.fromCharCode(c)
  return s
})()

// UI 字面量（code 裡直接寫、不經 i18n 的 user-facing 字元）：
// 選單語言鈕「中文」、解碼轉盤 ◀▶、備彈匣 ◖×、hint「段落：（）」、打字機游標 ▌。
export const LITERALS = '中文◀▶◖×▌段落：（）'

export function collectGlyphs({ localesDir = path.join(here, '../game/src/locales') } = {}) {
  const out = new Set()
  const add = str => { for (const ch of str) if (ch.codePointAt(0) > 0x7e) out.add(ch) }
  for (const f of ['zh.json', 'en.json']) {
    const dict = JSON.parse(readFileSync(path.join(localesDir, f), 'utf8'))
    for (const v of Object.values(dict)) add(v)
  }
  add(LITERALS)
  return out
}
```

- [ ] **Step 2: 寫失敗測試**（新檔 `game/tests/darkline/glyphs.test.js`）

```javascript
// tofu guard：每個 user-facing glyph 都要在已 commit 的 CJK 子集 manifest 裡；
// 體積走 §6 預算。manifest 由 tools/subset-fonts.mjs 與字型同時生成（同源不漂移）。
import { readFileSync, statSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { collectGlyphs } from '../../../tools/glyph-allowlist.mjs'

const fontsDir = new URL('../../public/darkline/fonts/', import.meta.url)

describe('font subset budget + tofu guard', () => {
  it('every user-facing glyph is inside the committed CJK subset', () => {
    const manifest = new Set(JSON.parse(readFileSync(new URL('dl-cjk.glyphs.json', fontsDir), 'utf8')))
    const missing = [...collectGlyphs()].filter(ch => !manifest.has(ch))
    expect(missing, `文案長了新字，請重跑 npm run fonts:build：${missing.join('')}`).toEqual([])
  })
  it('subset files stay inside the §6 budget', () => {
    expect(statSync(new URL('dl-cjk.woff2', fontsDir)).size).toBeLessThanOrEqual(300 * 1024)
    expect(statSync(new URL('dl-latin.woff2', fontsDir)).size).toBeLessThanOrEqual(40 * 1024)
  })
})
```

Run: `cd game && npx vitest run tests/darkline/glyphs.test.js`
Expected: FAIL（manifest 檔不存在）

- [ ] **Step 3: 建子集工具**（新檔 `tools/subset-fonts.mjs`）

```javascript
// 字型子集管線（spec §5.1 / §6）：原始檔 gitignored（game/fonts-src/），只 commit 子集 woff2。
//   Latin  = Cutive Mono（OFL 電報打字機體）→ ASCII 可列印區
//   CJK    = Noto Serif TC variable（OFL 思源宋）→ glyph allow-list + ASCII 保底，pin wght 400
// 用法：cd game && npm run fonts:build（原始檔下載指令見下方 SRC 註解 / CREDITS.md）
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'
import { collectGlyphs, LATIN_PRINTABLE } from './glyph-allowlist.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = {
  // curl -L -o game/fonts-src/CutiveMono-Regular.ttf "https://github.com/google/fonts/raw/main/ofl/cutivemono/CutiveMono-Regular.ttf"
  latin: path.join(here, '../game/fonts-src/CutiveMono-Regular.ttf'),
  // curl -L -o game/fonts-src/NotoSerifTC-Variable.ttf "https://github.com/google/fonts/raw/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf"
  cjk: path.join(here, '../game/fonts-src/NotoSerifTC-Variable.ttf'),
}
const OUT = path.join(here, '../game/public/darkline/fonts')
const BUDGET = { latin: 40 * 1024, cjk: 300 * 1024 }

mkdirSync(OUT, { recursive: true })
const glyphs = [...collectGlyphs()].sort()

const latinBuf = await subsetFont(readFileSync(SRC.latin), LATIN_PRINTABLE, { targetFormat: 'woff2' })
writeFileSync(path.join(OUT, 'dl-latin.woff2'), latinBuf)

const cjkBuf = await subsetFont(readFileSync(SRC.cjk), glyphs.join('') + LATIN_PRINTABLE, {
  targetFormat: 'woff2',
  variationAxes: { wght: 400 },   // variable → 定重 instance
})
writeFileSync(path.join(OUT, 'dl-cjk.woff2'), cjkBuf)
writeFileSync(path.join(OUT, 'dl-cjk.glyphs.json'), JSON.stringify(glyphs))

for (const [name, cap] of [['dl-latin.woff2', BUDGET.latin], ['dl-cjk.woff2', BUDGET.cjk]]) {
  const size = statSync(path.join(OUT, name)).size
  console.log(`${name}: ${(size / 1024).toFixed(1)} KB (cap ${(cap / 1024).toFixed(0)} KB)`)
  if (size > cap) { console.error(`FAIL: ${name} over budget`); process.exit(1) }
}
console.log(`glyphs: ${glyphs.length}`)
```

- [ ] **Step 4: 裝 devDep、下載原始檔、跑子集**

```bash
cd game && npm i -D subset-font@^2.5.0
mkdir -p game/fonts-src   # （在 repo 根執行）
curl -L -o game/fonts-src/CutiveMono-Regular.ttf "https://github.com/google/fonts/raw/main/ofl/cutivemono/CutiveMono-Regular.ttf"
curl -L -o game/fonts-src/NotoSerifTC-Variable.ttf "https://github.com/google/fonts/raw/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf"
```

`game/package.json` scripts 加：`"fonts:build": "node ../tools/subset-fonts.mjs"`；`.gitignore` 加一行 `/game/fonts-src/`。

Run: `cd game && npm run fonts:build`
Expected: 印出兩檔體積皆在 cap 內 + glyph 數（~700），生成 3 個輸出檔

- [ ] **Step 5: @font-face 接上 token**（`game/index.html` `:root` 規則之後）

```css
/* OFL self-host（無 CDN；Electron 離線可用）。swap＝字型慢到也不拖 LCP。 */
@font-face{font-family:'DL Telegraph';src:url('/darkline/fonts/dl-latin.woff2') format('woff2');font-display:swap}
@font-face{font-family:'DL Intel CJK';src:url('/darkline/fonts/dl-cjk.woff2') format('woff2');font-display:swap}
```

（`--dl-font` token 在 C1 已放好這兩個名字 → 本步之後真字型自動生效，其他檔案零改動。）

- [ ] **Step 6: CREDITS.md 登錄**（末尾追加）

```markdown
## Fonts (Phase C — UI espionage layer)

| File (committed) | Source | Licence | Processing |
|---|---|---|---|
| `game/public/darkline/fonts/dl-latin.woff2` | [Cutive Mono](https://fonts.google.com/specimen/Cutive+Mono) (google/fonts `ofl/cutivemono`) | SIL OFL 1.1 | `tools/subset-fonts.mjs` → ASCII printable subset, woff2 |
| `game/public/darkline/fonts/dl-cjk.woff2` | [Noto Serif TC](https://fonts.google.com/noto/specimen/Noto+Serif+TC) (google/fonts `ofl/notoseriftc`, variable) | SIL OFL 1.1 | same tool → glyph allow-list subset (locales + UI literals), wght pinned 400, woff2 |

Raw originals live in `game/fonts-src/` (**gitignored**, download URLs in `tools/subset-fonts.mjs`).
Regenerate any time with `cd game && npm run fonts:build`; `dl-cjk.glyphs.json` is the
committed manifest that `tests/darkline/glyphs.test.js` checks new copy against (tofu guard).

## Libraries

| Package | Licence | Use |
|---|---|---|
| `gsap` | Standard "no charge" GreenSock/Webflow licence (GSAP is 100% free incl. plugins since 3.13) | Phase C segment-wipe transitions (self-hosted via npm bundle) |
```

- [ ] **Step 7: 測試綠 + build + 體積守衛**

Run: `cd game && npx vitest run tests/darkline/glyphs.test.js tests/darkline/tokens.test.js && npm test && npm run build && npm run check:size`
Expected: 全綠；check:size 顯示新增 woff2 後 TOTAL 仍遠低於 1465KB

- [ ] **Step 8: Commit**

```bash
git add tools/glyph-allowlist.mjs tools/subset-fonts.mjs game/public/darkline/fonts/ game/tests/darkline/glyphs.test.js game/index.html game/package.json game/package-lock.json .gitignore CREDITS.md
git commit -m "feat(m3-c): OFL font pipeline — Cutive Mono + Noto Serif TC subsets, glyph allow-list tofu guard, @font-face"
```

---

## Task C4：boot 開場（gate 狀態機 + LoadingManager 預載 + i18n）

**Files:**
- Create: `game/src/darkline/ui/boot.js`
- Test(Create): `game/tests/darkline/boot.test.js`
- Modify: `game/index.html`（#boot 靜態節點 + CSS）、`game/src/darkline/darkline.js`、`game/src/locales/zh.json`、`game/src/locales/en.json`

- [ ] **Step 1: 寫失敗測試**（新檔 `game/tests/darkline/boot.test.js`）

```javascript
// boot gate：fonts/frame/assets 三信號都到 + 最短顯示時長 → ready。純狀態機、時間注入。
import { describe, it, expect } from 'vitest'
import { createBootGate } from '../../src/darkline/ui/boot.js'

describe('createBootGate', () => {
  it('is not ready until every signal has arrived', () => {
    const g = createBootGate({ minMs: 900 })
    g.begin(0)
    g.signal('fonts'); g.signal('frame')
    expect(g.ready(2000)).toBe(false)      // assets 未到
    g.signal('assets')
    expect(g.ready(2000)).toBe(true)
  })
  it('holds until minMs even when signals are instant (電報開場要吃得到一眼)', () => {
    const g = createBootGate({ minMs: 900 })
    g.begin(100)
    g.signal('fonts'); g.signal('frame'); g.signal('assets')
    expect(g.ready(500)).toBe(false)       // 只過了 400ms
    expect(g.ready(1000)).toBe(true)       // 過了 900ms
  })
  it('is never ready before begin()', () => {
    const g = createBootGate()
    g.signal('fonts'); g.signal('frame'); g.signal('assets')
    expect(g.ready(99999)).toBe(false)
  })
})
```

Run: `cd game && npx vitest run tests/darkline/boot.test.js`
Expected: FAIL（模組不存在）

- [ ] **Step 2: 實作**（新檔 `game/src/darkline/ui/boot.js`）

```javascript
// boot gate（spec §5.4）：#boot 是 index.html 靜態節點（inline CSS + 系統字 fallback → LCP=boot 文字），
// 這裡只管「何時可以收掉」：字型 ready + 首幀已渲染 + 預載資產完成 + 至少顯示 minMs。
export function createBootGate({ minMs = 900 } = {}) {
  const seen = new Set()
  let t0 = null
  return {
    begin(now) { t0 = now },
    signal(name) { seen.add(name) },
    ready(now) {
      return t0 != null && seen.has('fonts') && seen.has('frame') && seen.has('assets')
        && (now - t0) >= minMs
    },
  }
}
```

Run: `cd game && npx vitest run tests/darkline/boot.test.js` → PASS

- [ ] **Step 3: index.html 靜態 #boot 節點 + CSS**

`<body>` 內 `<div id="menu">` 之後加：

```html
<div id="boot">
  <div class="boot-title">DARKLINE</div>
  <div class="boot-sub">— FIRST ISLAND CHAIN · 1953 —</div>
  <div class="boot-bar"><div class="boot-bar-fill"></div></div>
  <div class="boot-link">ESTABLISHING LINK ──</div>
</div>
```

`<style>` 末尾加：

```css
/* boot 開場（z=12，蓋過選單）：靜態 HTML+系統字 fallback 立刻畫 → LCP<1s；ready 後淡出。 */
#boot{position:fixed;inset:0;z-index:12;display:flex;flex-direction:column;justify-content:center;
  align-items:center;gap:14px;background:var(--dl-intel-bg-solid);color:var(--dl-amber);
  font:16px/1.6 var(--dl-font);letter-spacing:.1em;
  transition:opacity .6s var(--dl-ease)}
#boot::after{content:'';position:absolute;inset:0;pointer-events:none;background:var(--dl-scanline)}
#boot .boot-title{font-size:44px;letter-spacing:.42em;text-shadow:var(--dl-glow-strong);padding-left:.42em}
#boot .boot-sub{font-size:13px;letter-spacing:.3em;color:var(--dl-amber-dim)}
#boot .boot-bar{width:220px;height:2px;background:rgba(var(--dl-amber-rgb),.2);margin-top:10px}
#boot .boot-bar-fill{width:0%;height:100%;background:var(--dl-amber);box-shadow:var(--dl-glow);
  transition:width .3s var(--dl-ease)}
#boot .boot-link{font-size:12px;color:var(--dl-amber-faint);animation:dl-blink 1.2s steps(2) infinite}
@keyframes dl-blink{50%{opacity:.35}}
#boot.done{opacity:0;pointer-events:none}
#boot.hidden{display:none}
```

- [ ] **Step 4: i18n 新鍵**（zh/en 各加）

`zh.json`：`"boot.link": "建立線路──"`
`en.json`：`"boot.link": "ESTABLISHING LINK ──"`

- [ ] **Step 5: darkline.js 接線**

import 區加：`import { createBootGate } from './ui/boot.js'`

`const loop = new GameLoop(…)` 之前加：

```javascript
// ── boot 開場（spec §5.4）：靜態 #boot 已在 first paint 畫出（LCP），這裡管收掉時機 ──
const bootEl = document.getElementById('boot')
bootEl.querySelector('.boot-link').textContent = i18n.t('boot.link')
const bootGate = createBootGate({ minMs: 900 })
bootGate.begin(performance.now())
;(document.fonts?.ready ?? Promise.resolve()).then(() => bootGate.signal('fonts'))
// 真 LoadingManager：boot 期預載自由段敵 sprite（暖 HTTP cache，enterFree 更快），進度餵 boot bar。
{
  const mgr = new THREE.LoadingManager()
  const fill = bootEl.querySelector('.boot-bar-fill')
  mgr.onProgress = (_url, n, total) => { fill.style.width = Math.round((n / total) * 100) + '%' }
  const done = () => { fill.style.width = '100%'; bootGate.signal('assets') }
  mgr.onLoad = done
  mgr.onError = done   // 預載失敗不擋 boot（enterFree 會再載一次）
  new THREE.TextureLoader(mgr).load(MISSION.free.enemy.sprite)
}
let bootDone = false
```

`GameLoop` callback 第一行（`weapon.update(dt)` 之前）加：

```javascript
  if (!bootDone) {
    bootGate.signal('frame')
    if (bootGate.ready(performance.now())) {
      bootDone = true
      bootEl.classList.add('done')
      setTimeout(() => bootEl.classList.add('hidden'), 700)   // 等淡出動畫完再撤 DOM 顯示
    }
  }
```

- [ ] **Step 6: 全套綠 + Commit**

Run: `cd game && npm test`
Expected: 全綠。**若 `glyphs.test.js` 紅**（`boot.link` 文案帶進新 CJK 字，如「路」）＝tofu guard 正常運作：跑 `cd game && npm run fonts:build` 重生子集後再跑到綠，並把 `game/public/darkline/fonts/` 一起 commit。

```bash
git add game/src/darkline/ui/boot.js game/tests/darkline/boot.test.js game/index.html game/src/darkline/darkline.js game/src/locales/zh.json game/src/locales/en.json game/public/darkline/fonts/
git commit -m "feat(m3-c): boot sequence — static telegraph boot screen (LCP-first), gate state machine, LoadingManager sprite preload"
```

---

## Task C5：GSAP 段落轉場（琥珀 wipe + 掃描線飄移）

**Files:**
- Create: `game/src/darkline/ui/transition.js`
- Test(Create): `game/tests/darkline/transition.test.js`
- Modify: `game/index.html`（#transition 節點 + CSS + 掃描線飄移動畫）、`game/src/darkline/darkline.js`、`game/package.json`（dep gsap）

- [ ] **Step 1: 裝 dep**

```bash
cd game && npm i gsap@^3.13.0
```

- [ ] **Step 2: 寫失敗測試**（新檔 `game/tests/darkline/transition.test.js`）

```javascript
// GSAP 時間軸決定性測試：卸掉內建 ticker、用 gsap.updateRoot(秒) 手動推時間（GSAP 官方做法）。
import { describe, it, expect, beforeAll } from 'vitest'
import { gsap } from 'gsap'
import { mountTransition } from '../../src/darkline/ui/transition.js'

beforeAll(() => {
  gsap.ticker.remove(gsap.updateRoot)
  gsap.updateRoot(0)
})

describe('mountTransition', () => {
  it('cover() resolves once the wipe fully covers; reveal() clears it', async () => {
    const host = document.createElement('div')
    const t = mountTransition(host)
    expect(t.isCovered).toBe(false)

    let covered = false
    t.cover({ duration: 0.3 }).then(() => { covered = true })
    gsap.updateRoot(0.1)
    expect(host.classList.contains('active')).toBe(true)   // wipe 進行中即遮擋
    gsap.updateRoot(0.5)
    await Promise.resolve()                                 // flush promise
    expect(covered).toBe(true)
    expect(t.isCovered).toBe(true)

    let revealed = false
    t.reveal({ duration: 0.3 }).then(() => { revealed = true })
    gsap.updateRoot(1.0)
    await Promise.resolve()
    expect(revealed).toBe(true)
    expect(t.isCovered).toBe(false)
    expect(host.classList.contains('active')).toBe(false)
  })
})
```

Run: `cd game && npx vitest run tests/darkline/transition.test.js`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作**（新檔 `game/src/darkline/ui/transition.js`）

```javascript
// 段落轉場（spec §5.5）：琥珀 wipe + 掃描線，蓋住段落拆建的縫（scene pop）。
// cover() 完成後才輪到呼叫端拆場景；reveal() 掃出。樣式在 index.html（.dl-transition）。
import { gsap } from 'gsap'

export function mountTransition(container) {
  container.classList.add('dl-transition')
  const bar = document.createElement('div')
  bar.className = 'wipe'
  container.append(bar)
  let covered = false
  return {
    get isCovered() { return covered },
    cover({ duration = 0.35 } = {}) {
      return new Promise(resolve => {
        container.classList.add('active')
        gsap.fromTo(bar, { xPercent: -100 }, {
          xPercent: 0, duration, ease: 'power2.inOut',
          onComplete: () => { covered = true; resolve() },
        })
      })
    },
    reveal({ duration = 0.45 } = {}) {
      return new Promise(resolve => {
        gsap.to(bar, {
          xPercent: 100, duration, ease: 'power2.inOut',
          onComplete: () => {
            covered = false
            container.classList.remove('active')
            gsap.set(bar, { xPercent: -100 })
            resolve()
          },
        })
      })
    },
  }
}
```

Run: `cd game && npx vitest run tests/darkline/transition.test.js` → PASS

- [ ] **Step 4: index.html 節點 + CSS + 掃描線飄移**

`<body>` 的 `#menu` 之前加：`<div id="transition"></div>`

`<style>` 末尾加：

```css
/* 段落轉場 wipe（z=11）：深底 + 琥珀前緣 + 掃描線。 */
.dl-transition{position:fixed;inset:0;z-index:11;display:none;pointer-events:none;overflow:hidden}
.dl-transition.active{display:block}
.dl-transition .wipe{position:absolute;inset:0;transform:translateX(-100%);
  background:var(--dl-intel-bg-solid);
  border-right:2px solid var(--dl-amber);box-shadow:8px 0 24px rgba(var(--dl-amber-rgb),.35)}
.dl-transition .wipe::after{content:'';position:absolute;inset:0;background:var(--dl-scanline)}
```

`#overlay::after` 既有掃描線規則追加飄移＋偶爾閃爍（spec §5.5）：

```css
  #overlay::after{content:'';position:absolute;inset:0;pointer-events:none;
    background:var(--dl-scanline);background-size:100% 8px;
    animation:dl-scan-drift 9s linear infinite, dl-scan-flicker 7s steps(1) infinite}
  @keyframes dl-scan-drift{to{background-position:0 8px}}
  @keyframes dl-scan-flicker{0%,96%{opacity:1}97%{opacity:.55}98%,100%{opacity:1}}
```

- [ ] **Step 5: darkline.js 接縫接線（cover → seq.next → setup → reveal）**

import 區加：`import { mountTransition } from './ui/transition.js'`

`const decode = mountDecodePanel(…)` 附近加：

```javascript
const transition = mountTransition(document.getElementById('transition'))
// 段落推進統一走這裡：先 wipe 蓋住（scene pop 不見光）→ seq.next()（onExit 拆場景 → onEnter 建場景）。
// reveal 由 applySegment 結尾統一掃出。transitioning 防連按 N 重入。
let transitioning = false
async function advanceSegment() {
  if (transitioning) return
  transitioning = true
  await transition.cover()
  seq.next()
  transitioning = false
}
```

替換所有直接推段落的呼叫（**共 4 處**）：
1. `enterRail` 的 `onComplete`（rail1 分支）：`showStoryCard('card.dropoff.title', 'card.dropoff.body', undefined, () => advanceSegment())`
2. 同處 rail2boss 分支：`else advanceSegment()`
3. 自由段出口 trigger（GameLoop 內）：`showStoryCard('card.embark.title', 'card.embark.body', undefined, () => advanceSegment())`
4. keydown N handler：`if (!advancePage()) advanceSegment()`

`applySegment` 結尾（`hint.textContent = …` 之後）加：

```javascript
  if (transition.isCovered) transition.reveal()   // 有 wipe 蓋著才掃出（menu 直入/存檔跳段是 no-op）
```

- [ ] **Step 6: 全套綠 + Commit**

Run: `cd game && npm test`
Expected: 全綠

```bash
git add game/src/darkline/ui/transition.js game/tests/darkline/transition.test.js game/index.html game/src/darkline/darkline.js game/package.json game/package-lock.json
git commit -m "feat(m3-c): GSAP amber wipe segment transitions + scanline drift/flicker (deterministic updateRoot tests)"
```

---

## Task C6：打字機字卡（純 stepper，GameLoop 推進）

**Files:**
- Create: `game/src/darkline/ui/typewriter.js`
- Test(Create): `game/tests/darkline/typewriter.test.js`
- Modify: `game/src/darkline/darkline.js`、`game/index.html`（游標 CSS）

- [ ] **Step 1: 寫失敗測試**（新檔 `game/tests/darkline/typewriter.test.js`）

```javascript
import { describe, it, expect, vi } from 'vitest'
import { typedCount, createTypewriter } from '../../src/darkline/ui/typewriter.js'

describe('typedCount', () => {
  it('scales with elapsed × cps and clamps at len', () => {
    expect(typedCount(100, 0, 40)).toBe(0)
    expect(typedCount(100, 1, 40)).toBe(40)
    expect(typedCount(100, 10, 40)).toBe(100)
  })
})

describe('createTypewriter', () => {
  it('types progressively via step(dt) and fires onDone at the end', () => {
    const el = document.createElement('p')
    const onDone = vi.fn()
    const tw = createTypewriter({ cps: 10 })
    tw.start(el, 'HELLO', { onDone })
    expect(tw.active).toBe(true)
    tw.step(0.25)                                  // 2.5 字 → 2
    expect(el.textContent).toBe('HE')
    expect(el.classList.contains('typing')).toBe(true)
    tw.step(10)
    expect(el.textContent).toBe('HELLO')
    expect(tw.active).toBe(false)
    expect(el.classList.contains('typing')).toBe(false)
    expect(onDone).toHaveBeenCalledOnce()
  })
  it('finish() completes instantly (N 跳過打字)', () => {
    const el = document.createElement('p')
    const tw = createTypewriter({ cps: 10 })
    tw.start(el, '密電解碼')
    tw.finish()
    expect(el.textContent).toBe('密電解碼')
    expect(tw.active).toBe(false)
  })
  it('empty text is done immediately', () => {
    const el = document.createElement('p')
    const tw = createTypewriter()
    tw.start(el, '')
    expect(tw.active).toBe(false)
  })
})
```

Run: `cd game && npx vitest run tests/darkline/typewriter.test.js`
Expected: FAIL（模組不存在）

- [ ] **Step 2: 實作**（新檔 `game/src/darkline/ui/typewriter.js`）

```javascript
// 打字機字卡（spec §5.5）：純 stepper——GameLoop 每幀餵 step(dt 秒)，jsdom 決定性可測。
// prefers-reduced-motion → start 即完成（無動畫直出全文）。
export function typedCount(len, elapsed, cps) {
  return Math.min(len, Math.floor(elapsed * cps))
}

export function createTypewriter({ cps = 45 } = {}) {
  let el = null, text = '', t = 0, done = true, onDone = null
  const api = {
    get active() { return !done },
    start(targetEl, fullText, opts = {}) {
      el = targetEl; text = fullText; t = 0; onDone = opts.onDone; done = false
      el.textContent = ''
      el.classList.add('typing')
      if (text.length === 0 || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) api.finish()
    },
    step(dt) {
      if (done || !el) return
      t += dt
      const n = typedCount(text.length, t, cps)
      el.textContent = text.slice(0, n)
      if (n >= text.length) api.finish()
    },
    finish() {
      if (done) return
      done = true
      if (el) { el.textContent = text; el.classList.remove('typing') }
      onDone?.()
    },
  }
  return api
}
```

Run: `cd game && npx vitest run tests/darkline/typewriter.test.js` → PASS

- [ ] **Step 3: 游標 CSS**（`game/index.html` `<style>` 末尾）

```css
/* 打字機游標：typing 期間在文字尾閃爍 ▌。 */
.typing::after{content:'▌';color:var(--dl-amber);animation:dl-blink 1s steps(2) infinite}
```

（`dl-blink` keyframes 已在 C4 加過；`▌` 已在 glyph LITERALS。）

- [ ] **Step 4: darkline.js 接線**

import 區加：`import { createTypewriter } from './ui/typewriter.js'`

`showOverlay` 改為（打字機接管 body 文字）：

```javascript
const typewriter = createTypewriter({ cps: 45 })
function showOverlay(titleKey, bodyKey, continueKey = 'brief.continue', vars) {
  overlay.classList.remove('hidden')
  renderCard(overlay, i18n, titleKey, bodyKey, vars)
  const p = overlay.querySelector('p')
  if (continueKey) p.textContent += '\n\n' + i18n.t(continueKey)
  typewriter.start(p, p.textContent)   // 逐字打出（含收尾提示行）
  // 重觸發淡入動畫（每頁/每次顯示都淡入，電報字卡逐張浮現）。
  overlay.classList.remove('fade'); void overlay.offsetWidth; overlay.classList.add('fade')
}
```

keydown N handler 開頭（`pendingCard` 判斷之前）加：

```javascript
    if (typewriter.active) { typewriter.finish(); return }   // 第一下 N＝跳完打字，第二下才翻頁/續行
```

GameLoop callback 裡 `weapon.update(dt)` 之後加：

```javascript
  typewriter.step(dt)   // 打字機在任何段落/暫停態都推進（字卡演出本來就在暫停態）
```

- [ ] **Step 5: 全套綠 + Commit**

Run: `cd game && npm test`
Expected: 全綠（cards.test.js 只測 renderCard 純函式，不受影響）

```bash
git add game/src/darkline/ui/typewriter.js game/tests/darkline/typewriter.test.js game/src/darkline/darkline.js game/index.html
git commit -m "feat(m3-c): typewriter card reveal — pure stepper driven by GameLoop, N skips to full text"
```

---

## Task C7：解碼招牌時刻——scramble 收斂成明文（spec §0 hero moment）

**Files:**
- Create: `game/src/darkline/intel/scramble.js`
- Test(Create): `game/tests/darkline/scramble.test.js`
- Modify: `game/src/darkline/intel/DecodePanel.js`、`game/tests/darkline/decodepanel.test.js`、`game/src/darkline/darkline.js`（loop 餵 step）、`game/index.html`（converging CSS）

- [ ] **Step 1: 寫失敗測試**（新檔 `game/tests/darkline/scramble.test.js`）

```javascript
import { describe, it, expect } from 'vitest'
import { SCRAMBLE_CHARSET, scrambleFrame, createScramble } from '../../src/darkline/intel/scramble.js'

const rng0 = () => 0   // 決定性 rng：永遠取 charset[0]

describe('scrambleFrame', () => {
  it('t=0 全亂碼（空白除外）、t=1 全明文', () => {
    const plain = 'PIER THREE'
    const s0 = scrambleFrame(plain, 0, rng0)
    expect(s0).not.toBe(plain)
    expect(s0[4]).toBe(' ')                          // 空白不亂
    expect(s0[0]).toBe(SCRAMBLE_CHARSET[0])          // rng 可注入 → 決定性
    expect(scrambleFrame(plain, 1, rng0)).toBe(plain)
  })
  it('鎖定由左至右單調前進', () => {
    const plain = 'ABCDEFGHIJ'
    expect(scrambleFrame(plain, 0.5, rng0).slice(0, 5)).toBe('ABCDE')
    expect(scrambleFrame(plain, 0.8, rng0).slice(0, 8)).toBe('ABCDEFGH')
  })
})

describe('createScramble', () => {
  it('step(dt) 收斂到明文、加 ok、fire onDone', () => {
    const el = document.createElement('div')
    let doneCount = 0
    const sc = createScramble({ duration: 1, rng: rng0 })
    sc.start(el, 'DARKLINE', { onDone: () => doneCount++ })
    expect(sc.active).toBe(true)
    expect(el.classList.contains('converging')).toBe(true)
    sc.step(0.5)
    expect(el.textContent.slice(0, 4)).toBe('DARK')   // 前半已鎖
    expect(el.textContent).not.toBe('DARKLINE')
    sc.step(1)
    expect(el.textContent).toBe('DARKLINE')
    expect(el.classList.contains('converging')).toBe(false)
    expect(el.classList.contains('ok')).toBe(true)
    expect(sc.active).toBe(false)
    expect(doneCount).toBe(1)
  })
})
```

Run: `cd game && npx vitest run tests/darkline/scramble.test.js`
Expected: FAIL（模組不存在）

- [ ] **Step 2: 實作**（新檔 `game/src/darkline/intel/scramble.js`）

```javascript
// 招牌時刻（spec §0）：解碼成功 → 亂碼由左至右「收斂」成明文。
// scrambleFrame 純函式（rng 注入 → 決定性測試）；createScramble 是 GameLoop 餵 dt 的 stepper。
export const SCRAMBLE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/#-'

export function scrambleFrame(plain, t, rng = Math.random) {
  const locked = Math.floor(Math.max(0, Math.min(1, t)) * plain.length)
  let out = ''
  for (let i = 0; i < plain.length; i++) {
    const ch = plain[i]
    out += (i < locked || ch === ' ')
      ? ch
      : SCRAMBLE_CHARSET[Math.floor(rng() * SCRAMBLE_CHARSET.length)]
  }
  return out
}

export function createScramble({ duration = 1.4, rng = Math.random } = {}) {
  let el = null, plain = '', t = 0, active = false, onDone = null
  const api = {
    get active() { return active },
    start(targetEl, text, opts = {}) {
      el = targetEl; plain = text; t = 0; onDone = opts.onDone; active = true
      el.classList.add('converging')
      el.classList.remove('ok')
      el.textContent = scrambleFrame(plain, 0, rng)
      if (plain.length === 0 || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) api.finish()
    },
    step(dt) {
      if (!active) return
      t += dt / duration
      if (t >= 1) { api.finish(); return }
      el.textContent = scrambleFrame(plain, t, rng)
    },
    finish() {
      if (!active) return
      active = false
      el.textContent = plain
      el.classList.remove('converging')
      el.classList.add('ok')      // 琥珀 ignition（既有 .ok 樣式）在收斂完成那一刻點亮
      onDone?.()
    },
  }
  return api
}
```

Run: `cd game && npx vitest run tests/darkline/scramble.test.js` → PASS

- [ ] **Step 3: 先改既有 decodepanel 測試（紅）**

`game/tests/darkline/decodepanel.test.js`——先 Read 找到「確認正解 → reveal 顯示全文 + `.ok` + solved/clue 狀態」的既有斷言，改成分兩拍：

```javascript
    // 確認正解 → 招牌時刻：先 converging 亂碼（≠明文），step 收斂後才是明文 + ok + clue
    // （panel.step 由 GameLoop 在 decode.isOpen 時餵 dt）
    confirmBtn.click()
    const reveal = container.querySelector('.decode-reveal')
    expect(reveal.classList.contains('converging')).toBe(true)
    expect(reveal.textContent).not.toBe(plainText)          // 尚未收斂
    panel.step(3)                                            // duration 1.4s → 3s 必然完成
    expect(reveal.textContent).toBe(plainText)
    expect(reveal.classList.contains('ok')).toBe(true)
    expect(status.textContent).toContain(i18n.t('decode.solved'))
```

（`onSolve` 立即觸發的斷言**維持不變**——計分/旗標不等動畫。）

Run: `cd game && npx vitest run tests/darkline/decodepanel.test.js`
Expected: FAIL（還是即時顯示全文）

- [ ] **Step 4: DecodePanel 接 scramble**

`game/src/darkline/intel/DecodePanel.js`：

import 改：`import { applyGuess, cribMappingAt, previewText, isSolved } from './decode.js'` 之後加
`import { createScramble } from './scramble.js'`

`mountDecodePanel` 內（state 宣告區）加：`const scramble = createScramble()`

`markSolved` 改為：

```javascript
  function markSolved() {
    solved = true
    needkeyEl.textContent = ''
    // 招牌時刻：亂碼收斂成明文，收斂完成那一刻才點亮 ok + 揭露 clue（演出）；
    // onSolve（計分/旗標）立即觸發，遊戲狀態不等動畫。
    scramble.start(revealEl, previewText(state), {
      onDone: () => { statusEl.textContent = i18n.t('decode.solved') + ' ' + i18n.t('decode.clue') },
    })
    onSolve?.(previewText(state))
  }
```

`render()` 的 reveal 行改成不覆蓋動畫中內容：

```javascript
    if (!solved) revealEl.textContent = ''
```

api 物件加一個 step 轉發：

```javascript
    step(dt) { scramble.step(dt) },
```

`open()` 內 `revealEl.classList.remove('ok')` 之後加一行 `revealEl.classList.remove('converging')`。

- [ ] **Step 5: GameLoop 餵 dt + converging CSS**

`game/src/darkline/darkline.js` loop 內解碼那行改：

```javascript
  if (decode.isOpen) { decode.step(dt); renderer.render(); return }   // 解碼中：只推演出，暫停戰鬥
```

`game/index.html` decode 區 CSS 加：

```css
  #decode .decode-reveal.converging{color:var(--dl-amber-dim);border-color:rgba(var(--dl-amber-rgb),.5);
    animation:dl-blink .5s steps(2) infinite}
```

- [ ] **Step 6: 全套綠 + Commit**

Run: `cd game && npm test`
Expected: 全綠

```bash
git add game/src/darkline/intel/scramble.js game/tests/darkline/scramble.test.js game/src/darkline/intel/DecodePanel.js game/tests/darkline/decodepanel.test.js game/src/darkline/darkline.js game/index.html
git commit -m "feat(m3-c): decode hero moment — scramble-converge reveal with deferred amber ignition (injectable rng, loop-stepped)"
```

---

## Task C8：最小 mobile holding-state

**Files:**
- Create: `game/src/darkline/ui/holding.js`
- Test(Create): `game/tests/darkline/holding.test.js`
- Modify: `game/index.html`、`game/src/darkline/darkline.js`、`game/src/locales/zh.json`、`game/src/locales/en.json`、`game/tests/darkline/tokens.test.js`

- [ ] **Step 1: 寫失敗測試**

新檔 `game/tests/darkline/holding.test.js`：

```javascript
import { describe, it, expect } from 'vitest'
import { renderHolding } from '../../src/darkline/ui/holding.js'
import { I18n } from '../../src/darkline/core/i18n.js'
import zh from '../../src/locales/zh.json'

describe('renderHolding', () => {
  it('fills the holding screen from i18n (designed 直向持機畫面，非破版)', () => {
    const el = document.createElement('div')
    renderHolding(el, new I18n(zh))
    expect(el.querySelector('.holding-title').textContent).toBe(zh['holding.title'])
    expect(el.querySelector('.holding-body').textContent).toBe(zh['holding.body'])
    expect(el.querySelector('.holding-rotate').textContent).toBe(zh['holding.rotate'])
  })
})
```

`game/tests/darkline/tokens.test.js` 追加一案：

```javascript
  it('mobile holding-state: breakpoint 以下顯示 #holding（guard, spec §5.6）', () => {
    expect(html).toContain('id="holding"')
    expect(html).toContain('@media (orientation:portrait) and (max-width:719px)')
  })
```

Run: `cd game && npx vitest run tests/darkline/holding.test.js tests/darkline/tokens.test.js`
Expected: FAIL

- [ ] **Step 2: i18n 新鍵**

`zh.json`：

```json
  "holding.title": "暗線 DARKLINE",
  "holding.body": "一九五三．台北──本作最佳體驗在桌面瀏覽器。",
  "holding.rotate": "（手機請轉為橫向，或改用桌面開啟）"
```

`en.json`：

```json
  "holding.title": "DARKLINE",
  "holding.body": "Taipei, 1953 — best experienced in a desktop browser.",
  "holding.rotate": "(Rotate to landscape, or open on desktop)"
```

- [ ] **Step 3: 實作 holding.js**

```javascript
// 最小 mobile holding-state（spec §5.6）：直向窄屏第一畫面 intentional 非破版。
// 顯示/隱藏交給 CSS media query；這裡只填 i18n 內容（HTML 內建英文 fallback 會被覆蓋）。
export function renderHolding(el, i18n) {
  el.innerHTML = ''
  const mk = (tag, cls, key) => {
    const n = document.createElement(tag)
    n.className = cls
    n.textContent = i18n.t(key)
    return n
  }
  el.append(
    mk('div', 'holding-title', 'holding.title'),
    mk('p', 'holding-body', 'holding.body'),
    mk('div', 'holding-rotate', 'holding.rotate'),
  )
}
```

- [ ] **Step 4: index.html 節點 + CSS**

`<body>` 的 `#boot` 之後加（靜態英文 fallback，JS 啟動後被 i18n 覆蓋）：

```html
<div id="holding">
  <div class="holding-title">DARKLINE</div>
  <p class="holding-body">Taipei, 1953 — best experienced in a desktop browser.</p>
  <div class="holding-rotate">(Rotate to landscape, or open on desktop)</div>
</div>
```

`<style>` 末尾加：

```css
/* 手機 holding-state（z=13，最上層）：直向窄屏＝designed 電報畫面，不露破版遊戲。 */
#holding{display:none;position:fixed;inset:0;z-index:13;flex-direction:column;justify-content:center;
  align-items:center;gap:16px;padding:0 9vw;text-align:center;
  background:var(--dl-intel-bg-solid);color:var(--dl-amber);font:15px/1.9 var(--dl-font);letter-spacing:.08em}
#holding::after{content:'';position:absolute;inset:0;pointer-events:none;background:var(--dl-scanline)}
#holding .holding-title{font-size:30px;letter-spacing:.34em;text-shadow:var(--dl-glow-strong);padding-left:.34em}
#holding .holding-body{margin:0;border-top:1px solid rgba(var(--dl-amber-rgb),.35);
  border-bottom:1px solid rgba(var(--dl-amber-rgb),.35);padding:14px 0}
#holding .holding-rotate{font-size:12px;color:var(--dl-amber-faint)}
@media (orientation:portrait) and (max-width:719px){
  #holding{display:flex}
}
```

- [ ] **Step 5: darkline.js 接線**（boot 接線區之後加）

```javascript
import { renderHolding } from './ui/holding.js'   // ← import 區
renderHolding(document.getElementById('holding'), i18n)   // ← bootGate 接線之後
```

- [ ] **Step 6: 全套綠 + Commit**

Run: `cd game && npm test`
Expected: 全綠（glyphs.test 會抓新文案的新字 → 若紅：`cd game && npm run fonts:build` 重生子集後再跑）

```bash
git add game/src/darkline/ui/holding.js game/tests/darkline/holding.test.js game/index.html game/src/darkline/darkline.js game/src/locales/zh.json game/src/locales/en.json game/tests/darkline/tokens.test.js game/public/darkline/fonts/
git commit -m "feat(m3-c): minimal mobile holding-state — designed portrait telegraph screen + breakpoint guard"
```

---

## Task C9：i18n 鍵對齊守衛 + 收尾驗證

**Files:**
- Create: `game/tests/darkline/i18n-keyalign.test.js`
- Modify:（如有）`game/src/locales/*.json` 對齊修正

- [ ] **Step 1: 寫守衛測試**

```javascript
// zh/en 字典鍵集合全等守衛（文案兩邊都要有，防單邊漏鍵 tofu/英文殘留）。
// 注意：feat/first-act-narrative 分支有同路徑同用途的守衛，合併時任取一版即可。
import { describe, it, expect } from 'vitest'
import zh from '../../src/locales/zh.json'
import en from '../../src/locales/en.json'

describe('i18n key alignment', () => {
  it('zh/en expose identical key sets', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
  })
})
```

Run: `cd game && npx vitest run tests/darkline/i18n-keyalign.test.js`
Expected: PASS（若 FAIL＝前面 task 漏鍵，補齊該鍵）

- [ ] **Step 2: 全套 + build + 體積守衛**

Run: `cd game && npm test && npm run build && npm run check:size`
Expected: 全綠；TOTAL gzip ≈ 540KB 級距、遠低於 1465KB ceiling；記下實際數字回報

- [ ] **Step 3: Commit**

```bash
git add game/tests/darkline/i18n-keyalign.test.js
git commit -m "test(m3-c): zh/en i18n key-alignment guard"
```

---

## Phase C 收尾（主控端，非 subagent task）

1. `git push`（整段 task commits 上 origin/feat/m3-visual-layer）。
2. **Electron CDP 自查**（`cd game && PORT=5180 npm run dev` → `cd electron && DARKLINE_PORT=5180 DARKLINE_DEBUG_PORT=9222 npm start`，用 `electron/shot.cjs` 截圖）：
   - boot 開場（電報字型、bar、淡出）；
   - 選單/簡報卡（新字型中英、打字機 + 游標）；
   - rail1 HUD（琥珀電報 SCORE/命條/lock 圈）；
   - 段落 wipe（briefing→rail1）；
   - free 段解碼：轉盤 → 確認 → **scramble 收斂招牌時刻**；
   - 窄視窗直向（縮 Electron 視窗或 CDP `Emulation.setDeviceMetricsOverride`）→ holding-state。
3. **檢查點五問交用戶 Electron 親驗**（spec §5 檢查點）：①全 UI 一套諜報語言？②字型對味（電報感、中英協調、無 tofu）？③boot 開場 + LCP 體感？④解碼招牌時刻夠不夠「被記住」？⑤手機第一畫面 intentional？
4. 過檢查點後更新 ROADMAP（Phase C 收）。

## Self-Review

- **Spec §5 覆蓋**：5.1 字型=C3、5.2 token=C1、5.3 HUD=C2、5.4 boot/LCP=C4、5.5 GSAP 轉場+打字機+掃描線+招牌時刻=C5/C6/C7、5.6 mobile holding=C8、5.7 i18n 鍵=C4/C8/C9。§0 招牌時刻=C7 專任務。§6 預算=C3 體積斷言+C9 check:size。
- **佔位掃描**：無 TBD；所有測試/實作皆給完整程式碼；字型下載 URL 已於 2026-07-02 驗證 200。
- **型別/命名一致**：`createBootGate.{begin,signal,ready}`、`mountTransition.{cover,reveal,isCovered}`、`createTypewriter.{start,step,finish,active}`、`createScramble` 同形、`decode.step(dt)`、token 一律 `--dl-*` 前綴，各 task 用法一致。
- **已知取捨**：N 鍵 debug 跳段維持現狀（玩法軸，非本 Phase）；`#hint` 只 restyle 不重做；PS1 jitter/LUT 仍是 Phase A 可選項不在此。
