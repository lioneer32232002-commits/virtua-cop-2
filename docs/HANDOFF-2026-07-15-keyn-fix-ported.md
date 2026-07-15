# 交接紀錄：KeyN 跳段 bug 移植修正＋守衛加固 — 已實作＋已 E2E 驗證（2026-07-15）

> 最新接續點。先讀 `CLAUDE.md` → `docs/ops/00-INDEX.md` → 本檔。
> 承上一份：`docs/HANDOFF-2026-07-09-arena2-boss-beats-landed.md`。
> 本機工作副本已遷至 `C:\dev\DARKLINE`（OneDrive 遷出，見 CLAUDE.md §跨機器）；本 session 開場已驗 clone 基線 330/330 綠。

## 1. 這個 session 做了什麼（TL;DR）

用戶指示「繼續開發；寫碼交給其它模型、Fable 負責檢查」。定位到的最高優先：**main 上 rail/free 戰鬥中按 N＝除錯跳段**，會吃掉段尾劇情卡——07-09 剛落地的師父卡首當其衝。此 bug 在已過時的 `integrate/first-act-on-m3` 分支上修過（`18be700`）但從未回到 main。

- **實作 → Opus implementer subagent**（分支 `fix/n-skip-segments`，2 commits）：
  - `98dd27f` fix(gameplay)：N 只推劇情卡——跳打字/收 pendingCard/翻簡報結尾頁、**僅在 pager 末頁且 `pager.seg===seq.current` 才 `advanceSegment()`**；戰鬥中 N 不再跳段。除錯跳段改走 console：`window.__dl.seq.next()`。
  - `f6f1b1d` test(lang)：en 側專名正向斷言（Old Nieh／Domestic Affairs Section／Eiraku-chō／Lin Chien-kuo）——07-09 交接 §3 的審查遺留，關帳。
- **審查＋驗證 → 主 session（Fable）自做**：diff 逐行審（含 `pager` 生命週期邊角：殘留 pager 被 seg-match 守門擋住，無害）；親跑 **332/332 綠**（330 基線＋2）；Electron CDP E2E 全過——rail1 中 N×5 段不動（修正生效）、段尾 seam→師父卡照出（截圖零 tofu）、N 收卡鏈 mentor→dropoff→free 完好、`__dl.seq.jumpTo()/next()` 除錯路徑照跑。
- **文件漂移修正**（審查時抓到，implementer 範圍外）：`1c2c766` `electron/README.md` 還教「連按兩次 N 跳到 free」——修正後不成立，改指 `__dl.seq.jumpTo('free')`。

## 2. 分支處置建議（待用戶拍板）

`integrate/first-act-on-m3` 至此**完全被取代**：文案是 v2（main 已是用戶認可的 v3）、KeyN 修正已移植、`brief.body3/ending.body3` 三頁結構屬 v2 不再適用。**建議刪除該遠端分支**（連同更早的 `feat/*`、`fix/playmode-bugs` 等史前分支可一併清）——刪分支是破壞性操作，留給用戶決定。

## 3. 驗證備忘（本次新確認，補進坑單的候選）

- 合成 N 鍵驗證前**必須走真實選單啟動**（點 `#menu button`）：keydown handler 有 `menuOpen` 早退，只 hide 選單 div 不清 `menuOpen`，N 會被忽略→假通過。
- overlay 隱藏後 `textContent` 殘留上一張卡的字——判卡片狀態看 `classList.contains('hidden')`，別看文字。

## 4. 下一步候選（沿 07-09 §5，皆需用戶到場）

- **🎮 E3 windup 手感**：實玩拍 `first-island-chain.js` 的 `ai.windup` 數字。
- **E1 續生其餘陣營 idle sprite**（北方滲透網/將軍新軍/街坊平民；prompt 在定調 doc §4）。
- 分支清理拍板（§2）。

## 5. 環境

- dev server／Electron 本 session 已乾淨關閉（CDP `Browser.close`＋TaskStop）。
- 注意：本機 port 5180 被不明程序占用（Vite 自動跳 5181），無礙但下次驗證對 port 時留意。
