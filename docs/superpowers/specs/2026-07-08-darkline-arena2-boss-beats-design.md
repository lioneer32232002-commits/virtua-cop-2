# DARKLINE — Arena2「師父救不回」＋Boss「假鐵證」兩拍演出 Design（2026-07-08）

> 權威上游：`docs/DARKLINE-首部曲劇情串接-戚將軍線.md` §6 拍3/拍5、§7 弧線、§9 §13 合規、§10 鎖定狀態。
> 劇情意圖已鎖（用戶 2026-06-17）；本 spec 只定**演出形式**（brainstorm 敲定 2026-07-08）。

## 0. 目標一句話

把六拍弧線裡缺演出的兩拍——**Arena2「師父救不回」**（拍3）與 **Boss「假鐵證」**（拍5）——用**既有故事卡 seam 機制**落地成遊戲內的當下情緒重擊，不新增段落/AI/資產。

## 1. 背景與範圍界定

- 07-08 的 v3 敘事換皮已把兩拍的**文字大多寫進現有字串**：`card.embark.body` 伏筆「線頭指回蕭敬之／打贏也只解決一半」；`ending.body`＋`ending.body2` 交付假鐵證餘波（老聶口供成案子地基、將軍架空、玫瑰、題眼、種子③、1996 鉤子）。
- **缺的不是文案，是演出＝遊戲內的節點時機**：老聶被帶走與 Boss 假鐵證這兩個「當下重擊」還沒有對應的遊戲節點。
- **段落現況**：`SEGMENTS = ['briefing', 'rail1', 'free', 'rail2boss', 'ending']`。Arena2 無獨立段落（rail1＝Arena1、rail2boss＝Arena3+Boss）。
- **既定野心層級（brainstorm 2026-07-08）**：兩拍皆走**故事卡 seam**（最輕、與下車/上車/河堤卡同母題），不新增 SEGMENTS、不動 AI/gameplay、不需新 sprite。「押走剪影」加料明確**不做**，列入日後 E1 sprite 線。

## 2. 架構（零新機制、零新資產）

複用既有 `game/src/darkline/darkline.js` 的故事卡 seam：

- `pendingCard`（`{ onContinue }`）：非 null 期間 GameLoop 暫停戰鬥/AI/彈丸、只渲染；按 N 收卡並執行 `onContinue`。
- `showStoryCard(titleKey, bodyKey, vars, onContinue)`：設 `pendingCard` ＋ `setInputMode('none')` ＋ `showOverlay(...)`。
- **卡片串接**：`onContinue` 可再呼叫 `showStoryCard` → 天然支援連演多張卡（N 收前卡→執行 onContinue→onContinue 內開下一張卡）。已驗證：N 鍵 handler 先 `pendingCard=null; hideOverlay()` 再 `cont?.()`，onContinue 內重開卡會重設 `pendingCard`＋重顯 overlay，行為正確。

**改動面：僅 `darkline.js` 兩處接線 ＋ 兩對 i18n 鍵 ＋ 一條字串守衛測試。**

## 3. 拍3：師父救不回（rail1 → free 接縫）

**行為**：rail1 `onComplete`（相機到底＋全清）由「直接演下車卡」改成**串接兩張卡**：

```
rail1 clear
  → showStoryCard(card.mentor, onContinue = () =>
        showStoryCard(card.dropoff, onContinue = () => advanceSegment()))
  →(N) 師父救不回卡
  →(N) 下車卡（既有，不改文案）
  → free
```

rail1 因此被追認為「Arena1＋2 的伏擊」：老聶在場、清場才發現被內勤科「依法」帶走。埋「假口供成鐵證」種子＋林建國第一次「敵人在背後」。**下車卡 `card.dropoff` 文案不動**（已是 v3）。

**新鍵 `card.mentor`（文案草稿，用戶判對味）：**

- zh title：`師父`
- zh body：
  > 槍聲停了。榮町的騎樓下，煙還沒散。
  >
  > 我回頭找老聶——只看見兩個內勤科的人，架著他往巷子那頭走。他沒掙扎，只回頭看了我一眼。
  >
  > 不是子彈。是一紙拘票，一句「依法偵辦」。他們不殺他，他們要他簽字。
  >
  > 第一次，我背脊發涼：獵我們的人，也許不在北方。就在我背後。
- en title：`The Mentor`
- en body：
  > The gunfire stops. Under the arcades of Eiraku-chō the smoke hasn't cleared.
  >
  > I turn to find Old Nieh — and see two men of the Domestic Affairs Section walking him off down the lane. He doesn't struggle. He only looks back at me, once.
  >
  > Not a bullet. A warrant, and the words "lawful inquiry." They don't kill him. They want his signature.
  >
  > For the first time my back goes cold: whoever is hunting us may not be in the North. He may be right behind me.

## 4. 拍5：Boss 假鐵證（rail2boss → ending 接縫）

