# DARKLINE Arena2「師父救不回」＋Boss「假鐵證」兩拍演出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用既有故事卡 seam 機制，把六拍弧線缺演出的兩拍——rail1→free 的「師父救不回」與 rail2boss→ending 的「假鐵證」轉折——落地成遊戲內的當下情緒重擊。

**Architecture:** 零新機制、零新資產。複用 `darkline.js` 既有的 `showStoryCard`/`pendingCard` 故事卡 seam（下車/上車/河堤卡同一套；`onContinue` 可再開卡＝天然串接）。只改兩處 `onComplete` 接線 ＋ 兩對 i18n 扁平鍵 ＋ 一個字串守衛。

**Tech Stack:** three.js + Vite；Vitest（`tests/darkline/lang.test.js` 已有鍵對齊守衛＋stale-proper-noun 守衛）；i18n 走 `src/locales/{zh,en}.json`（**扁平鍵**如 `"card.dropoff.title"`）；CJK 子集字型 `npm run fonts:build`；視覺驗證走 Electron CDP（`electron/README.md`，preview 隱藏視窗 rAF 凍結）。

**權威上游：** spec `docs/superpowers/specs/2026-07-08-darkline-arena2-boss-beats-design.md`（已拍板 2026-07-08）；戚將軍線 `docs/DARKLINE-首部曲劇情串接-戚將軍線.md` §6 拍3/拍5、§9 §13。

**測試指令：** 全跑 `cd game && npm test`；單檔 `cd game && npx vitest run tests/darkline/lang.test.js`。

---

## File Structure

| 檔案 | 責任 | 動作 |
|---|---|---|
| `game/tests/darkline/lang.test.js` | i18n 守衛 | 加「兩卡存在＋§13 合規」describe |
| `game/src/locales/zh.json` | 中文字典（扁平鍵） | 加 `card.mentor.*`、`card.frame.*` |
| `game/src/locales/en.json` | 英文字典（扁平鍵） | 加同名鍵（英譯） |
| `game/src/darkline/darkline.js` | 整合層 | 改 `enterRail` 的 `onComplete`（276-279）：rail1 串接 mentor→dropoff；rail2boss 插 frame |
| `ROADMAP.md` | 進度 | 收尾標記兩拍完成 |

---

## Task 1: 字串守衛（先紅）

**Files:**
- Modify/Test: `game/tests/darkline/lang.test.js`

- [ ] **Step 1: 在檔尾（最後一個 `})` 之後，即現行第 56 行後）新增 describe**

```js

describe('Arena2/Boss beats — story cards present + §13 compliance', () => {
  const KEYS = ['card.mentor.title', 'card.mentor.body', 'card.frame.title', 'card.frame.body']
  // §13/deep-research 禁用詞（時代錯置或對象式影射）：不得出現在任一新卡的 zh/en。
  const FORBIDDEN = ['情報局', '軍情局', '警備總部', '黑金', '國民黨', '黃埔']

  for (const k of KEYS) {
    it(`zh and en both define ${k}`, () => {
      expect(zh[k]).toBeTruthy()
      expect(en[k]).toBeTruthy()
    })
  }
  it('mentor card names Old Nieh and the Domestic Affairs Section (zh)', () => {
    expect(zh['card.mentor.body']).toContain('老聶')
    expect(zh['card.mentor.body']).toContain('內勤科')
  })
  it('frame card names the Domestic Affairs Section (zh)', () => {
    expect(zh['card.frame.body']).toContain('內勤科')
  })
  it('neither card uses any §13 forbidden term (zh or en)', () => {
    const blob = KEYS.map(k => (zh[k] || '') + (en[k] || '')).join('')
    for (const term of FORBIDDEN) expect(blob).not.toContain(term)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/lang.test.js -t "Arena2/Boss beats"`
Expected: FAIL — `zh['card.mentor.title']` 等為 undefined → `toBeTruthy` 紅（鍵尚未加）。

