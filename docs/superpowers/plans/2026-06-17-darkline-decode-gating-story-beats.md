# DARKLINE 解碼加梗 + 故事節點 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把自由段的情報解碼從「一直往右按、看到英文就破」改成「先到別處拾鑰匙紙片、來這裡對位＋確認才解」的有梗小謎題，並補兩張接縫故事卡與加厚線索、統一電報字型。

**Architecture:**
- **解碼改版**＝撤掉全文即時 preview、改「對位窗（密文某字母→當前轉盤解出的字母）＋確認鈕」；鑰匙（密文該字母的明文對應）不在面板顯示，只在自由段拾取的「紙片」上 → 沒拾＝不知道要對到哪（軟閘，無懲罰可一直試）。
- **故事卡**＝沿用既有 overlay/pager，用「接縫攔截」機制（`pendingCard`）：在兩段之間或自由段內演一張單頁卡，按 N 收卡後才執行續行動作（下車/上車卡＝`seq.next()`；紙片卡＝復原 pointerlock）。**不動** `SEGMENTS`/`MissionSequencer`/存檔語意。
- 新碼一律落在 `game/src/darkline/`，引擎類別只重用不改。

**Tech Stack:** three.js + Vite，Vitest（jsdom 用於 DOM 元件），純函式 TDD；i18n 走 `locales/{zh,en}.json` + `core/i18n.js`，對齊守衛已存在於 `tests/darkline/lang.test.js`。

**權威上游：** spec `docs/superpowers/specs/2026-06-16-darkline-decode-gating-story-beats-design.md`（已拍板 2026-06-17：軟閘＋琥珀電報調）；首部曲 spec §13（全面虛構化）。

**測試指令：** 全跑 `cd game && npm test`；單檔 `cd game && npx vitest run tests/darkline/<file>`；單例 `cd game && npx vitest run tests/darkline/<file> -t "<name>"`。

**文案備註（spec ⑦）：** 本計畫各 i18n 字串為 Claude 草稿，**執行 Task 2 時請用戶判「對不對味」**；文案可替換，不影響鍵結構與測試（測試只驗鍵存在/內插，不驗確切句子）。全面虛構化：只用林沂／西緣貿易公司／北方／老周（市井代號），不具名實在組織地點。

---

## File Structure

| 檔案 | 責任 | 動作 |
|---|---|---|
| `game/src/darkline/intel/decode.js` | 凱撒核心純函式 | 加 `cribMappingAt` |
| `game/tests/darkline/decode.test.js` | decode 純函式測試 | 加 `cribMappingAt` 測試 |
| `game/src/locales/zh.json` / `en.json` | i18n 字典 | 加新鍵、改寫 clue、移除舊 decode.crib/hint |
| `game/src/darkline/intel/DecodePanel.js` | 解碼面板 UI | 撤 preview→對位窗＋確認制＋缺鑰提示 |
| `game/tests/darkline/decodepanel.test.js` | 面板 jsdom 測試 | 重寫對應新行為 |
| `game/darkline.html` | 頁面 + CSS | `#decode` 青→琥珀電報調 |
| `game/src/darkline/core/cards.js` | overlay 填字 | `renderCard` 支援 vars 內插 |
| `game/tests/darkline/cards.test.js` | 卡片測試 | 加 vars 內插測試 |
| `game/src/darkline/free/AlleyScene.js` | 自由段 layout/幾何 | layout 加 `scrap` 點 |
| `game/tests/darkline/alley.test.js` | layout 測試 | 加 `scrap` 點測試 |
| `game/src/darkline/darkline.js` | 整合層 | 故事卡機制、紙片拾取、E 分流、keyFound、接縫卡 |

---

## Task 1: decode.js — `cribMappingAt` 純函式

**Files:**
- Modify: `game/src/darkline/intel/decode.js`
- Test: `game/tests/darkline/decode.test.js`

- [ ] **Step 1: 寫失敗測試**

在 `game/tests/darkline/decode.test.js` 的 import 加入 `cribMappingAt`，並在檔案末尾（最後一個 `})` 之後）新增 describe 區塊：

```js
// 第 2-4 行的 import 改成（加 cribMappingAt）：
import {
  caesarShift, makePuzzle, applyGuess, isSolved, previewText, cribMappingAt,
} from '../../src/darkline/intel/decode.js'
```

```js
describe('cribMappingAt', () => {
  it('decodes the crib cipher letter under the current dial (identity at dial 0)', () => {
    const p = makePuzzle(0, { fragments: ['THE LIST SAILS NORTH'] })
    expect(cribMappingAt(p)).toBe(p.crib.cipher)   // dial 0 → no shift → maps to itself
  })
  it('equals the crib plain letter exactly when the dial reaches the answer', () => {
    const p = makePuzzle(1953)
    expect(cribMappingAt(applyGuess(p, p.answer))).toBe(p.crib.plain)
  })
  it('does not equal the crib plain letter for a wrong dial', () => {
    const p = makePuzzle(1953)
    expect(cribMappingAt(applyGuess(p, (p.answer + 1) % 26))).not.toBe(p.crib.plain)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/decode.test.js -t "cribMappingAt"`
Expected: FAIL — `cribMappingAt is not a function`（或 import 未定義）。

- [ ] **Step 3: 實作**

在 `game/src/darkline/intel/decode.js` 末尾（`isSolved` 之後）新增：

