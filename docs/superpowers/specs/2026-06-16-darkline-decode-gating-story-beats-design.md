# DARKLINE 解碼梗 + 故事節點 設計規格（spec）

> **狀態：草稿，待用戶明天（新 session）一讀拍板** → 過了再走 `writing-plans` 出實作計畫。
> 本 spec 是 2026-06-16 checkpoint 回饋後的 brainstorming 產出（用戶逐項選定方向）。

## 緣起（用戶 checkpoint 回饋，2026-06-16）

M2 Phase 4 完成後用戶試玩，提出 4 點：
1. 解碼視窗文字也要電報感。
2. 解碼太簡單（一直往右按、出現可讀文字就破）；想要「稍微動點腦、但不太難」，且**有梗**——在別處看到提示、來這裡拿密件才用得上。
3. ~~魔王 lock-on 圈沒變大、落在下半身~~ → **已修**（`45b2e95`，bbox 中心＋投影身高比例，與本 spec 無關）。
4. 想更有故事感；現在篇幅是不是太短／還沒做完？

**澄清（#4）：** 現況是**意圖中的 MVP**（M2＝一條任務通關的最小版），非未完。故事厚度原訂 M3 再盛。用戶選擇「**中等**」：把 M3 的故事**少量前倒**——解碼加梗＋補幾個故事節點，但「不太難」。本 spec＝這個中等增量。

## 範圍鎖定（用戶 2026-06-16 兩次選定）

1. **方向＝中等**：解碼加梗（修破綻）＋故事節點補強；非「只修解碼」也非「開完整 M3 故事線」。
2. **解碼方式＝凱撒＋部分提示**：撤掉全文即時 preview；只顯示「對位窗」（密文某字母→當前轉盤解出的字母）；鑰匙（該字母的明文對應）**在任務中拾取的紙片**取得；對齊後按「確認」才揭曉全文。
3. **沿用既有**：`intel/decode.js`（凱撒核心，Phase 4 已測）、`intel/DecodePanel.js`（改部分提示＋確認制）、`core/cards.js`/overlay（故事卡）、`I18n`（鍵對齊守衛）。新碼一律 `game/src/darkline/`，引擎類別只重用不改。
4. **全面虛構化（首部曲 spec §13）**：故事卡/紙片文案不具名實在組織地點，只用林沂／西緣貿易公司／北方。

## 流程（改動後一輪）

```
簡報(2頁) → 軌道1 → 〔下車卡〕→ 自由段〔拾紙片(鑰+故事句) → 走到密件 按E 解碼(部分提示) → 解出揭露線索〕 → 〔上車卡〕→ 軌道2/Boss → 結尾(2頁)
```

新增＝下車卡、上車卡兩張故事小卡＋自由段一個「紙片」拾取物。

## 元件設計

### ① 解碼機制改版（破綻修正＋梗）

**目標：** 不能再「一直往右按、看到英文就破」；要先拿到鑰匙紙片才知道對到哪。

- **`decode.js`（小增）：** 加純函式 `cribMappingAt(state)` → 回 `caesarShift(state.crib.cipher, -state.dial)`（當前轉盤下，crib 密文字母解出的明文字母）。TDD。其餘核心（makePuzzle/applyGuess/isSolved/previewText）不變。
- **`DecodePanel.js`（改）：**
  - **撤掉全文即時 preview**（解出前不顯示 `previewText`）。
  - 顯示「**對位窗**」：`密文 {crib.cipher} → {cribMappingAt(state)}`（轉盤即時更新）。
  - 加「**確認 / DECODE**」按鈕：按下時 `isSolved(state)`（dial===answer，等同把 crib 對到正解）→ 揭曉全文（電報式浮現）＋線索＋`onSolve` 一次；否則狀態列「對位錯誤，重新對位」（**無懲罰**，可一直試＝盲解需 ~26 次確認＝強誘導但不卡關）。
  - 開面板時若**未拾鑰匙紙片**：面板小字提示「需要密碼鑰匙——附近找找看」（軟性引導，仍可嘗試）。
  - 鍵盤：← → 轉盤、Enter＝確認、Esc＝收起。
- **梗如何成立：** 鑰匙（crib 的明文目標）**不在面板顯示**，只在拾取的紙片上。沒拾＝不知道要把 `{crib.cipher}` 對到哪個字母（軟閘）。

### ② 紙片＝鑰匙來源（梗的源頭＋故事感）

