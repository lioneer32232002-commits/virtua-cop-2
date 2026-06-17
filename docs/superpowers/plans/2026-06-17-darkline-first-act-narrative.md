# DARKLINE 首部曲劇情整合（戚將軍線 v3）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 M2 既有的佔位簡報/結尾/解碼/故事卡文案，換成 [戚將軍線 v3](../../DARKLINE-首部曲劇情串接-戚將軍線.md) 的真內容（主角林建國、自己人構陷、克蘭西調、台獨隱性靈魂三瞬間），全部重用既有系統、不新增美術、不新增引擎機制。

**Architecture:** 純內容整合——絕大多數是改 `game/src/locales/{zh,en}.json` 的 i18n 字串，加上 `darkline.js` 的 `CARD_PAGES` 兩個 bodies 陣列各加一頁；隱性靈魂三瞬間塞進**既有接縫**（briefing 第 3 頁／rail1→free 的 dropoff 卡／free→docks 的 embark 卡／ending 第 3 頁），不動 SEGMENTS/MissionSequencer/存檔/解碼邏輯。新增一個遞迴「中英鍵對齊守衛」測試保證不漏譯。

**Tech Stack:** Vite + Three.js（`game/`）、i18n（`core/i18n.js` `translate(dict,key,vars)`、`{var}` 內插）、Vitest（`game/tests/darkline/`）。

**權威 spec：** [戚將軍線 v3](../../DARKLINE-首部曲劇情串接-戚將軍線.md)。**所有文案＝內容創作分工草稿，待用戶判對味；改字串不動鍵名即不破測試。** 真實史實僅靈感、全面虛構化、台獨以隱性靈魂處理（不喊口號），遵守 spec §13。

**隱性靈魂鐵律（寫文案時務必守）：** 台獨永遠不是口號、不是宣稱目的、不被解釋；全程僅三個安靜瞬間點到（beat① briefing 第3頁老聶點名字真意／beat② embark 卡望河一瞬／beat③ ending 把夢譯進暗碼交給未來），始終是「一個注定幻滅者的私密渴望」。標竿《Papers, Please》《1984》。

---

## 範圍（Scope）

**本計畫做（內容整合，無美術）：**
- 主角更名 林沂 → **林建國**（雙關：眾人聽成「愛國」，他與玩家知道是那個還沒生出來的國）。
- 簡報/結尾/解碼線/接縫卡全部改寫成 v3 敘事（自己人構陷、搶救真相、將軍玫瑰、1996 鉤子）。
- 隱性靈魂三瞬間（塞既有接縫）。
- 中英鍵對齊守衛測試。

**本計畫不做（→ M3 / 另案，需美術或新系統）：**
- 角色與街區 **sprite/場景美術**（林建國/老聶/內勤科/北方/將軍玫瑰、五街區）。
- **Arena 2 老聶被擄的「進引擎腳本化演出」**（本計畫只用 dropoff 接縫卡帶過）。
- **Boss「真敵人/假鐵證」過場 cinematic**（本計畫只用 ending 文案點出轉折）。
- 解碼面板**實際英文密電明文**換句（目前語言無關 codeword 保留；敘事由 `decode.clue` 旁白承載。若日後要改見「後續」節）。

---

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `game/src/locales/zh.json` | Modify | 全部中文敘事字串（brief/card/scrap/decode/ending）改寫＋新增 brief.body3 / ending.body3 |
| `game/src/locales/en.json` | Modify | 對應英文，鍵與 zh 完全一致 |
| `game/src/darkline/darkline.js` | Modify（2 行）| `CARD_PAGES.briefing.bodies` 與 `.ending.bodies` 各加一頁鍵 |
| `game/tests/darkline/i18n-keyalign.test.js` | Create | 遞迴比對 zh/en 扁平化鍵集合相等（漏譯即紅）|

> 文案鍵名沿用現有結構（`brief.*`/`card.*`/`scrap.*`/`decode.*`/`ending.*`），只**改值＋加 body3 兩鍵**；故事卡走既有 `showStoryCard`/`CARD_PAGES`，解碼走既有 `decode.clue`/`scrap.body`（vars `{c}{p}`）。

---

## Task 1：中英鍵對齊守衛（先立護網，TDD）

**Files:**
- Test/Create: `game/tests/darkline/i18n-keyalign.test.js`

理由：本計畫狂改 i18n，先有「en/zh 鍵必須一致」的守衛，後面每改一處跑它就知道有沒有漏譯/打錯鍵。

- [ ] **Step 1: 寫測試**