```js
// 當前轉盤下，crib 密文字母被解出的明文字母。對位窗用：玩家把它轉到等於紙片給的
// crib.plain（明文鑰匙）時即對齊。等同 isSolved，但只揭露單一字母、不洩漏全文。
export function cribMappingAt(state) {
  return caesarShift(state.crib.cipher, -state.dial)
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/decode.test.js`
Expected: PASS（含原有 + 3 條新測試）。

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/intel/decode.js game/tests/darkline/decode.test.js
git commit -m "feat(m2): decode.cribMappingAt — single-letter aim helper for the decode rework"
```

---

## Task 2: i18n 新鍵 + clue 加厚（文案草稿，用戶判對味）

**Files:**
- Modify: `game/src/locales/zh.json`
- Modify: `game/src/locales/en.json`

> 對齊守衛 `tests/darkline/lang.test.js` 會驗 `Object.keys(en) === Object.keys(zh)`，所以兩邊**必須同步**加同名鍵。本 task **只新增**鍵與改寫 `decode.clue`，**不移除** `decode.crib`/`decode.hint`（留到 Task 3 與面板改版同 commit，避免中間態）。

- [ ] **Step 1: zh.json 加新鍵 + 改寫 clue**

在 `game/src/locales/zh.json` 內，把 `"decode.clue"` 那一行替換為加厚版，並在 `"decode.close"` 行之後插入新鍵（紙片 + 故事卡）。改完後 decode/scrap/card 相關區塊應為：

```json
  "decode.title": "密電解碼",
  "decode.cipher": "攔截電文：",
  "decode.crib": "已知對應：密文 {c} ＝ 明文 {p}",
  "decode.hint": "◀ ▶ 轉動轉盤，把已知字母對齊即可解出",
  "decode.aim": "對位　密文 {c} ── 目前解出 {a}",
  "decode.confirm": "確認解碼",
  "decode.fail": "對位錯誤，重新對位。",
  "decode.needkey": "缺密碼鑰匙──先在巷子裡找找接頭人留的東西。",
  "decode.solved": "解碼成功。",
  "decode.clue": "電文解開了：交接在三號碼頭，子時換手；名單上的名字，北方都標好了價。最末一行不是這一夜的事──「線一旦斷，循舊網重連，毋須等令」。舊網……有些線埋下，本就是為了幾十年後再醒。",
  "decode.close": "收起",
  "scrap.title": "死信箱",
  "scrap.body": "牆角鬆的那塊磚後頭，老周留的紙片，邊角還沾著機油：\n「電文照舊鑰──密文 {c} 即明文 {p}。對上這一個，其餘自己會開。」",
  "card.dropoff.title": "下車",
  "card.dropoff.body": "車燈在巷口熄了。雨剛停，騎樓還在滴水，霓虹把積水切成一格一格的紅。名單的影子，就壓在這條巷子的某處。",
  "card.embark.title": "趕赴碼頭",
  "card.embark.body": "密件到手，封蠟還溫著。遠處汽笛拉得很長──船要開了。順著巷尾那道光帶上車，碼頭見真章。",
```

- [ ] **Step 2: en.json 加同名鍵 + 改寫 clue（順序一致）**

在 `game/src/locales/en.json` 對應位置改成：

```json
  "decode.title": "Decode Cable",
  "decode.cipher": "Intercepted cable:",
  "decode.crib": "Known: cipher {c} = plain {p}",
  "decode.hint": "Rotate the dial (◀ ▶) until the known letter lines up",
  "decode.aim": "Align  cipher {c} ── now reads {a}",
  "decode.confirm": "Decode",
  "decode.fail": "Misaligned — realign and try again.",
  "decode.needkey": "No cipher key — find what the contact left in the alley first.",
  "decode.solved": "Decoded.",
  "decode.clue": "The cable opens up: the handoff is at Pier 3, the midnight watch — and the North has put a price on every name. The last line isn't about tonight: \"If the line is cut, reconnect along the old net, await no order.\" The old net… some lines are buried precisely to wake decades later.",
  "decode.close": "Dismiss",
  "scrap.title": "Dead Drop",
  "scrap.body": "Behind the loose brick in the corner, a scrap in Old Zhou's hand, oil still on the edge:\n\"Same key as ever — cipher {c} is plain {p}. Set that one, the rest opens itself.\"",
  "card.dropoff.title": "The Drop-off",
  "card.dropoff.body": "The headlights die at the alley mouth. The rain has just stopped; the arcade still drips, and the neon cuts the puddles into squares of red. The roster's shadow is pressed somewhere down this lane.",
  "card.embark.title": "To the Docks",
  "card.embark.body": "The packet is in hand, the wax still warm. A ship's horn draws out, far off — she's about to sail. Follow that band of light at the alley's end and move; the docks will tell the truth.",
```

- [ ] **Step 3: 跑對齊守衛 + 全 i18n 測試**

Run: `cd game && npx vitest run tests/darkline/lang.test.js tests/darkline/i18n.test.js`
Expected: PASS（守衛 `en mirrors all keys of zh` 仍綠＝兩邊同步）。

- [ ] **Step 4: （內容分工）請用戶判文案對味**

把上面 zh 的 `scrap.body`／`card.dropoff.body`／`card.embark.body`／`decode.clue` 四段念給用戶確認語氣/史實虛構化是否到位；用戶要改就替換字串（不動鍵名），改完重跑 Step 3。

- [ ] **Step 5: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(m2): i18n keys for decode aim/confirm/needkey, scrap key, story cards + beefier clue"
```

---

## Task 3: DecodePanel 改版（撤 preview → 對位窗 + 確認制 + 缺鑰提示）

**Files:**
- Modify: `game/src/darkline/intel/DecodePanel.js`（整檔改寫）
- Modify: `game/tests/darkline/decodepanel.test.js`（整檔重寫）
- Modify: `game/src/locales/zh.json` / `en.json`（移除已不引用的 `decode.crib`、`decode.hint`）

- [ ] **Step 1: 重寫測試（先紅）**

把 `game/tests/darkline/decodepanel.test.js` 整檔替換為：