**行為**：rail2boss `onComplete` 由「直接 `advanceSegment()`」改成**先演一張轉折卡**：

```
rail2boss (boss) clear
  → showStoryCard(card.frame, onContinue = () => advanceSegment())
  →(N) 假鐵證卡
  → ending
```

與 `card.embark`（伏筆）、`ending.body`（尾聲反思）串成一線：**伏筆 → 當下重擊 → 尾聲反思**，三段情緒 register 不同、不重複。假鐵證卡＝「打贏才發現」的即時崩塌（六拍弧線「Boss：勝利只剩一半」那一格）。

**新鍵 `card.frame`（文案草稿，用戶判對味）：**

- zh title：`鐵證`
- zh body：
  > 北方的人倒下了。碼頭的汽笛還在響，這一仗，我贏了。
  >
  > 可清點現場時我懂了：我的網、我的槍、我和北方在同一個碼頭交火——這一切，正被內勤科寫成另一份卷宗。
  >
  > 「林建國的線，與北方接頭。」
  >
  > 我親手替他們，補上了最後一塊鐵證。贏了這一仗，只剩一半。
- en title：`The Evidence`
- en body：
  > The North's men go down. The harbor horn is still sounding — this fight, I won.
  >
  > But as I count the scene I understand: my network, my gun, my firefight with the North on the very same pier — all of it is being written into another file by the Domestic Affairs Section.
  >
  > "Lin Chien-kuo's line, in contact with the North."
  >
  > With my own hands I gave them the last piece of evidence. I won this fight — and kept only half.

## 5. i18n 鍵（zh/en 對齊）

新增（zh.json 與 en.json 同名同序）：`card.mentor.title`、`card.mentor.body`、`card.frame.title`、`card.frame.body`。續行提示沿用既有 `brief.more`（「（按 N 繼續）」）。對齊守衛 `tests/darkline/lang.test.js`（`Object.keys(en)===Object.keys(zh)`）自動驗雙語同步。

## 6. §13 合規（沿用戚將軍線 §9）

- **不指名**：只用威妥瑪虛構代號——老聶／Old Nieh、內勤科／Domestic Affairs Section、林建國／Lin Chien-kuo、蕭敬之／Hsiao Ching-chih。地名 `榮町/Eiraku-chō`＝日治通稱（有意識選用，見 `docs/1953台北街景考據`）。
- **禁用詞**（deep-research 護欄，不得出現）：情報局、軍情局、警備總部、黑金、國民黨、黃埔。
- **台獨＝隱性靈魂**：兩卡不喊任何口號；師父卡的「敵人在我背後」、假鐵證卡的「自己人構陷」屬主題式影射（體制猜忌/構陷），非對象式。

## 7. 測試／驗證策略

- **i18n 對齊守衛**：自動覆蓋鍵對齊。
- **新字串守衛**（擴充既有 stale-proper-noun 守衛所在的 `tests/darkline/lang.test.js`，該檔已有 `stale` 名單 `.not.toContain` 與 `Chien-kuo` gloss 斷言）：斷言 `card.mentor.*`／`card.frame.*` 存在；zh body 含「老聶」「內勤科」；兩卡 zh+en 皆**不含**禁用詞集合。
- **CJK 字型**：新卡帶新漢字 → `glyphs.test.js` tofu/預算守衛可能紅 → 照守則 `cd game && npm run fonts:build` 重生 `dl-cjk.woff2`（< 300KB 預算）。
- **接線邏輯**：seam 串接為 `darkline.js` 整合層（boot 為瀏覽器環境、非純函式），比照既有下車/上車/河堤卡**不做單元測**，改 **Electron CDP 端到端驗**：`window.__dl.seq.jumpTo('rail1')` 走到清場→截圖師父卡→N→下車卡；`jumpTo('rail2boss')` 清 boss→截圖假鐵證卡→N→ending。確認中文零 tofu、N 串接順序正確、`preview_console_logs`/CDP 無錯。

## 8. 內容分工關卡

兩卡文案為 Claude 草稿。實作時（或此 spec 複審時）用戶判「對不對味」（語氣、威妥瑪專名、史實虛構化、禁用詞）。改字不動鍵、不影響測試結構。

## 9. Self-review（對照戚將軍線 §6）

- 拍3「Arena2＝師父救不回」→ §3 師父卡（清場才發現被內勤科合法帶走、埋假口供種子）✓
- 拍5「Boss＝真敵人假勝利的一半」→ §4 假鐵證卡（打贏被做成通敵鐵證、勝利只剩一半）✓
- §7 弧線「第一次背脊發涼」「勝利只剩一半」兩情緒點 → 兩卡各自承載 ✓
- 無 placeholder、無新機制、命名一致（`card.mentor`/`card.frame` 於 §3/§4/§5/§7 一致引用）。
- 範圍聚焦：單一實作計畫可容納（兩接線＋兩對鍵＋一守衛＋字型＋CDP 驗）。
