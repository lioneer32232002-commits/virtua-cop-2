# 交接紀錄：M3 合併回 main ＋ ops 制度 ＋ 首部曲敘事待對味（2026-07-03）

> 這是目前**最新**的接續點（接手取日期最新的 HANDOFF）。先讀 `CLAUDE.md` → `docs/ops/00-INDEX.md`（新的運作制度）→ 本檔。
> 由 Opus 4.8 session 收尾寫。所有狀態以 repo 為準、已 push。

## 1. main 現況（已 push origin/main，`1bd6e42`）

- **M3 視覺外觀層全 Phase 已合併回 main**：Phase D(VC2退役)＋A(電影感後製)＋B(dusk 氛圍)＋C1-C9(諜報 UI：token/OFL字型/HUD/boot/GSAP轉場/打字機/解碼scramble招牌時刻/手機holding/i18n守衛)＋hardening＋HUD `#hint` 重疊修。**313/313 綠，build 乾淨，首載 gzip 311KB**（上限 1465KB）。
- **新增 `docs/ops/` 運作制度**（給接手的較弱模型立的制度；CLAUDE.md 有路由）：`01`harness診斷/`02`模型調度/`03`判斷rubric/`04`派工模板/`05`維護協議/`06`給未來的信。**開場先掃 `docs/ops/01`**（本專案最漏token/失焦/易錯前三名）。改 CLAUDE.md 時務必保留那條 ops 路由（命根）。
- 順手清理：root `HANDOFF.md`（2026-06-11 pivot 前的舊檔）已加過期橫幅；本機 memory `MEMORY.md` 索引巨行已壓短（歷史在 `docs/ops/_backup/` 與 `project_virtua_cop_2.md`）。

## 2. 待對味的東西：首部曲敘事（branch `integrate/first-act-on-m3`，已 push）

- **內容**：M3 視覺 ＋ 戚將軍線劇情（主角**林建國**/西緣貿易公司掩護、老聶被『依法』帶走、紙片＝聶的自白密件、解碼揭露「**獵殺名單的不是北方，是自己人依法收網**」＝核心批判線、結尾將軍玫瑰＋1996 鉤子）。源自 `feat/first-act-narrative`（7 commit）。
- **整合狀態**：narrative merge 進 M3-main **自動合併零衝突**（只有一個重複 i18n-keyalign 測試取 main 版）；新劇情 CJK 已 `fonts:build`（dl-cjk 107.9KB/373 glyphs）。**313/313，build 乾淨，首載 324.8KB**。已 CDP 自驗 briefing(林建國)＋解碼(獵人是自己人)都正確演出。
- **合併方式（對味過後）**：`git checkout main && git merge integrate/first-act-on-m3`（乾淨、無需解衝突、字型已生成）→ push → 刪 branch。**main 目前沒有這條，等用戶對味拍板才併。**

## 3. 用戶 2026-07-03 回饋（重要，決定下一步）

用戶試玩後點出（都準）：
1. **內容薄**：briefing→rail1→free→boss→ending 就是整條 MVP 縱切片。「就沒了」是實情。
2. **美術沒上**：現在是幾何佔位（streetKit 方塊）＋打光/後製/UI，**authored 美術＝Milestone E 未開始**，是最大視覺短板（敵＝單張billboard、主角無形象）。
3. **段落間「一片黑要按N」＋rail↔free 銜接突兀**：黑底劇情卡讀起來像空載入畫面、beat 沒落地。
4. **`N` 會跳過劇情**——已修（見下）。

## 4. 本 session 已修/已查（都在 `integrate/first-act-on-m3`）

- **`18be700` fix：`N` 不再跳過 rail/free 段落**（原本 N 會 advanceSegment 除錯跳段，把段尾劇情卡如「他們帶走了老聶」跳掉）。現在 N 只：跳完打字/收劇情卡/翻簡報結尾頁/末頁才進段。除錯跳段改 console `window.__dl.seq.next()`。CDP 驗：rail1 N×5 停在 rail1、除錯跳段生存、313/313。**這應該修掉大半「劇情就這樣」的錯覺**（老聶那張核心卡現在會出現）。
- **`98a1f50`（已在 main）fix：`#hint` 不再蓋 SCORE**（移到底部置中＋撤掉除錯段落字）。
- **已查明的環境仕様（非 bug）**：段落轉場的 gsap wipe 依賴 rAF → **視窗非前景/被遮時會凍住**（alt-tab 轉場停、回前景就續）。所以自動化 CDP 驗轉場**必須視窗前景**，否則 cover() 不 resolve、briefing→rail1 卡住（那是 focus 問題，不是 bug、也不是 N-fix 造成）。視覺驗證一律讓 Electron 視窗在前景。

## 5. 下一步（用戶掌舵，優先序建議）

- **即時 gate**：用戶做一次**前景**集中試玩 `integrate/first-act-on-m3`，判首部曲劇情對味 → 過了就併回 main（§2 方式）。
- **(C) Milestone E 美術內容**＝最大梃子（改掉「幾何佔位感」）：走內容協作（Claude 產 sprite/場景候選、用戶判對味），以 `docs/DARKLINE-STYLE-BIBLE.md` 為底。**Claude 可先起草美術方向候選（不需用戶測試）。**
- **(B) seam/節奏**：把黑底卡升級成有意圖過場、rail↔free 橋接。
- **(D) 可選**：轉場改 GameLoop 驅動、非前景不凍（robustness）。
- 也可回頭做耐玩度（軌道段戰鬥太稀疏，已有 chip 另案）。

## 6. 跑法備忘

- 測試 `cd game && npm test`；視覺驗證走 Electron CDP（preview 會凍 rAF）：`cd game && PORT=5180 npm run dev` → `cd electron && DARKLINE_PORT=5180 DARKLINE_DEBUG_PORT=9222 npm start` → `node electron/shot.cjs`（已內建 captureBeyondViewport）。**轉場要驗＝視窗保持前景。**
- 新劇情文案改字後 tofu guard 會紅 → `cd game && npm run fonts:build` 重生子集再 commit。
- 分支：`main`(權威)、`integrate/first-act-on-m3`(待對味)、`feat/first-act-narrative`(原敘事源，已被整合)。其餘 `claude/*`、`feat/complete-original-stages` 等是舊 VC2 殘留可不理。