- [ ] **Step 3: Commit（紅測試先入，記錄意圖）**

```bash
git add game/tests/darkline/lang.test.js
git commit -m "test(story-v3): guard mentor/frame cards exist + §13 forbidden-term check (red)"
```

---

## Task 2: i18n — 加 `card.mentor` ＋ `card.frame`（zh/en 對齊）

**Files:**
- Modify: `game/src/locales/zh.json`
- Modify: `game/src/locales/en.json`

> 對齊守衛 `lang.test.js`（`Object.keys(en)===Object.keys(zh)`）要求**兩邊同步加同名鍵**。扁平鍵、注意每行結尾逗號。

- [ ] **Step 1: zh.json — `card.mentor` 插在 `card.dropoff.body` 之後**

在 `game/src/locales/zh.json` 找到 `"card.dropoff.body": "..."` 那一行（結尾為 `,`），在其**下一行**插入：

```json
  "card.mentor.title": "師父",
  "card.mentor.body": "槍聲停了。榮町的騎樓下，煙還沒散。\n\n我回頭找老聶——只看見兩個內勤科的人，架著他往巷子那頭走。他沒掙扎，只回頭看了我一眼。\n\n不是子彈。是一紙拘票，一句「依法偵辦」。他們不殺他，他們要他簽字。\n\n第一次，我背脊發涼：獵我們的人，也許不在北方。就在我背後。",
```

- [ ] **Step 2: zh.json — `card.frame` 插在 `card.riverbank.body` 之後（`ending.title` 之前）**

在 `"card.riverbank.body": "..."` 那一行（結尾為 `,`）之後插入：

```json
  "card.frame.title": "鐵證",
  "card.frame.body": "北方的人倒下了。碼頭的汽笛還在響，這一仗，我贏了。\n\n可清點現場時我懂了：我的網、我的槍、我和北方在同一個碼頭交火——這一切，正被內勤科寫成另一份卷宗。\n\n「林建國的線，與北方接頭。」\n\n我親手替他們，補上了最後一塊鐵證。贏了這一仗，只剩一半。",
```

- [ ] **Step 3: en.json — `card.mentor` 插在 `card.dropoff.body` 之後（順序與 zh 一致）**

```json
  "card.mentor.title": "The Mentor",
  "card.mentor.body": "The gunfire stops. Under the arcades of Eiraku-chō the smoke hasn't cleared.\n\nI turn to find Old Nieh — and see two men of the Domestic Affairs Section walking him off down the lane. He doesn't struggle. He only looks back at me, once.\n\nNot a bullet. A warrant, and the words \"lawful inquiry.\" They don't kill him. They want his signature.\n\nFor the first time my back goes cold: whoever is hunting us may not be in the North. He may be right behind me.",
```

- [ ] **Step 4: en.json — `card.frame` 插在 `card.riverbank.body` 之後**

```json
  "card.frame.title": "The Evidence",
  "card.frame.body": "The North's men go down. The harbor horn is still sounding — this fight, I won.\n\nBut as I count the scene I understand: my network, my gun, my firefight with the North on the very same pier — all of it is being written into another file by the Domestic Affairs Section.\n\n\"Lin Chien-kuo's line, in contact with the North.\"\n\nWith my own hands I gave them the last piece of evidence. I won this fight — and kept only half.",
```

- [ ] **Step 5: 跑守衛 + 對齊測試確認通過**

Run: `cd game && npx vitest run tests/darkline/lang.test.js`
Expected: PASS 全綠（Task 1 守衛轉綠；鍵對齊 `en mirrors all keys of zh` 仍綠＝雙語同步；無禁用詞）。
若紅：檢查逗號/JSON 逸出（en 內的 `\"` 需保留）、zh/en 是否同步加同名鍵。

- [ ] **Step 6:（內容分工）用戶判文案對味**

