# DARKLINE v3 Narrative Re-skin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shipped Phase-4 in-game narrative text (old "North wants the roster" story) with the locked v3 story (self-betrayal / General Chi / Lin Chien-kuo / hidden-soul), across all `brief`/`ending`/story-card/decode strings in both languages, plus a new optional seed-② riverbank story card in the free segment.

**Architecture:** Pure content re-skin of `game/src/locales/{zh,en}.json` (the sole i18n content home) + one new optional trigger zone in the free segment (`AlleyScene.js` layout → `free` object → game-loop check firing an existing `showStoryCard`). No decode-mechanic changes — only decode *strings* are re-authored to stay world-consistent. The multi-page pager (`CARD_PAGES`) keeps its 2+2 structure; only string values change.

**Tech Stack:** Vanilla JS, Vitest, JSON i18n dicts, existing `showStoryCard`/`CARD_PAGES`/`inside()` machinery.

---

## Scope

**In scope (this plan):** `brief.*`, `ending.*`, `card.dropoff.*`, `card.embark.*`, decode/scrap *strings*, new `card.riverbank.*` + its trigger, global proper-noun swap (林沂→林建國 / Lin Yi→Lin Chien-kuo; 老周→老聶 / Old Zhou→Old Nieh), regression + key-alignment tests, Electron-CDP verification.

**Out of scope (deferred, separate plans):**
- **Decode-gating MECHANIC** (撤 preview / 對位窗 / 紙片 pickup gating) — owned by [decode-gating spec](../specs/2026-06-16-darkline-decode-gating-story-beats-design.md). This plan only re-authors the decode *strings* to the v3 frame; that plan may re-touch them when it reworks the UI.
- **Arena 2「老聶救不回」演出** and **Boss「真敵人/假鐵證」轉折演出** — need new engine sequencing (v3 §6 拍3/拍5). Flagged in [戚將軍線 v3](../../DARKLINE-首部曲劇情串接-戚將軍線.md) §10 as future writing-plans items. This plan re-skins existing card TEXT only; it does not re-map story beats onto new segments.

**Source of truth for all strings:** [簡報結尾文案 v3 草稿](../../DARKLINE-首部曲-簡報結尾文案-v3草稿.md) (user-approved 2026-07-08: 語氣/種子/題眼 all 過). ZH/EN below are transcribed from it; secondary cards (dropoff/embark/decode/scrap) are authored here in the same voice.

---

## File Structure

- `game/src/locales/zh.json` — Chinese i18n dict (all narrative strings). **Modify.**
- `game/src/locales/en.json` — English mirror (must stay key-aligned). **Modify.**
- `game/src/darkline/free/AlleyScene.js` — free-segment layout; add `riverbankTrigger` region. **Modify (`buildAlleyLayout` return, ~line 31-45).**
- `game/src/darkline/darkline.js` — thread `riverbankTrigger`/`riverbankShown` into `free` (line 231-232); add loop trigger (near line 572). **Modify.**
- `game/tests/darkline/lang.test.js` — key-alignment guard already here; add stale-name regression guard. **Modify.**

---

## Task 1: Re-skin `brief.*` (opening briefing, seed ①)

**Files:**
- Modify: `game/src/locales/zh.json:6-7` (`brief.body`, `brief.body2`)
- Modify: `game/src/locales/en.json:6-7`
- Test: `game/tests/darkline/lang.test.js` (existing key-align guard covers it)

- [ ] **Step 1: Replace `brief.body` + `brief.body2` in `zh.json`**

Replace the two lines (keys stay identical; only values change):

```json
  "brief.body": "一九五三年　台北　入夜。\n\n西緣貿易公司　三樓閣樓。表面上，我們替美國人算船期、報關、押貨。\n\n實際上，這間閣樓是一張網的結點——死信箱、暗碼本、聯絡的規矩，把城裡看不見的人一條線串起來。\n\n名冊上每一個代號，都是一條命。規矩只有一條：名字不落紙，人不見面。",
  "brief.body2": "師父老聶把一疊回條推過來。\n\n「外勤的燈，一盞一盞滅了。」「三個星期，五個代號，沒回音。」\n\n他沒抬頭：「北方的人也許進了城。查清楚誰在獵我們的人，把洩的口堵上。」\n\n臨出門，他忽然叫住我，看著我識別證上的名字，很輕地說：「建國……你這名字，取得真好。愛國。」他頓了一下，「大家都這麼聽。」\n\n我沒接話。有些字，只能在心裡讀成另一個樣子。",
```

- [ ] **Step 2: Replace `brief.body` + `brief.body2` in `en.json`**