```javascript
// game/tests/darkline/i18n-keyalign.test.js
import { describe, it, expect } from 'vitest'
import zh from '../../src/locales/zh.json'
import en from '../../src/locales/en.json'

function flatKeys(obj, prefix = '') {
  const out = []
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatKeys(v, key))
    else out.push(key)
  }
  return out.sort()
}

describe('i18n key alignment', () => {
  it('zh and en have identical key sets', () => {
    expect(flatKeys(en)).toEqual(flatKeys(zh))
  })
})
```

- [ ] **Step 2: 跑測試確認現況通過（或抓出現有不一致）**

Run: `cd game && npx vitest run tests/darkline/i18n-keyalign.test.js`
Expected: PASS（現有字典應已對齊；若 FAIL 表示既有就漏譯，先補齊再繼續）。

- [ ] **Step 3: Commit**

```bash
git add game/tests/darkline/i18n-keyalign.test.js
git commit -m "test(darkline): i18n zh/en key-alignment guard"
```

---

## Task 2：主角更名林建國 ＋ 簡報改寫 ＋ beat① 名字真意（briefing 第 3 頁）

**Files:**
- Modify: `game/src/locales/zh.json`（`brief.body`, `brief.body2`, 新增 `brief.body3`）
- Modify: `game/src/locales/en.json`（同上）
- Modify: `game/src/darkline/darkline.js`（`CARD_PAGES.briefing.bodies` 加 `'brief.body3'`）

- [ ] **Step 1: 改 `zh.json` 的 brief 區**（值如下；保留 `brief.title`/`brief.more`/`brief.continue` 不動）

```json
"brief": {
  "title": "簡報",
  "body": "一九五三年，台北。停火的墨跡未乾，城裡每一盞燈背後都有人在聽。\n你是林建國——西緣貿易公司的物流顧問，街角沒人多看一眼的小聯絡員。跑死信箱、抄電文、把名字一個個登進一本誰都不該看見的冊子：暗線名單。",
  "body2": "這幾天，名單上的人接連失聯。上頭說是北方的人在獵殺、要你查出洩密的口子。\n師父老聶把任務交到你手上時，只說了一句：『盯緊名字，別信任何人手裡那張紙。』",
  "body3": "臨走，老聶替你把領口壓平，壓低聲音：『你爹給你取這名字的時候，心裡那個國，跟牆上掛的不是同一個。』\n他拍了拍你的肩：『別讓人聽見。先活著，其餘的以後再說。』",
  "more": "（按 N 繼續）",
  "continue": "（按 N 出發）"
}
```

- [ ] **Step 2: 改 `en.json` 的 brief 區**（鍵與 zh 完全一致）

```json
"brief": {
  "title": "Briefing",
  "body": "1953, Taipei. The ink on the ceasefire is barely dry, and behind every lamp in this city someone is listening.\nYou are Lin Chien-kuo — a logistics consultant at Western Rim Trading, the kind of small courier nobody looks at twice. You run dead drops, copy down cables, and enter names, one by one, into a ledger no one is ever meant to see: the darkline roster.",
  "body2": "These past days the names on it keep going dark. The brass says the North is hunting them, and wants you to find the leak.\nWhen Nie — your handler, your teacher — hands you the job, he says only this: 'Watch the names. And trust no paper in anyone's hand.'",
  "body3": "As he leaves, Nie smooths your collar and lowers his voice: 'When your father gave you that name, the country he meant wasn't the one hanging on the wall.'\nHe pats your shoulder. 'Don't let them hear it. Stay alive first — the rest comes after.'",
  "more": "(Press N to continue)",
  "continue": "(Press N to move out)"
}
```

- [ ] **Step 3: 改 `darkline.js` 的 `CARD_PAGES.briefing.bodies`**（約 `darkline.js:103`）

把：
```javascript
briefing: { title: 'brief.title', bodies: ['brief.body', 'brief.body2'], last: 'brief.continue' },
```
改為：
```javascript
briefing: { title: 'brief.title', bodies: ['brief.body', 'brief.body2', 'brief.body3'], last: 'brief.continue' },
```

- [ ] **Step 4: 跑鍵對齊＋全測試**

Run: `cd game && npx vitest run tests/darkline/i18n-keyalign.test.js && npm test -- --run`
Expected: 鍵對齊 PASS；全套維持綠（既有 351 + Task1 新增）。