```js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mountDecodePanel } from '../../src/darkline/intel/DecodePanel.js'
import { makePuzzle } from '../../src/darkline/intel/decode.js'
import { I18n } from '../../src/darkline/core/i18n.js'

const i18n = new I18n({
  'decode.title': '密電解碼',
  'decode.cipher': '攔截電文：',
  'decode.aim': '對位 密文 {c} 解出 {a}',
  'decode.confirm': '確認解碼',
  'decode.fail': '對位錯誤，重新對位',
  'decode.needkey': '缺密碼鑰匙',
  'decode.solved': '解碼成功',
  'decode.clue': '名單往北方送',
  'decode.close': '收起',
})

const FRAG = { fragments: ['THE LIST SAILS NORTH'] }

function setup() {
  document.body.innerHTML = '<div id="decode"></div>'
  const el = document.getElementById('decode')
  return { el, panel: mountDecodePanel(el, { i18n }) }
}

describe('DecodePanel', () => {
  it('starts hidden and closed', () => {
    const { el, panel } = setup()
    expect(panel.isOpen).toBe(false)
    expect(el.classList.contains('hidden')).toBe(true)
  })

  it('open shows the cipher and the aim window, and hides the full plaintext', () => {
    const { el, panel } = setup()
    const puzzle = makePuzzle(5, FRAG)
    panel.open(puzzle, { keyFound: true })
    expect(panel.isOpen).toBe(true)
    expect(el.classList.contains('hidden')).toBe(false)
    expect(el.querySelector('.decode-cipher').textContent).toContain(puzzle.cipher)
    expect(el.querySelector('.decode-aim').textContent).toContain(puzzle.crib.cipher)
    expect(el.querySelector('.decode-reveal').textContent).toBe('')   // 解出前不顯示全文
  })

  it('rotating the dial updates the aim window but does not reveal or solve', () => {
    const { el, panel } = setup()
    panel.open(makePuzzle(5, FRAG), { keyFound: true })   // seed 5 → shift 6
    const before = el.querySelector('.decode-aim').textContent
    el.querySelector('.decode-right').click()
    expect(el.querySelector('.decode-aim').textContent).not.toBe(before)
    expect(el.querySelector('.decode-reveal').textContent).toBe('')
    expect(el.querySelector('.decode-status').textContent).toBe('')
  })

  it('confirming while misaligned shows the fail status and does not solve', () => {
    const { el, panel } = setup()
    let solves = 0
    panel.open(makePuzzle(5, FRAG), { keyFound: true, onSolve: () => solves++ })
    el.querySelector('.decode-confirm').click()   // dial 0, not aligned
    expect(solves).toBe(0)
    expect(el.querySelector('.decode-status').textContent).toContain('對位錯誤')
    expect(el.querySelector('.decode-reveal').textContent).toBe('')
  })

  it('confirming when aligned solves once, reveals the plaintext and the clue', () => {
    const { el, panel } = setup()
    const puzzle = makePuzzle(5, FRAG)   // shift 6
    let solves = 0; let revealed = null
    panel.open(puzzle, { keyFound: true, onSolve: txt => { solves++; revealed = txt } })
    for (let i = 0; i < puzzle.answer; i++) el.querySelector('.decode-right').click()
    expect(solves).toBe(0)   // 已對齊，但還沒按確認
    el.querySelector('.decode-confirm').click()
    expect(solves).toBe(1)
    expect(revealed).toBe('THE LIST SAILS NORTH')
    expect(el.querySelector('.decode-reveal').textContent).toBe('THE LIST SAILS NORTH')
    expect(el.querySelector('.decode-status').textContent).toContain('解碼成功')
    expect(el.querySelector('.decode-status').textContent).toContain('名單往北方送')
  })

  it('does not re-fire onSolve after solved', () => {
    const { el, panel } = setup()
    const puzzle = makePuzzle(5, FRAG)
    let solves = 0
    panel.open(puzzle, { keyFound: true, onSolve: () => solves++ })
    for (let i = 0; i < puzzle.answer; i++) el.querySelector('.decode-right').click()
    el.querySelector('.decode-confirm').click()
    el.querySelector('.decode-confirm').click()   // 再按確認
    el.querySelector('.decode-right').click()      // 再轉
    expect(solves).toBe(1)
  })

  it('shows the need-key hint without the key and hides it with the key', () => {
    const { el, panel } = setup()
    panel.open(makePuzzle(5, FRAG), { keyFound: false })
    expect(el.querySelector('.decode-needkey').textContent).toContain('缺密碼鑰匙')
    panel.close()
    panel.open(makePuzzle(5, FRAG), { keyFound: true })
    expect(el.querySelector('.decode-needkey').textContent).toBe('')
  })

  it('Enter confirms and Escape closes', () => {
    const { el, panel } = setup()
    const puzzle = makePuzzle(5, FRAG)
    let solves = 0; let closed = 0
    panel.open(puzzle, { keyFound: true, onSolve: () => solves++, onClose: () => closed++ })
    for (let i = 0; i < puzzle.answer; i++) el.querySelector('.decode-right').click()
    window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'Enter' }))
    expect(solves).toBe(1)
    window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'Escape' }))
    expect(panel.isOpen).toBe(false)
    expect(closed).toBe(1)
  })

  it('close hides the panel and fires onClose', () => {
    const { el, panel } = setup()
    let closed = 0
    panel.open(makePuzzle(5, FRAG), { keyFound: true, onClose: () => closed++ })
    panel.close()
    expect(panel.isOpen).toBe(false)
    expect(el.classList.contains('hidden')).toBe(true)
    expect(closed).toBe(1)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/decodepanel.test.js`
Expected: FAIL（`.decode-aim`/`.decode-reveal`/`.decode-confirm`/`.decode-needkey` 不存在；確認制未實作）。