```json
  "brief.body": "TAIPEI — 1953. AFTER DARK\n\nThird floor, West-Marches Trading Co. On paper, we clear cargo for the Americans — manifests, customs, freight.\n\nIn truth this loft is the knot in a net: dead drops, cipher pads, the rules of contact, tying together the men this city never sees.\n\nEvery codename in the book is a life. One rule only: no name on paper, no face in the open.",
  "brief.body2": "Old Nieh pushes a stack of return-slips across the table.\n\n\"The outer lamps are going dark. One by one.\" \"Three weeks. Five codenames. Silence.\"\n\nHe doesn't look up. \"The North may be inside the city now. Find who's hunting our people. Close the leak.\"\n\nAt the door he stops me, his eyes on the name on my papers, and says, softly: \"Chien-kuo. 'Found a nation.' A fine name. Everyone hears it the same way — a loyal son of the Republic.\"\n\nI said nothing. Some words you can only read, in private, as another country.",
```

- [ ] **Step 3: Verify both JSON files parse + keys align**

Run: `cd game && npx vitest run tests/darkline/lang.test.js`
Expected: PASS (key-alignment guard green; JSON parses).

- [ ] **Step 4: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(story-v3): reskin opening briefing to v3 (Lin Chien-kuo, Old Nieh, seed ①)"
```

---

## Task 2: Re-skin `ending.*` (seed ③ / 題眼 / 1996 hook)

**Files:**
- Modify: `game/src/locales/zh.json:30-31` (`ending.body`, `ending.body2`)
- Modify: `game/src/locales/en.json:30-31`

- [ ] **Step 1: Replace `ending.body` + `ending.body2` in `zh.json`**

```json
  "ending.body": "名單守住了。人，沒有。\n\n老聶簽下的那張「口供」，成了整套案子的地基——他們用一個好人的字，埋掉了一串好人。\n\n城郊有座宅子，將軍被榮譽的虛職架空，如今由衛兵看著。聽說夫人在後院種玫瑰，拿到市場去賣。\n\n一個打過三國勳章的人，最後輸給的不是敵人，是自己人怕他不必靠他們、也照樣能贏。",
  "ending.body2": "我把真名單，連同「口供是刑求逼出來的」鐵證，封進一個只有將來打得開的死信箱。\n\n將軍留給我一句話，我譯成暗碼收進去：「名字留住。人，他們帶得走；名字，要靠你帶走。」\n\n在被劃掉的代號旁，我又添了一行，一半給後來的人，一半——給那個我沒說出口的國：\n\n　　　　　待第一島鏈再次收緊之日\n\n從今夜起，名冊上不再有我的名字。他們會叫我，暗線。\n\n—— 一九九六　台海　續 ——",
```

- [ ] **Step 2: Replace `ending.body` + `ending.body2` in `en.json`**

```json
  "ending.body": "The list was saved. The men were not.\n\nThe \"confession\" Old Nieh signed became the foundation of the whole case — they used a good man's hand to bury a line of good men.\n\nOn the edge of the city there is a house. The general, sidelined into an honorary post, now lives under guard. They say his wife grows roses in the yard, and sells them at the market.\n\nA man decorated by three nations lost, in the end, not to the enemy — but to his own, afraid of a man who could win without them.",
  "ending.body2": "I sealed the true list — and the proof the confession was beaten out of him — into a dead drop only the future can open.\n\nThe general left me one line. I ciphered it in: \"Names endure. The men, they can take. The names — you must carry out.\"\n\nBeside the struck-through codename I added one more line, half for those who come after, half — for the country I never said aloud:\n\n          UNTIL THE FIRST ISLAND CHAIN TIGHTENS AGAIN\n\nFrom tonight, my name is not in the book. They will call me — Darkline.\n\n—— 1996 · THE STRAIT · to be continued ——",