把 zh 的 `card.mentor.body`／`card.frame.body` 兩段念給用戶確認語氣/威妥瑪專名/史實虛構化。要改就替換字串（**不動鍵名**），改完重跑 Step 5。

- [ ] **Step 7: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(story-v3): mentor-loss + false-evidence story cards (zh/en), aligned keys"
```

---

## Task 3: 接線 — rail1 串接 mentor→dropoff；rail2boss 插 frame

**Files:**
- Modify: `game/src/darkline/darkline.js`（`enterRail` 的 `onComplete`，行 276-279）

> 整合層（瀏覽器 boot、非純函式）→ 比照既有下車/上車/河堤卡**不做單元測**，靠全測試無回歸 ＋ Task 4 的 Electron CDP 端到端驗。`showStoryCard(title, body, vars, onContinue)` 已存在；`onContinue` 內再呼叫 `showStoryCard` 即串接（N 收前卡→執行 onContinue→開下一張卡）。

- [ ] **Step 1: 替換 `onComplete` 區塊**

把 `game/src/darkline/darkline.js` 現有的：

```js
    onComplete: () => {                          // 相機到底 + 全清
      if (key === 'rail1') showStoryCard('card.dropoff.title', 'card.dropoff.body', undefined, () => advanceSegment())
      else advanceSegment()                      // rail2boss → 直接進 ending
    },
```

替換為：

```js
    onComplete: () => {                          // 相機到底 + 全清
      if (key === 'rail1') {
        // 拍3 師父救不回：清場才發現老聶被內勤科「依法」帶走 → 串接下車卡 → free。
        showStoryCard('card.mentor.title', 'card.mentor.body', undefined,
          () => showStoryCard('card.dropoff.title', 'card.dropoff.body', undefined, () => advanceSegment()))
      } else {
        // 拍5 Boss 假鐵證：打贏才發現這仗被做成通敵鐵證 → 一張轉折卡 → ending。
        showStoryCard('card.frame.title', 'card.frame.body', undefined, () => advanceSegment())
      }
    },