- [ ] **Step 3: 整檔改寫 DecodePanel.js**

把 `game/src/darkline/intel/DecodePanel.js` 整檔替換為：

```js
// 情報解碼面板（DOM overlay）。凱撒轉盤密碼的「部分提示＋確認制」UI：
// 顯示攔截電文 + 對位窗（密文某字母 → 當前轉盤把它解出的字母），玩家轉動轉盤把對位窗
// 對到「紙片」給的明文鑰匙，按「確認」才判定。解出前不顯示全文（撤即時 preview，修
// 「看到英文就破」）。未拾鑰匙紙片時顯示軟提示（仍可嘗試，無硬閘）。pointerlock 的
// 暫解除/復原由整合層（darkline.js）在 open/onClose 時管。
import { applyGuess, cribMappingAt, previewText, isSolved } from './decode.js'

export function mountDecodePanel(container, { i18n }) {
  container.innerHTML = ''
  container.classList.add('hidden')

  const card = el('div', 'decode-card')
  const title = el('h2', 'decode-title')
  const cipherEl = el('div', 'decode-cipher')
  const aimEl = el('div', 'decode-aim')
  const dialRow = el('div', 'decode-dial')
  const left = btn('◀', 'decode-btn decode-left')
  const shiftEl = el('span', 'decode-shift')
  const right = btn('▶', 'decode-btn decode-right')
  dialRow.append(left, shiftEl, right)
  const revealEl = el('div', 'decode-reveal')
  const needkeyEl = el('div', 'decode-needkey')
  const statusEl = el('div', 'decode-status')
  const confirmBtn = btn('', 'decode-btn decode-confirm')
  const closeBtn = btn('', 'decode-btn decode-close')
  card.append(title, cipherEl, aimEl, dialRow, revealEl, needkeyEl, statusEl, confirmBtn, closeBtn)
  container.append(card)

  let state = null
  let onSolve = null
  let onClose = null
  let solved = false
  let open = false
  let keyFound = false

  function render() {
    title.textContent = i18n.t('decode.title')
    cipherEl.textContent = i18n.t('decode.cipher') + ' ' + state.cipher
    aimEl.textContent = i18n.t('decode.aim', { c: state.crib.cipher, a: cribMappingAt(state) })
    shiftEl.textContent = '+' + state.dial
    revealEl.textContent = solved ? previewText(state) : ''
    needkeyEl.textContent = (!keyFound && !solved) ? i18n.t('decode.needkey') : ''
  }

  function rotate(delta) {
    if (!open || solved) return
    state = applyGuess(state, state.dial + delta)
    statusEl.textContent = ''   // 轉動即清掉上次「對位錯誤」
    render()
  }

  // 確認制：對齊（dial===answer，等同把 crib 對到正解）才解；否則軟性失敗、可一直再試。
  function tryConfirm() {
    if (!open || solved) return
    if (isSolved(state)) markSolved()
    else statusEl.textContent = i18n.t('decode.fail')
  }

  function markSolved() {
    solved = true
    render()                       // reveal 填全文、needkey 清空
    revealEl.classList.add('ok')
    statusEl.textContent = i18n.t('decode.solved') + ' ' + i18n.t('decode.clue')
    onSolve?.(previewText(state))
  }

  left.addEventListener('click', () => rotate(-1))
  right.addEventListener('click', () => rotate(1))
  confirmBtn.addEventListener('click', () => tryConfirm())
  closeBtn.addEventListener('click', () => api.close())

  function onKey(e) {
    if (!open) return
    if (e.code === 'ArrowLeft') { e.preventDefault(); rotate(-1) }
    else if (e.code === 'ArrowRight') { e.preventDefault(); rotate(1) }
    else if (e.code === 'Enter') { e.preventDefault(); tryConfirm() }
    else if (e.code === 'Escape') { e.preventDefault(); api.close() }
  }
  window.addEventListener('keydown', onKey)

  const api = {
    get isOpen() { return open },
    open(puzzle, opts = {}) {
      state = puzzle
      onSolve = opts.onSolve
      onClose = opts.onClose
      keyFound = !!opts.keyFound
      solved = false
      revealEl.classList.remove('ok')
      statusEl.textContent = ''
      confirmBtn.textContent = i18n.t('decode.confirm')
      closeBtn.textContent = i18n.t('decode.close')
      render()
      open = true
      container.classList.remove('hidden')
    },
    close() {
      if (!open) return
      open = false
      container.classList.add('hidden')
      onClose?.()
    },
  }
  return api
}

function el(tag, cls) {
  const e = document.createElement(tag)
  e.className = cls
  return e
}
function btn(label, cls) {
  const b = document.createElement('button')
  b.className = cls
  b.textContent = label
  return b
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/decodepanel.test.js`
Expected: PASS（9 條）。

- [ ] **Step 5: 移除已不引用的舊鍵**

`decode.crib`、`decode.hint` 在新面板已不引用。從 `game/src/locales/zh.json` 與 `game/src/locales/en.json` **兩邊同步刪除**這兩行（共 4 行）。

- [ ] **Step 6: 跑對齊守衛 + 全測試**

Run: `cd game && npm test`
Expected: PASS 全綠（守衛仍對齊；decode/decodepanel 測試綠）。

- [ ] **Step 7: Commit**

```bash
git add game/src/darkline/intel/DecodePanel.js game/tests/darkline/decodepanel.test.js game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(m2): decode panel rework — aim window + confirm gate + need-key hint, drop live preview"
```

---

## Task 4: `#decode` CSS 改琥珀電報調（廢青色）

**Files:**
- Modify: `game/darkline.html`（`<style>` 內 `#decode` 區塊，行 40-60）