```

- [ ] **Step 3: Verify**

Run: `cd game && npx vitest run tests/darkline/lang.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(story-v3): reskin ending to v3 (General's roses, seed ③, 題眼, 1996 hook)"
```

---

## Task 3: Re-skin inter-segment story cards `card.dropoff.*` + `card.embark.*`

> These bridge rail1→free (drop-off into 大稻埕巷弄調查) and free→rail2boss (趕赴碼頭). Text is re-skinned to the v3 frame (deaths look like "legal" seizures, not a robbery; the thread points back to 蕭敬之). Trigger points unchanged.

**Files:**
- Modify: `game/src/locales/zh.json:24-27`
- Modify: `game/src/locales/en.json:24-27`

- [ ] **Step 1: Replace dropoff + embark in `zh.json`**

```json
  "card.dropoff.title": "下車",
  "card.dropoff.body": "車燈在巷口熄了。這裡是大稻埕——藥行的麻袋還堆在騎樓下，茶香混著雨氣。\n\n外勤一個個沒了音訊，死法卻不對勁：不是被搶情報，是家產被「依法」查封。北方的人，不這麼做事。\n\n往巷子裡走。今夜的答案，藏在這些後門與死信箱之間。",
  "card.embark.title": "趕赴碼頭",
  "card.embark.body": "死信箱裡的碎片對上了。線頭沒有指向北方——指回西緣內部，指回蕭敬之。是自己人，在「結算」我們的人。\n\n可北方的交易是真的，今晚就在碼頭；汽笛已經在拉。\n\n這仗還是得打——就算打贏，也只解決一半。順著巷尾那道光上車。",
```

- [ ] **Step 2: Replace dropoff + embark in `en.json`**

```json
  "card.dropoff.title": "The Drop-off",
  "card.dropoff.body": "The headlights die at the alley mouth. This is Dadaocheng — herb-shop sacks still stacked under the arcade, tea and rain in the air.\n\nThe outer men are going silent one by one, but the deaths are wrong: not robbed of intel, but their property seized \"by law.\" The North doesn't work this way.\n\nGo in. Tonight's answer is hidden among these back doors and dead drops.",
  "card.embark.title": "To the Docks",
  "card.embark.body": "The scrap from the dead drop lines up. The thread doesn't point north — it points back inside West-Marches, back to Hsiao Ching-chih. It's our own, \"settling\" our own.\n\nBut the Northern deal is real, and it's at the docks tonight; the horn is already drawing out.\n\nThe fight still has to be fought — and even won, it only settles half. Follow the band of light at the alley's end.",
```

- [ ] **Step 3: Verify**

Run: `cd game && npx vitest run tests/darkline/lang.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(story-v3): reskin drop-off/embark cards to v3 (legal seizures, thread to Hsiao)"
```

---

## Task 4: Re-author decode/scrap STRINGS to v3 frame (mechanic unchanged)

> Keeps the cipher-key mechanic and its `{c}`/`{p}` interpolation vars intact (decode-gating plan owns the mechanic). Only re-authors the narrative: the scrap is now what **Old Nieh** pressed into the drop before being taken; the decoded clue reveals the self-betrayal (denunciations/seizures, forced confession, roster still ours).

**Files:**
- Modify: `game/src/locales/zh.json:18,20,23` (`decode.needkey`, `decode.clue`, `scrap.body`)
- Modify: `game/src/locales/en.json:18,20,23`

- [ ] **Step 1: Replace the three keys in `zh.json`**

```json
  "decode.needkey": "缺密碼鑰匙──先在巷子裡找找老聶留下的東西。",
  "decode.clue": "電文解開了：名單上被劃掉的人，不是北方殺的──是自己人用「檢舉」與「查封」一個個結算掉的，好把整張網做成『通敵』的案子。老聶的口供是刑求逼出來的。真名單，還在我們手上。最末一行不是這一夜的事──「線一旦斷，循舊網重連，毋須等令」。有些線埋下，本就是為了幾十年後再醒。",
  "scrap.body": "牆角鬆的那塊磚後頭，是老聶被帶走前塞下的東西，邊角還沾著機油：\n「照舊鑰──密文 {c} 即明文 {p}。對上這一個，其餘自己會開。記住：口供，是他們逼的。」",
```

- [ ] **Step 2: Replace the three keys in `en.json`**

```json
  "decode.needkey": "No cipher key — find what Old Nieh left in the alley first.",
  "decode.clue": "The cable opens up: the struck-through names weren't killed by the North — our own settled them one by one, with \"denunciations\" and \"seizures,\" to build the whole net into a \"treason\" case. Old Nieh's confession was beaten out of him. The true roster is still in our hands. The last line isn't about tonight: \"If the line is cut, reconnect along the old net, await no order.\" Some lines are buried precisely to wake decades later.",
  "scrap.body": "Behind the loose brick in the corner, the thing Old Nieh pressed into the drop before they took him, oil still on the edge:\n\"Same key as ever — cipher {c} is plain {p}. Set that one, the rest opens itself. Remember: the confession was forced.\"",
```

- [ ] **Step 3: Verify vars + parse**

Run: `cd game && npx vitest run tests/darkline/cards.test.js tests/darkline/lang.test.js`
Expected: PASS (cards.test uses inline dicts, so it stays green; confirms `{c}`/`{p}` interpolation still supported; key-align green).

- [ ] **Step 4: Commit**

```bash
git add game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(story-v3): re-author decode/scrap strings to self-betrayal frame (mechanic unchanged)"
```

---

## Task 5: Seed ② — optional riverbank story card in the free segment

> A quiet, optional, fire-once card (v3 §2 seed ②). Reuses the proven `showStoryCard` machinery. Placed off the main combat path; firing it pauses combat (like drop-off/embark), and dismissing with N resumes the free segment (re-acquires pointer-lock — N is a user gesture, so `requestPointerLock` is allowed).

**Files:**
- Modify: `game/src/darkline/free/AlleyScene.js` (`buildAlleyLayout` return, ~line 31-45)
- Modify: `game/src/darkline/darkline.js:231-232` (thread into `free`) and near `:572` (loop trigger)
- Modify: `game/src/locales/zh.json` + `en.json` (add `card.riverbank.*`)

- [ ] **Step 1: Add `riverbankTrigger` to the alley layout**

In `AlleyScene.js`, inside the object returned by `buildAlleyLayout`, add after the `exitTrigger` line:

```js
    exitTrigger: { minX: 5, maxX: 9, minZ: -22, maxZ: -17 },  // 巷尾轉折盡頭＝上車觸發區
    riverbankTrigger: { minX: -3.0, maxX: -1.5, minZ: -8.5, maxZ: -6.5 },  // 河堤私密字卡（種子②，可選、觸發一次；off 主戰線）
```

> Region coords are a first guess in the west-side pocket near the intel point; **tune in preview (Step 6)** so it sits in walkable alley and off the combat lane.

- [ ] **Step 2: Thread trigger + fire-once flag into the `free` object**

In `darkline.js`, extend the `free = { ... }` literal (line 231-232):

```js
  free = { controller, group, layout, enemies, intelMesh, scrapMesh, bullets, exitTrigger: layout.exitTrigger,
           riverbankTrigger: layout.riverbankTrigger, riverbankShown: false,
           intelTaken: false, keyFound: false, mags: [], killsSinceDrop: 0 }
```

Also update the `let free = null` JSDoc comment (line 78) to list the two new fields:

```js
let free = null   // { controller, group, layout, enemies[], intelMesh, scrapMesh, bullets, exitTrigger, riverbankTrigger, riverbankShown, intelTaken, keyFound, mags[], killsSinceDrop }
```

- [ ] **Step 3: Add the loop trigger (fires once, resumes free on dismiss)**

In `darkline.js`, in the free-segment loop block, immediately **before** the existing exit-trigger line (`if (inside(free.exitTrigger, cam)) ...` at ~line 572), insert:

```js
    // 走近河堤 → 演一次私密字卡（種子②，可選）。演完按 N 收卡、重取 pointerlock 續玩自由段。
    if (!free.riverbankShown && inside(free.riverbankTrigger, cam)) {
      free.riverbankShown = true
      showStoryCard('card.riverbank.title', 'card.riverbank.body', undefined, () => setInputMode('pointerlock'))
    }
```

- [ ] **Step 4: Add `card.riverbank.*` strings (both dicts, key-aligned)**

In `zh.json`, add after the `card.embark.body` line:

```json
  "card.riverbank.title": "河堤",
  "card.riverbank.body": "淡水河往北流。對岸的燈，這幾年我學會了不去數。\n\n老聶說，人要認命。可我認的那個，說出來就是死。\n\n河水不問你效忠誰，只管往海裡去。",
```

In `en.json`, add at the matching position:

```json
  "card.riverbank.title": "The Embankment",
  "card.riverbank.body": "The Tamsui runs north. The lights on the far shore — these years, I've learned not to count them.\n\nOld Nieh says a man must accept his lot. But the lot I'd accept — to say it aloud is to die for it.\n\nThe river doesn't ask whose side you're on. It only runs to the sea.",
```

- [ ] **Step 5: Verify unit-level (key-align + full darkline suite)**

Run: `cd game && npx vitest run tests/darkline/`
Expected: PASS (key-align guard green with the new aligned pair; no regressions).

- [ ] **Step 6: Verify in real window (Electron CDP) that the card fires once in walkable space**

Per `electron/README.md`: start dev server + Electron with debug port, jump to `free`, walk into the riverbank zone.
Run (example): `DARKLINE_DEBUG_PORT=9222 node electron/shot.cjs riverbank.png 2600 "window.__dl.seq.jumpTo('free')"`
Then drive the camera into the trigger region and confirm: (a) card appears once, (b) walking back in does NOT re-fire, (c) pressing N dismisses and pointer-lock resumes (can move again). If the zone sits in a wall/obstacle or on the combat lane, adjust `riverbankTrigger` coords in Step 1 and re-check.

- [ ] **Step 7: Commit**

```bash
git add game/src/darkline/free/AlleyScene.js game/src/darkline/darkline.js game/src/locales/zh.json game/src/locales/en.json
git commit -m "feat(story-v3): add optional riverbank story card (seed ②) with fire-once free-segment trigger"
```

---

## Task 6: Regression guard — no stale proper nouns remain

**Files:**
- Modify: `game/tests/darkline/lang.test.js` (append a guard block)

- [ ] **Step 1: Write the failing guard test**

Append to `game/tests/darkline/lang.test.js`:

```js
describe('v3 narrative reskin — no stale proper nouns', () => {
  const blob = JSON.stringify(zh) + JSON.stringify(en)
  for (const stale of ['林沂', '老周', 'Lin Yi', 'Old Zhou']) {
    it(`contains no stale name: ${stale}`, () => {
      expect(blob).not.toContain(stale)
    })
  }
  it('opening names Lin Chien-kuo via the gloss line', () => {
    expect(en['brief.body2']).toContain('Chien-kuo')
  })
})
```

- [ ] **Step 2: Run — expect PASS (Tasks 1-5 already removed the stale names)**

Run: `cd game && npx vitest run tests/darkline/lang.test.js`
Expected: PASS. If any stale-name assertion FAILS, grep the reported name in `zh.json`/`en.json` and finish the swap (that means an earlier task missed an occurrence).

- [ ] **Step 3: Run the full suite (no regressions anywhere)**

Run: `cd game && npm test`
Expected: PASS — all prior tests green plus the new guards (baseline was 318 green; expect 318 + new guard cases).

- [ ] **Step 4: Commit**

```bash
git add game/tests/darkline/lang.test.js
git commit -m "test(story-v3): guard against stale proper nouns (林沂/老周) + assert Chien-kuo gloss"
```

---

## Task 7: End-to-end verification (Electron CDP)

> The preview window freezes rAF (known env gotcha); visual verification runs through the real Electron window per `electron/README.md`.

- [ ] **Step 1: Briefing reads v3 (both pages, both langs)**

Boot to briefing; page through both pages; confirm ZH shows the Old-Nieh receipt scene + the name-gloss line, EN shows the "Found a nation" gloss. Reload with `?lang=en` to check the mirror.

- [ ] **Step 2: Ending reads v3**

Jump to `ending`; page through; confirm General's-roses page + "Names endure… you must carry out" + "UNTIL THE FIRST ISLAND CHAIN TIGHTENS AGAIN" + 1996 stinger.

- [ ] **Step 3: Free-segment cards**

In `free`, trigger drop-off (entry), riverbank (seed ②, optional zone), decode (E on intel with scrap key), embark (alley end). Confirm each reads v3 and none reference the old story (林沂/老周/North-robs-the-list).

- [ ] **Step 4: Capture proof + note result**

Screenshot briefing + ending pages (ZH and EN). Report pass/fail honestly; if any card still shows old text, it means a key was missed — return to the owning task.

---

## Self-Review

**1. Spec coverage** (against the approved 文案 draft + v3 story doc):
- Opening seed ① (name gloss) → Task 1 ✅
- Ending seed ③ + 題眼 + 1996 hook → Task 2 ✅
- Drop-off/embark v3 frame (legal seizures, thread to Hsiao) → Task 3 ✅
- Decode self-betrayal reveal + Old-Nieh scrap → Task 4 ✅
- Seed ② riverbank optional card → Task 5 ✅
- Proper-noun consistency (林建國/老聶) → Tasks 1-5 author correctly; Task 6 guards ✅
- Deferred (decode mechanic, Arena 2/Boss演出) → explicitly out-of-scope, flagged ✅

**2. Placeholder scan:** No TBD/TODO; every string and code hunk is complete and copy-pasteable.

**3. Type/name consistency:** `riverbankTrigger`/`riverbankShown` named identically in AlleyScene layout (Step 1), `free` literal (Step 2), JSDoc (Step 2), and loop check (Step 3). `showStoryCard(titleKey, bodyKey, vars, onContinue)` signature matches its definition (darkline.js:114). `setInputMode('pointerlock')` matches the mode string handled at darkline.js:86. Card keys `card.riverbank.title/body` identical across both dicts and the loop call. Cipher vars `{c}`/`{p}` preserved in Task 4 (interpolation supported per `translate()`).

**Note on region coords:** `riverbankTrigger` bounds are a first guess; Task 5 Step 6 requires preview tuning so it sits in walkable, off-combat space — the only value that needs empirical adjustment.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-08-darkline-v3-narrative-reskin.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session with checkpoints.

**Which approach?**