- [ ] **Step 5: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json game/src/darkline/darkline.js
git commit -m "feat(story): rename protagonist 林建國 + rewrite briefing + beat① name-meaning page"
```

---

## Task 3：rail1→free 接縫卡＝老聶被自己人帶走（reframe `card.dropoff`）

**Files:**
- Modify: `game/src/locales/zh.json`（`card.dropoff.title`, `card.dropoff.body`）
- Modify: `game/src/locales/en.json`（同上）

> 重用既有 dropoff 接縫卡（`darkline.js:250` 觸發），不改觸發點。

- [ ] **Step 1: 改 `zh.json` 的 `card.dropoff`**

```json
"dropoff": {
  "title": "他們帶走了老聶",
  "body": "槍聲歇下時，巷子已經空了。沒有北方的人——只有兩個穿西裝的，亮出一張『依法逮捕』的紙，把老聶架上了車。\n他回頭看你一眼，沒喊。車燈在巷口熄了。\n你第一次明白：今晚真正的敵人，不在你槍口指著的方向。"
}
```

- [ ] **Step 2: 改 `en.json` 的 `card.dropoff`**

```json
"dropoff": {
  "title": "They Took Nie",
  "body": "When the shooting stops, the alley is already empty. No Northern agents — just two men in suits, a warrant held up 'by law,' and Nie marched into a car.\nHe looks back once. He doesn't call out. The headlights die at the alley mouth.\nFor the first time you understand: tonight's real enemy is not where your gun is pointed."
}
```

- [ ] **Step 3: 跑鍵對齊＋全測試**

Run: `cd game && npx vitest run tests/darkline/i18n-keyalign.test.js && npm test -- --run`
Expected: PASS / 綠。

- [ ] **Step 4: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(story): reframe rail1→free seam — 老聶 taken 'by law' (real enemy is behind you)"
```

---

## Task 4：死信箱紙片＝老聶偷塞的口供碎片/鑰匙（reframe `scrap.*`）

**Files:**
- Modify: `game/src/locales/zh.json`（`scrap.title`, `scrap.body`）
- Modify: `game/src/locales/en.json`（同上）

> **務必保留 vars `{c}` `{p}`**（紙片教的 crib，與解碼面板 `makePuzzle(alleySeed)` 同謎題對齊，見 `darkline.js:343-349`）。只改敘事包裝，不動 vars。

- [ ] **Step 1: 改 `zh.json` 的 `scrap`**

```json
"scrap": {
  "title": "老聶的紙條",
  "body": "牆角鬆的那塊磚後頭，塞著半張紙——是老聶被帶走前留下的。上頭潦草一行：密文 {c} 就是明文 {p}。\n他要你解開那封電文。他知道，名單還在我們自己手上。"
}
```

- [ ] **Step 2: 改 `en.json` 的 `scrap`**

```json
"scrap": {
  "title": "Nie's Note",
  "body": "Behind the loose brick in the corner, a half-sheet of paper — left by Nie before they took him. One scrawled line: cipher {c} is plain {p}.\nHe wants you to crack the cable. He knew: the roster is still in our own hands."
}
```

- [ ] **Step 3: 跑鍵對齊＋全測試**（解碼測試也應維持綠，因 vars 未動）

Run: `cd game && npx vitest run tests/darkline/i18n-keyalign.test.js tests/darkline/decode.test.js && npm test -- --run`
Expected: PASS / 綠。

- [ ] **Step 4: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(story): scrap = Nie's smuggled confession-fragment / cipher key (keep {c}{p} vars)"
```

---

## Task 5：解碼揭露＝獵殺名單的是自己人（reframe `decode.clue`）

**Files:**
- Modify: `game/src/locales/zh.json`（`decode.clue`）
- Modify: `game/src/locales/en.json`（同上）

> 只改 `decode.clue`（解出後的旁白）。其餘 `decode.*`（aim/confirm/needkey/fail/solved/cipher/title/close）不動。

- [ ] **Step 1: 改 `zh.json` 的 `decode.clue`**

```json
"clue": "電文解開了——獵殺名單的，不是北方。\n是自己人在『依法』收網，口供是刑求逼出來的；每一個被劃掉的名字，都是被做成了叛徒。\n名單還在你手上。把它送出去。"
```

- [ ] **Step 2: 改 `en.json` 的 `decode.clue`**

```json
"clue": "The cable opens up — the names aren't being hunted by the North.\nIt's our own people, reeling them in 'by law,' confessions beaten out of them; every crossed-off name was manufactured into a traitor.\nThe roster is still in your hands. Get it out."
```

- [ ] **Step 3: 跑鍵對齊＋全測試**

Run: `cd game && npx vitest run tests/darkline/i18n-keyalign.test.js && npm test -- --run`
Expected: PASS / 綠。

- [ ] **Step 4: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(story): decode reveal — the hunters are our own (frame-up, not the North)"
```