> 純視覺，無單元測試 → 走 preview 驗（Task 7 端到端一起看；本 task 先在 preview 截一張確認顏色）。改動＝把 `#decode` 的青色系（`#6ad0ff`/`#cfe7f2`）換成 overlay 同款琥珀（`#e8c87a`），加掃描線，並補 `.decode-aim`/`.decode-reveal`/`.decode-needkey`/`.decode-confirm` 樣式（取代舊 `.decode-crib`/`.decode-preview`）。

- [ ] **Step 1: 替換 `#decode` CSS 區塊**

在 `game/darkline.html` 找到註解 `/* 情報解碼面板：自由段按 E 開；蓋在 overlay(8) 之下、HUD(5) 之上 → z=9。 */` 起、到 `#decode .decode-close{margin-top:16px}` 止（行 40-60）的整段，替換為：

```css
  /* 情報解碼面板：自由段按 E 開；蓋在 overlay(8) 之下、HUD(5) 之上 → z=9。
     電報調（與簡報/結尾同母題）：電傳等寬 + 琥珀磷光 + 寬字距 + CRT 掃描線。 */
  #decode{position:fixed;inset:0;display:flex;justify-content:center;align-items:center;
    background:rgba(6,7,10,.92);z-index:9}
  #decode.hidden{display:none}
  #decode .decode-card{position:relative;min-width:360px;max-width:90vw;padding:24px 28px;
    background:rgba(8,9,12,.97);border:1px solid rgba(232,200,122,.55);border-radius:3px;
    color:#e8c87a;font:14px/1.8 ui-monospace,'Courier New',Courier,monospace;letter-spacing:.06em;
    text-shadow:0 0 6px rgba(232,200,122,.35);box-shadow:0 0 26px rgba(232,200,122,.18);overflow:hidden}
  /* CRT 掃描線（不擋互動；蓋在卡片上）。 */
  #decode .decode-card::after{content:'';position:absolute;inset:0;pointer-events:none;
    background:repeating-linear-gradient(0deg,rgba(0,0,0,0) 0 2px,rgba(0,0,0,.16) 2px 4px)}
  #decode .decode-title{margin:0 0 14px;color:#e8c87a;font-size:18px;letter-spacing:.2em;
    padding-bottom:10px;border-bottom:1px solid rgba(232,200,122,.3);
    text-shadow:0 0 10px rgba(232,200,122,.55)}
  #decode .decode-cipher{letter-spacing:.18em;color:#c8b074;word-break:break-all}
  #decode .decode-aim{margin:8px 0 14px;color:#f4e2b0;font-size:13px;letter-spacing:.12em}
  #decode .decode-dial{display:flex;align-items:center;gap:14px;margin:6px 0}
  #decode .decode-shift{min-width:48px;text-align:center;color:#f4e2b0;font-size:16px}
  #decode .decode-reveal{margin:14px 0 4px;min-height:1.2em;padding:10px 12px;
    background:rgba(5,6,9,.6);border:1px dashed rgba(232,200,122,.3);
    letter-spacing:.22em;font-size:16px;color:#e8c87a;word-break:break-all}
  #decode .decode-reveal.ok{color:#ffe6a8;border-style:solid;border-color:rgba(255,230,168,.7);
    text-shadow:0 0 10px rgba(255,230,168,.6)}
  #decode .decode-needkey{margin-top:8px;color:#b59a5e;font-size:12px}
  #decode .decode-status{margin-top:10px;color:#f4e2b0;min-height:1.2em}
  #decode .decode-btn{padding:6px 14px;background:transparent;color:#e8c87a;
    border:1px solid rgba(232,200,122,.55);border-radius:2px;
    font:14px ui-monospace,'Courier New',monospace;letter-spacing:.08em;cursor:pointer}
  #decode .decode-btn:hover{background:#e8c87a;color:#0a0a12}
  #decode .decode-confirm{margin-top:16px;margin-right:10px}
  #decode .decode-close{margin-top:16px}
```

- [ ] **Step 2: preview 看色（隱藏視窗坑：見 [[project-vc2-env-gotchas]]）**

啟 dev server（`preview_start`，URL 帶 `/darkline.html`），`preview_resize` 到桌面尺寸避免 rAF 凍結，用 `preview_eval` 手動把面板開起來截圖確認琥珀（不需真的走到自由段）：

```js
// preview_eval：直接開解碼面板看樣式
window.__dl.decode.open(
  { cipher: 'AOL SPZA', plain: 'THE LIST', answer: 7, dial: 0, crib: { cipher: 'A', plain: 'T' } },
  { keyFound: false }
)
```

`preview_screenshot` 確認：卡片琥珀邊框/字、掃描線、缺鑰提示可見、無青色殘留、console 無錯。看完 `preview_eval` 收起：`window.__dl.decode.close()`。

- [ ] **Step 3: Commit**

```bash
git add game/darkline.html
git commit -m "style(m2): decode panel goes amber-telegraph (drops cyan), unifies the cable motif"
```

---

## Task 5: 故事卡機制 + 下車/上車卡接縫

**Files:**
- Modify: `game/src/darkline/core/cards.js`（`renderCard` 支援 vars）
- Modify: `game/tests/darkline/cards.test.js`（加 vars 測試）
- Modify: `game/src/darkline/darkline.js`（`showOverlay` 透傳 vars、`pendingCard` 機制、`showStoryCard`、N 鍵/loop 閘、rail1 onComplete、free 出口）

> 機制：`pendingCard = { onContinue }`。非 null 時暫停戰鬥/AI 更新；按 N 收卡並執行 `onContinue`。三個呼叫者：下車卡（rail1 完成→`seq.next()`）、上車卡（自由段出口→`seq.next()`）、紙片卡（Task 6，復原 pointerlock）。

- [ ] **Step 1: cards.test 加 vars 測試（先紅）**