- **自由段新增第 2 個拾取物**（接頭人死信箱「紙片」，放入口側，比密件早遇到）。
- 按 E 拾取 → 顯示一張小卡：**一句劇情**（接頭人語氣，虛構化）＋**鑰匙**「電碼鑰：密文 {crib.cipher} ＝ 明文 {crib.plain}」。設旗標 `keyFound=true`。
- **同一道謎題**：進自由段時 `makePuzzle(MISSION.free.alleySeed)` 建一次，紙片與密件解碼面板共用 → 紙片教的對應正好是面板要對齊的。

### ③ 故事節點（劇情小卡 2 張＋加厚線索）

- **下車卡**（軌道1→自由段接縫）：接頭／巷弄氛圍一句。
- **上車卡**（自由段→軌道2 接縫）：密件入手→趕赴碼頭的緊迫一句。
- **解碼線索加厚**：`decode.clue` 從一句擴成稍長的「中盤揭露」（仍餵 1996 鉤子）。
- 演出：沿用 overlay/pager（單頁卡，按 N 續），淡入；接縫輸入模式切換沿用既有慣例（下車卡＝input none→卡收→pointerlock；上車卡→cursor）。

### ④ 字型統一（#1）

- 解碼面板（`#decode`）改成**與簡報/結尾同一電報調**：電傳打字機等寬（ui-monospace/Courier）＋琥珀磷光 glow＋寬字距＋CRT 掃描線。**廢現行青色**、寄琥珀（解密電的畫面用電報調最對味；全作「電文／電報」母題一致）。
- 紙片卡、下車/上車卡沿用 overlay 既有電報樣式。

### ⑤ i18n（新鍵，zh/en 對齊；守衛＝`Object.keys(en)===Object.keys(zh)`）

- 解碼：`decode.aim`（對位窗標籤）、`decode.confirm`（確認鈕）、`decode.fail`（對位錯誤）、`decode.needkey`（缺鑰提示）；`decode.clue` 改寫加厚。
- 紙片：`scrap.title`、`scrap.body`（劇情句＋`{c}`/`{p}` 內插鑰匙）。
- 故事卡：`card.dropoff.title`/`card.dropoff.body`（下車）、`card.embark.title`/`card.embark.body`（上車）。
- 文案＝Claude 產草稿 → **用戶判對味**（內容創作分工）。

### ⑥ 測試與驗證

- **TDD**：`cribMappingAt`（decode.test）、`DecodePanel` 部分提示＋確認制＋缺鑰提示（jsdom，decodepanel.test）。
- **整合**：darkline.js 紙片拾取／keyFound 閘／兩張故事卡接縫／面板開關輸入復原 → preview DOM 驗（隱藏視窗坑：resize desktop、patch decode、手動 render，見 [[project-vc2-env-gotchas]]）。
- 全測試綠、preview 端到端無 console 錯。

## 權威上游

- 首部曲 spec `docs/superpowers/specs/2026-06-15-darkline-first-island-chain-design.md`（§5 故事框架、§13 虛構化）。
- M2 plan `docs/superpowers/plans/2026-06-15-darkline-m2-mvp.md`（Phase 4＝解碼＋劇情，本 spec 是其 checkpoint 後的增量）。
- 既有實作：`intel/decode.js`、`intel/DecodePanel.js`、`darkline.js`、`locales/{zh,en}.json`、`darkline.html`。

## Self-review（spec 自檢）

- **無 placeholder／TBD**：所有元件有明確改法；文案待用戶判對味（已標）。
- **一致性**：解碼「部分提示＋確認制」與「紙片給鑰匙」互相咬合（同一 puzzle、crib 不在面板顯示）；軟閘不卡關符合「不太難」。
- **範圍**：聚焦中等增量，未擴成完整 M3 故事線（用戶選定）。
- **歧義**：盲解總當回避＝「無懲罰、~26 次確認」已明定取捨（強誘導非硬閘），避免「拿掉 preview 會不會卡關」的兩種解讀。

## 待辦（明天新 session）

1. 用戶一讀本 spec、拍板或微調（brainstorming 的「user reviews spec」關）。
2. 過了 → `writing-plans` 出逐 task 實作計畫（decode helper → DecodePanel 改 → 紙片 → 故事卡 → 字型 → 文案草稿 → preview 驗）。
3. 逐 task TDD＋commit，結尾用戶檢查點（解碼手感／梗順不順／故事卡對味／字型）。

---

*本 spec 基於 2026-06-16 checkpoint 回饋 brainstorming 定向（中等＋凱撒部分提示），待用戶 2026-06-17 起新 session 一讀拍板。*