---

## Task 6：free→碼頭 接縫卡＝趕赴碼頭 ＋ beat② 望河一瞬（reframe `card.embark`）

**Files:**
- Modify: `game/src/locales/zh.json`（`card.embark.title`, `card.embark.body`）
- Modify: `game/src/locales/en.json`（同上）

> 重用既有 embark 接縫卡（`darkline.js:508`）。beat② 隱性靈魂折進此卡（望淡水河、把「這邊本該也能是另一個國」的念頭收回去），不喊口號、不解釋。

- [ ] **Step 1: 改 `zh.json` 的 `card.embark`**

```json
"embark": {
  "title": "趕赴碼頭",
  "body": "你把名單貼著胸口，往碼頭走。淡水河的風又腥又鹹。\n對岸是另一個世界；河的這一邊，本該也能是另一個。你把這個念頭收回去——像每天那樣，收進那個沒人聽得見的地方。\n今晚，還沒完。"
}
```

- [ ] **Step 2: 改 `en.json` 的 `card.embark`**

```json
"embark": {
  "title": "To the Docks",
  "body": "You hold the roster against your chest and head for the docks. The Tamsui wind is salt and brine.\nThe far bank is another world; this side could have been one too. You fold the thought away — like every day, into the place no one can hear.\nTonight is not over."
}
```

- [ ] **Step 3: 跑鍵對齊＋全測試**

Run: `cd game && npx vitest run tests/darkline/i18n-keyalign.test.js && npm test -- --run`
Expected: PASS / 綠。

- [ ] **Step 4: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(story): embark card = to the docks + beat② quiet river longing (hidden soul)"
```

---

## Task 7：結尾改寫＝將軍玫瑰 ＋ 搶救真相 ＋ 題眼台詞 ＋ beat③ 把夢交給未來（含 ending 第 3 頁）

**Files:**
- Modify: `game/src/locales/zh.json`（`ending.body`, `ending.body2`, 新增 `ending.body3`）
- Modify: `game/src/locales/en.json`（同上）
- Modify: `game/src/darkline/darkline.js`（`CARD_PAGES.ending.bodies` 加 `'ending.body3'`）

- [ ] **Step 1: 改 `zh.json` 的 `ending` 區**（保留 `ending.title`）

```json
"ending": {
  "title": "任務完成",
  "body": "名單回來了。可你已經明白，這從來不是北方的局。\n那位你從沒見過、卻為他賣命的將軍——太美國、太得人心、太不肯靠誰——被升了官、架空了，圈進一座有人看守的院子。聽說他夫人在院裡種玫瑰，拿到市場上去賣。\n一個救過千軍的人，晚景在賣花。",
  "body2": "你救不了他，也救不了老聶。但你把真名單，和那份『口供是逼出來的』鐵證，封進了一個只有將來才打得開的死信箱。\n他留給你的那句話，你記了一輩子：『名字留住。人，他們帶得走；名字，要靠你帶走。』",
  "body3": "你把這一切譯成暗碼時，連同那個始終沒能說出口的國，一起交給了後來的人。\n名單上，一個被劃掉的代號旁邊，你留下一行字：\n「島嶼會再被收緊。到那天，先回頭看看自己人。」\n——代號『暗線』，自此潛入夜裡。"
}
```

- [ ] **Step 2: 改 `en.json` 的 `ending` 區**

```json
"ending": {
  "title": "Mission Complete",
  "body": "The roster is back. But you understand now — this was never the North's game.\nThe general you served and never met — too American, too loved, too unwilling to bow to anyone — was promoted, hollowed out, and walled into a guarded courtyard. They say his wife grows roses there, and sells them at the market.\nA man who once saved an army ends his days selling flowers.",
  "body2": "You couldn't save him. You couldn't save Nie. But the true roster — and the proof the confessions were beaten out — you have sealed into a dead drop only the future can open.\nHis words to you, you will carry for life: 'Keep the names. The people they can take; the names, you carry out.'",
  "body3": "As you cipher it all down, you hand the future something more — that country you never got to say aloud.\nBeside one crossed-out codename, you leave a single line:\n\"The island will be drawn tight again. When that day comes, look first to your own.\"\n— Codename 'Darkline.' Into the dark from here."
}
```

- [ ] **Step 3: 改 `darkline.js` 的 `CARD_PAGES.ending.bodies`**（約 `darkline.js:104`）

把：
```javascript
ending: { title: 'ending.title', bodies: ['ending.body', 'ending.body2'], last: null },
```
改為：
```javascript
ending: { title: 'ending.title', bodies: ['ending.body', 'ending.body2', 'ending.body3'], last: null },
```

- [ ] **Step 4: 跑鍵對齊＋全測試**

Run: `cd game && npx vitest run tests/darkline/i18n-keyalign.test.js && npm test -- --run`
Expected: PASS / 綠。

- [ ] **Step 5: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json game/src/darkline/darkline.js
git commit -m "feat(story): ending rewrite — 將軍玫瑰 + saved truth + keystone line + beat③ encode-the-dream + 1996 hook"
```