在 `game/tests/darkline/cards.test.js` 的 `describe('renderCard', ...)` 內，`it('fills a card element ...')` 之後新增：

```js
  it('interpolates {vars} into the body', () => {
    const i = new I18n({ 'scrap.title': '死信箱', 'scrap.body': '密文 {c} ＝ 明文 {p}' })
    const store = { h1: { textContent: '' }, p: { textContent: '' } }
    const el = { querySelector: sel => (sel === 'h1' ? store.h1 : store.p) }
    renderCard(el, i, 'scrap.title', 'scrap.body', { c: 'Q', p: 'T' })
    expect(store.h1.textContent).toBe('死信箱')
    expect(store.p.textContent).toBe('密文 Q ＝ 明文 T')
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/cards.test.js -t "interpolates"`
Expected: FAIL（`renderCard` 未傳 vars → body 仍含 `{c}`/`{p}`）。

- [ ] **Step 3: `renderCard` 支援 vars**

把 `game/src/darkline/core/cards.js` 的 `renderCard` 改為：

```js
// game/src/darkline/core/cards.js
// 簡報/結尾/故事卡 純文字 overlay 填字（走 i18n）。vars 供故事卡內插（如紙片的鑰匙 {c}/{p}）。
// 注入 element（含 h1/p 子節點）讓它可測。
export function renderCard(el, i18n, titleKey, bodyKey, vars) {
  el.querySelector('h1').textContent = i18n.t(titleKey)
  el.querySelector('p').textContent = i18n.t(bodyKey, vars)
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/cards.test.js`
Expected: PASS（含原有 + vars 測試）。

- [ ] **Step 5: darkline.js — `showOverlay` 透傳 vars**

把 `game/src/darkline/darkline.js` 的 `showOverlay`（約行 82-88）改為多收一個 `vars`：

```js
function showOverlay(titleKey, bodyKey, continueKey = 'brief.continue', vars) {
  overlay.classList.remove('hidden')
  renderCard(overlay, i18n, titleKey, bodyKey, vars)
  if (continueKey) overlay.querySelector('p').textContent += '\n\n' + i18n.t(continueKey)
  // 重觸發淡入動畫（每頁/每次顯示都淡入，電報字卡逐張浮現）。
  overlay.classList.remove('fade'); void overlay.offsetWidth; overlay.classList.add('fade')
}
```

- [ ] **Step 6: darkline.js — 加 `pendingCard` 機制與 `showStoryCard`**

在 `showOverlay`/`hideOverlay` 與 `CARD_PAGES` 之間（約行 90，`hideOverlay` 之後）插入：

```js
// 接縫/拾取故事卡：在兩段之間或自由段內演一張單頁卡，按 N 收卡才執行續行動作。
// 非 null 期間暫停戰鬥/AI/彈丸更新（見 GameLoop 閘）。
let pendingCard = null   // { onContinue }
function showStoryCard(titleKey, bodyKey, vars, onContinue) {
  pendingCard = { onContinue }
  setInputMode('none')
  showOverlay(titleKey, bodyKey, 'brief.more', vars)
}
```

- [ ] **Step 7: darkline.js — N 鍵先收故事卡**

把現有 N/R 的 keydown handler（約行 294-299）改為：

```js
window.addEventListener('keydown', e => {
  if (decode.isOpen) return   // 解碼中：N/R 不作用（面板自管 ← → / Enter / Esc）
  if (e.code === 'KeyN' && !gameOver) {
    if (pendingCard) { const cont = pendingCard.onContinue; pendingCard = null; hideOverlay(); cont?.(); return }
    if (!advancePage()) seq.next()   // 多頁字卡：先翻頁，末頁才進下一段
  }
  // game-over：R 從最近存檔點重來（無存檔則整輪重啟）
  else if (e.code === 'KeyR' && gameOver) location.href = save.load() ? '?resume' : location.pathname
})
```

- [ ] **Step 8: darkline.js — GameLoop 加 `pendingCard` 暫停閘**

在 GameLoop 回呼內、`if (decode.isOpen) { renderer.render(); return }`（約行 433）之後插入一行：

```js
  if (pendingCard) { renderer.render(); return }   // 故事卡演出中：暫停戰鬥/AI/彈丸，只渲染
```

- [ ] **Step 9: darkline.js — 下車卡（rail1 完成接縫）**

把 `enterRail` 內的 `onComplete`（約行 233）改為依 `key` 決定走下車卡或直接進下一段：

```js
    onComplete: () => {                          // 相機到底 + 全清
      if (key === 'rail1') showStoryCard('card.dropoff.title', 'card.dropoff.body', undefined, () => seq.next())
      else seq.next()                            // rail2boss → 直接進 ending
    },
```

- [ ] **Step 10: darkline.js — 上車卡（自由段出口接縫）**

把 GameLoop 內自由段出口（約行 466）`if (inside(free.exitTrigger, cam)) seq.next()` 改為：

```js
    // 走到巷尾出口 → 演上車卡，按 N 才趕赴碼頭（進 rail2boss）。pendingCard 一設、
    // 下一幀 loop 開頭的閘就擋住，不會重觸發。
    if (inside(free.exitTrigger, cam)) showStoryCard('card.embark.title', 'card.embark.body', undefined, () => seq.next())
```

- [ ] **Step 11: 全測試 + commit**

Run: `cd game && npm test`
Expected: PASS 全綠（cards.test 新增綠；其餘不受影響）。

```bash
git add game/src/darkline/core/cards.js game/tests/darkline/cards.test.js game/src/darkline/darkline.js
git commit -m "feat(m2): story-card seam mechanism (pendingCard) + drop-off/embark cards between segments"
```

---

## Task 6: 紙片拾取（鑰匙來源）+ keyFound 軟閘