```

- [ ] **Step 2: 全測試確認無回歸**

Run: `cd game && npm test`
Expected: PASS 全綠（無單元測涉及此接線；確認既有測試不受影響）。

- [ ] **Step 3: Commit**

```bash
git add game/src/darkline/darkline.js
git commit -m "feat(story-v3): wire mentor card (rail1→free) + false-evidence card (boss→ending) seams"
```

---

## Task 4: 字型重生（條件）＋ 端到端驗證 ＋ 收尾

**Files:** 可能 `game/public/fonts/dl-cjk.woff2`（若字型守衛紅才重生）；`ROADMAP.md`

- [ ] **Step 1: 全測試（含字型 tofu/預算守衛）**

Run: `cd game && npm test`
Expected: 若 `glyphs.test.js` 的 tofu/預算守衛**紅**（新卡帶了子集裡沒有的漢字）→ 走 Step 2；若全綠 → 跳過 Step 2。

- [ ] **Step 2:（條件）重生 CJK 子集**

僅在 Step 1 字型守衛紅時執行：

Run: `cd game && npm run fonts:build`
Expected: 重生 `dl-cjk.woff2`（應仍 < 300KB §6 預算；gitignored `fonts-src/` 在本機）。重跑 `npm test` 應轉綠。

```bash
git add game/public/fonts/dl-cjk.woff2
git commit -m "chore(fonts): rebuild CJK subset for mentor/frame card glyphs"
```

- [ ] **Step 3: Electron CDP 端到端驗證（隱藏 preview 凍 rAF，走真實視窗）**

流程見 `electron/README.md`：`cd game && npm run dev`（記 port）→ `cd electron && DARKLINE_DEBUG_PORT=9222 DARKLINE_PORT=<port> npm start`（背景，polling `curl localhost:9222/json/version`）→ 用 `electron/shot.cjs` 截圖。逐項確認：

- **師父卡**：`window.__dl.seq.jumpTo('rail1')` 走到清場（或 eval 直接觸發 `onComplete`）→ 出現「師父」卡、中文**零 tofu**、含「內勤科」「依法偵辦」→ 按 N → 接「下車」卡 → 再按 N → 進 free。
- **假鐵證卡**：`window.__dl.seq.jumpTo('rail2boss')` 清 boss →出現「鐵證」卡、中文零 tofu、含「通敵/鐵證」語意 → 按 N → 進 ending。
- CDP console 無錯（`Runtime`/`Log`）。截圖存 session scratchpad。
- 收尾用 CDP `Browser.close` 關 Electron（**不要** `taskkill /IM electron.exe`＝會殺 Claude 桌面）。

- [ ] **Step 4: 用戶檢查點（spec §8 內容分工）**

把兩卡截圖＋觀察回報用戶，逐項問：師父卡「救不回」重擊夠不夠、假鐵證卡「勝利只剩一半」轉折順不順、與下車/上車/結尾串起來對不對味。要調的回 Task 2 改字（不動鍵）重驗。

- [ ] **Step 5:（收尾）更新 ROADMAP + 記憶**

在 `ROADMAP.md` 標記「Arena2 師父救不回 ＋ Boss 假鐵證兩拍演出」完成；順手修 `docs/HANDOFF-2026-07-08-v3-narrative-reskin.md` §4 過時項（decode-gating 其實已 landed、本兩拍已做）。更新自動記憶 `MEMORY.md` 一行進度（若適用）。

```bash
git add ROADMAP.md docs/HANDOFF-2026-07-08-v3-narrative-reskin.md
git commit -m "docs: mark Arena2/Boss beats done; correct stale decode-gating status in 07-08 handoff"
```

---

## Self-Review（對照 spec）

**1. Spec 覆蓋：**
- spec §3（師父卡 rail1→free、串接 dropoff、老聶被內勤科合法帶走）→ Task 2（`card.mentor` 文案）＋ Task 3（串接接線）✓
- spec §4（假鐵證卡 boss→ending、勝利只剩一半）→ Task 2（`card.frame` 文案）＋ Task 3（frame 接線）✓
- spec §5（i18n zh/en 對齊、`brief.more` 續行）→ Task 2 ＋對齊守衛 ✓
- spec §6（§13：威妥瑪專名、禁用詞、隱性靈魂）→ Task 1 守衛（老聶/內勤科 present、禁用詞 absent）✓
- spec §7（測試：對齊守衛/字串守衛/字型/CDP）→ Task 1（守衛）＋ Task 4（字型 Step 2、CDP Step 3）✓
- spec §8（內容分工對味關卡）→ Task 2 Step 6 ＋ Task 4 Step 4 ✓

**2. Placeholder 掃描：** 各 step 有完整程式碼/確切 JSON/確切指令/預期輸出；文案為實字串（標明用戶判對味，非 TBD）。字型重生為**條件步驟**（守衛紅才做），非 placeholder。無 TODO/TBD。

**3. 型別/命名一致：**
- 鍵名 `card.mentor.title`/`card.mentor.body`/`card.frame.title`/`card.frame.body` ── Task 1 守衛、Task 2 加、Task 3 接線引用，四處一致 ✓
- `showStoryCard(titleKey, bodyKey, vars, onContinue)` ── Task 3 兩處呼叫簽名一致（vars 傳 `undefined`）✓
- 禁用詞集合 ── Task 1 守衛與 spec §6 一致（情報局/軍情局/警備總部/黑金/國民黨/黃埔）✓
- `onComplete` 分支 `key === 'rail1'` vs else(rail2boss) ── 對齊現有 `enterRail` 結構（276-279）✓

**4. 風險/取捨（spec 已拍板）：** 「救不回」偏「用講的」（A 級既定）；押走剪影不做；接線為整合層無單元測（比照既有卡），靠全測試無回歸＋CDP 端到端補足。