---

## Task 8：整輪驗證（測試綠 ＋ 用戶 Electron 走動試玩＝對味閘）

**Files:** 無（驗證）

- [ ] **Step 1: 全套測試**

Run: `cd game && npm test -- --run`
Expected: 全綠（既有 351 + i18n-keyalign 新測），零回歸。

- [ ] **Step 2: 文案掃讀**（鍵對齊已保證無漏譯）：確認中英每段語氣＝克蘭西＋琥珀電報＋隱性靈魂三瞬間（briefing 第3頁/dropoff/embark/ending 第3頁）皆到位、台獨**無任何口號**。

- [ ] **Step 3: 用戶本機 Electron 走動試玩（對味閘，Claude 代替不了）**

依 `electron/README.md`：`npm start`（帶 `DARKLINE_PORT`）→ 真實視窗走整輪（選單→簡報3頁→rail1→老聶被帶走卡→free 拾老聶紙條→解碼揭露→望河 embark→rail2boss→結尾3頁），判：①整條敘事順不順、扣不扣題 ②隱性靈魂三瞬間夠不夠克制、會不會太露/太隱 ③中英語氣對不對味。**preview 隱藏視窗 rAF 凍、走不了**（見 [[project-vc2-env-gotchas]]）。

- [ ] **Step 4:**（若有微調）改字串不動鍵→重跑 Task1 守衛即可，不破其他測試。

---

## 後續（M3 / 另案，本計畫不含）
- **美術**：林建國/老聶/內勤科/北方/將軍玫瑰角色 sprite、五街區場景（見 [街景考據](../../DARKLINE-1953台北街景考據.md)＋[服裝用品武器美術考據](../../DARKLINE-年代考據-服裝用品武器美術.md)）。
- **Arena 2 老聶被擄**：從接縫卡升級成「進引擎腳本化演出」（需新演出系統）。
- **Boss 真敵人/假鐵證**：過場 cinematic（需新演出系統）。
- **解碼明文換句**：把面板實際英文密電（目前語言無關 codeword）換成扣新敘事的句子（需讀 `decode.js` 的 `makePuzzle` 明文來源、同步 scrap crib 一致性）。
- **武器主題化**：內勤科便衣的「藏西裝左輪」視覺（需美術/敵種）。

---

## Self-Review（plan 對 spec 自查）

- **spec 覆蓋**：v3 §0 logline（更名+構陷+搶救真相）✅ Task2/3/4/5/7；§2 隱性靈魂三瞬間 ✅ beat① Task2、beat② Task6、beat③ Task7；§4 角色（林建國/老聶/將軍不露面）✅ 文案處理、將軍只在 ending 以轉述/遠景；§5 麥高芬（名單=證物/搶救真相）✅ Task5/7；§6 六拍意義重寫 ✅ 接縫卡/解碼/結尾；§8 題眼 #2 ✅ Task7 body2、#4 ✅ Task7 body3；§9 §13 隱性靈魂 ✅ 鐵律寫入、無口號。**Arena2/Boss 進引擎演出＋美術**＝明確標 out-of-scope（→M3）。
- **無佔位**：每個 copy task 給完整中英值；CARD_PAGES 給 before/after；測試給完整程式碼。✅
- **型別/鍵一致**：所有改動沿用既有鍵名（brief/card/scrap/decode/ending），只加 `brief.body3`/`ending.body3` 兩鍵並同步加進兩語系＋CARD_PAGES；vars `{c}{p}` 保留不動。✅

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-17-darkline-first-act-narrative.md`. 兩種執行方式：

**1. Subagent-Driven（建議）** — 每 task 派新 subagent、task 間我 review、快速迭代。
**2. Inline Execution** — 本 session 直接逐 task 執行、批次到檢查點停下給你看。

> 注意：**文案＝待你判對味**。技術上每 task 都能跑綠，但「對不對味」要你本機 Electron 走過一輪（Task 8 Step 3）才算數。要先讓你**讀過/改過文案草稿**再開工，也可以——告訴我即可。

哪一種？