**Files:**
- Modify: `game/src/darkline/free/AlleyScene.js`（layout 加 `scrap` 點）
- Modify: `game/tests/darkline/alley.test.js`（加 `scrap` 測試）
- Modify: `game/src/darkline/darkline.js`（`scrapMesh`、`keyFound`、E 鍵分流、`takeScrap`、`openDecode` 傳 keyFound）

- [ ] **Step 1: alley.test 加 scrap 點測試（先紅）**

在 `game/tests/darkline/alley.test.js` 第一個 `it(...)` 內、`expect(lay.intel).toHaveProperty('x')` 之後新增兩行斷言，並加一條獨立測試確認紙片比情報點靠入口：

```js
    expect(lay.scrap).toHaveProperty('x'); expect(lay.scrap).toHaveProperty('z')
```

在 `describe('buildAlleyLayout', ...)` 內 `it('is deterministic ...')` 之後新增：

```js
  it('places the scrap (key) nearer the entry than the intel point', () => {
    const lay = buildAlleyLayout(1953)
    // 玩家從 entry(z≈-1) 往 -z 走 → z 較大（較不負）者較早遇到；紙片應比密件早。
    expect(lay.scrap.z).toBeGreaterThan(lay.intel.z)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/alley.test.js`
Expected: FAIL（`lay.scrap` 為 undefined）。

- [ ] **Step 3: AlleyScene layout 加 `scrap`**

在 `game/src/darkline/free/AlleyScene.js` 的 `buildAlleyLayout` 回傳物件內，`intel` 行之後加：

```js
    scrap: { x: 1.6, z: -3 },                         // 接頭人死信箱紙片（鑰匙；入口側，比情報點早遇到）
```

（`intel` 現為 `{ x: -1.8, z: -5 + ... }`，`scrap.z = -3 > intel.z ≈ -5` ✓，且在巷子對側 x=1.6。）

- [ ] **Step 4: 跑 layout 測試確認通過**

Run: `cd game && npx vitest run tests/darkline/alley.test.js`
Expected: PASS。

- [ ] **Step 5: darkline.js — enterFree 生成紙片 mesh + keyFound 旗標**

在 `enterFree`（約行 179-183）的情報點 `intelMesh` 區塊之後、`bullets` 之前插入：

```js
  // 死信箱紙片（鑰匙來源；按 E 拾取，比情報點早遇到）。淡紙白小方塊。
  const scrapMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.22),
    new THREE.MeshBasicMaterial({ color: 0xf0e6c0 }))
  scrapMesh.position.set(layout.scrap.x, 0.5, layout.scrap.z)
  renderer.scene.add(scrapMesh)
```

把 `free = { ... }`（約行 191）加上 `scrapMesh` 與 `keyFound: false`：

```js
  free = { controller, group, layout, enemies, intelMesh, scrapMesh, bullets, exitTrigger: layout.exitTrigger,
           intelTaken: false, keyFound: false, mags: [], killsSinceDrop: 0 }
```

- [ ] **Step 6: darkline.js — exitFree 移除紙片 mesh**

在 `exitFree`（約行 197-206）的 `renderer.scene.remove(free.intelMesh)` 之後加：

```js
  if (free.scrapMesh) renderer.scene.remove(free.scrapMesh)
```

- [ ] **Step 7: darkline.js — `takeScrap` + `openDecode` 傳 keyFound**

把 `openDecode`（約行 302-317）改為傳 `keyFound`，並在其後新增 `takeScrap`：

```js
// 情報解碼（E，需走近密件）：開解碼面板，解出才得分 + 揭露線索（餵結尾鉤子）。
function openDecode() {
  // 同任務固定謎題（決定性，承 alleySeed）；與紙片共用同一道 → 紙片教的對應正好是面板要對齊的。
  const puzzle = makePuzzle(MISSION.free.alleySeed)
  setInputMode('none')   // 暫解除 pointerlock，游標可點轉盤/確認/收起
  decode.open(puzzle, {
    keyFound: !!free?.keyFound,
    onSolve: () => {
      if (free?.intelTaken) return
      free.intelTaken = true
      hud.addScore(MISSION.free.intelScore)
      if (free.intelMesh) free.intelMesh.visible = false
      hint.textContent = i18n.t('hud.intel')
    },
    // 收起 → 復原自由段 pointerlock（仍在 free 且未死亡時）。
    onClose: () => { if (!gameOver && seq.current === 'free') setInputMode('pointerlock') },
  })
}

// 拾死信箱紙片 → 設 keyFound、移除 mesh、演鑰匙故事卡（含 crib 對應，與解碼面板共用同謎題）。
function takeScrap() {
  free.keyFound = true
  if (free.scrapMesh) { renderer.scene.remove(free.scrapMesh); free.scrapMesh = null }
  const puzzle = makePuzzle(MISSION.free.alleySeed)
  showStoryCard('scrap.title', 'scrap.body', { c: puzzle.crib.cipher, p: puzzle.crib.plain },
    () => { if (!gameOver && seq.current === 'free') setInputMode('pointerlock') })
}
```

- [ ] **Step 8: darkline.js — E 鍵分流（紙片 vs 密件）**

把現有 E 鍵 handler（約行 318-324）整段替換為：

```js
window.addEventListener('keydown', e => {
  if (e.code !== 'KeyE' || gameOver || decode.isOpen || pendingCard) return
  if (seq.current !== 'free' || !free) return
  const cam = renderer.camera.position
  // 先判紙片（鑰匙，較靠入口）：未拾且走近 → 拾取。
  if (!free.keyFound) {
    const ds = Math.hypot(cam.x - free.layout.scrap.x, cam.z - free.layout.scrap.z)
    if (ds < 1.6) { takeScrap(); return }
  }
  // 再判情報密件：未取且走近 → 開解碼面板。
  if (!free.intelTaken) {
    const di = Math.hypot(cam.x - free.layout.intel.x, cam.z - free.layout.intel.z)
    if (di < 1.6) openDecode()
  }
})
```

- [ ] **Step 9: 全測試 + commit**

Run: `cd game && npm test`
Expected: PASS 全綠。

```bash
git add game/src/darkline/free/AlleyScene.js game/tests/darkline/alley.test.js game/src/darkline/darkline.js
git commit -m "feat(m2): dead-drop scrap pickup = cipher key; E-key splits scrap vs intel; decode gets keyFound soft-gate"
```

---

## Task 7: preview 端到端驗證（隱藏視窗坑）

**Files:** 無（驗證 only）

> 隱藏 preview 視窗 rAF 凍結 → 先 `preview_resize` 到桌面尺寸，必要時用 `preview_eval` 手動推進/呼叫 `window.__dl`。見記憶 [[project-vc2-env-gotchas]]。Electron 真實視窗驗證見 `electron/README.md`（`electron/shot.cjs` CDP 截圖）。

- [ ] **Step 1: 全測試綠**

Run: `cd game && npm test`
Expected: PASS 全綠（無紅、無未捕捉錯誤）。

- [ ] **Step 2: 啟 preview，走自由段流程**

`preview_start`（載 `/darkline.html`）→ `preview_resize` 桌面尺寸 → 進自由段（可 `preview_eval: window.__dl.seq.jumpTo('free')` 或正常開始）。逐項確認：

- **紙片**：走近 `scrap`（x≈1.6,z≈-3）按 E → 出「死信箱」卡、含鑰匙 `密文 X ＝ 明文 Y`，按 N 收卡、pointerlock 復原、紙片消失。
- **缺鑰 vs 有鑰**：未拾紙片先到密件按 E → 面板顯示缺鑰提示；拾紙片後再開 → 缺鑰提示消失。
- **解碼**：對位窗隨 ◀▶ 更新；未對齊按「確認解碼」→ 顯示「對位錯誤」、不解；把對位窗轉到 `= 明文 Y`（紙片給的）按確認 → 電報式揭曉全文 + 加厚線索 + 得分。
- **接縫卡**：rail1 清完 → 下車卡（按 N 進自由段）；自由段走到巷尾 → 上車卡（按 N 進 rail2boss）。
- **字型**：解碼面板為琥珀電報調、有掃描線、無青色殘留。

用 `preview_snapshot`/`preview_screenshot` 取證，`preview_console_logs` 確認**無 console 錯**。

- [ ] **Step 3: 用戶檢查點（spec 待辦 3）**

把截圖/觀察回報用戶，逐項問：解碼手感（動腦但不卡）、梗順不順（紙片→密件）、故事卡對味、字型統一。用戶有要調的就回對應 task 修；都 OK → 收尾。

- [ ] **Step 4: （收尾）更新 ROADMAP / 記憶**

依用戶拍板結果，於 `ROADMAP.md` M2 段標記「解碼加梗 + 故事節點」完成，並更新自動記憶 `project_virtua_cop_2.md`／`MEMORY.md` 一行進度。

---

## Self-Review（plan 自檢，對照 spec）

**1. Spec 覆蓋：**
- spec ①（解碼改版：cribMappingAt／撤 preview／對位窗／確認鈕／缺鑰提示）→ Task 1（helper）+ Task 3（面板）✓
- spec ②（紙片＝鑰匙來源，同 puzzle 共用）→ Task 6（layout scrap + takeScrap 用同 `makePuzzle(alleySeed)`）✓
- spec ③（下車/上車卡 + clue 加厚）→ Task 5（兩張接縫卡）+ Task 2（clue 加厚）✓
- spec ④（字型統一琥珀電報調）→ Task 4 ✓
- spec ⑤（i18n 新鍵 zh/en 對齊，守衛）→ Task 2（新增）+ Task 3（移除舊鍵），守衛 `lang.test.js` 自動驗 ✓
- spec ⑥（TDD：cribMappingAt／面板；整合 preview 驗）→ Task 1/3/5/6 TDD + Task 7 preview ✓

**2. Placeholder 掃描：** 各 step 均有完整程式碼/確切指令/預期輸出；文案為實字串草稿（標明用戶判對味，非 TBD）。無 placeholder。

**3. 型別/命名一致：**
- `cribMappingAt(state)` 定義於 Task 1、引用於 Task 3（DecodePanel）✓
- `decode.open(puzzle, { keyFound, onSolve, onClose })` ── Task 3 定義 `keyFound`，Task 6 `openDecode`/`takeScrap` 傳入 ✓
- `showStoryCard(titleKey, bodyKey, vars, onContinue)` ── Task 5 定義，Task 5（下車/上車）+ Task 6（紙片）呼叫，簽名一致 ✓
- `pendingCard` ── Task 5 宣告、N 鍵/loop 閘/E 鍵守衛（Task 6）一致引用 ✓
- CSS class（`.decode-aim`/`.decode-reveal`/`.decode-needkey`/`.decode-confirm`）── Task 3 產生、Task 4 設樣式、Task 3 測試查詢，三處一致 ✓
- i18n 鍵（`decode.aim`/`confirm`/`fail`/`needkey`、`scrap.*`、`card.dropoff.*`/`card.embark.*`）── Task 2 加、Task 3/5/6 引用，名稱一致 ✓
- layout `scrap` ── Task 6 AlleyScene 產生、darkline.js 引用、alley.test 驗 ✓

**4. 風險/取捨（已在 spec 拍板）：** 軟閘（無懲罰、盲解需 ~26 次確認）為強誘導非硬閘；接縫卡用 `pendingCard` 不動 `SEGMENTS`/存檔，resume（`jumpTo`）路徑不經接縫卡、不受影響。
