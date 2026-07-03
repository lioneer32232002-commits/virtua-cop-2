# 交接紀錄：M3 Phase C 進度 ＋ 質感提升方向（2026-07-02，07-03 更新）

> 給下一個接手的模型/session。本檔由 Fable 5 試跑 session 產出（07-03 收畢 C7 修正後更新）。
> 先讀：`CLAUDE.md` → M3 spec `docs/superpowers/specs/2026-06-22-darkline-m3-visual-layer-design.md` → Phase C plan `docs/superpowers/plans/2026-07-02-darkline-m3-phase-c-ui-espionage.md`。

> **【2026-07-03 更新 2（Opus session）】C8／C9／收尾 hardening 全執行完成＋單審過（省額度模式），Electron CDP 自查 8 景全綠。**
> - **C8 最小 mobile holding-state**：`9eea39f`（single-review APPROVED）。holding.js + #holding 節點 + `@media (orientation:portrait) and (max-width:719px)` + i18n 3 鍵；tofu guard 正常紅→`npm run fonts:build` 重生 dl-cjk 子集（306 glyphs，95.7KB）。312/312。
> - **C9 i18n 鍵對齊守衛**：`1ae490f`。zh/en 鍵集合全等測試，首跑即綠（無漏鍵）。313/313。**首載 gzip 311.2KB**（守衛上限 1465KB）。
> - **收尾 hardening（§2.3 四項）**：`7d10ca0`（review APPROVED，含 async 控制流逐項推演）。①`applySegment` try/finally 強制 reveal（enterRail/enterFree throw 不再永久蓋黑）；②`transitioning` 撐到 reveal 完成＋wipe tween `overwrite:true`（連按 N 不再兩 tween 打架轉場隱形）；③boot/menu 鍵盤守衛（`bootDone`/`menuOpen` 旗標：N/R 在 boot/選單期間不吃、Tab+Enter 不穿透選單鈕）；④transition 測試補 `isCovered===false` mid-cover 斷言。313/313，build 乾淨。全部 **已 push origin/feat/m3-visual-layer**。
> - **Electron CDP 自查（§2.4，主控端）8 景全綠**：boot（DARKLINE 電報+琥珀 bar+建立線路 CJK）／menu（暗線—第一島鏈 tokenised）／briefing（打字機游標 ▌ mid-type+新宋體）／rail1 HUD（dusk 台北+cinematic grade+琥珀 SCORE/命章/彈匣）／wipe（琥珀邊 dark 覆蓋，posed frame——真轉場太快難捕、動效走 transition.test.js 決定性驗）／decode 面板（琥珀情報 restyle+凱撒轉盤+軟閘 hint）／**scramble 招牌時刻**（mid-converge「THE LIS…」左鎖右亂 → 明文點火 ok+clue 故事 payoff）／holding（直向暗線電報，i18n 覆蓋英文 fallback）。截圖坑：Electron 視窗非前景 → `Page.captureScreenshot` -32000，需 `captureBeyondViewport:true`（見 scratchpad cap.cjs；可考慮把此 flag 併回 electron/shot.cjs）。
> - **剩下＝用戶 Electron 親驗對味**（唯一未完；下方 §2 第 5 點 + §3 清單）：M3 spec §5 檢查點五問 + 一直 pending 的 Phase B 五問 + 首部曲敘事分支試玩。過了才更新 ROADMAP「Phase C 收 / M3 收」。**功能面 C1-C9 全達成。**

## 1. 現狀快照（全部已 push origin/feat/m3-visual-layer）

- **M3 進度**：Phase D ✅、A ✅、B 核心 ✅（B 檢查點 5 問**用戶還沒親驗**）、**C 進行中（C1-C7＋Esc 修正全收，C8/C9/hardening/自查未做）**。
- Phase C commits：`7baa769`（plan）→ `de4398e` C1 token 層 → `d198529`+`0ef505a` C2 HUD 諜報化 → `b4e5469` C3 字型管線 → `70590d6` C4 boot 開場 → `bb4e10f` C5 GSAP wipe 轉場 → `5b89ee6` C6 打字機 → `0866a44` C7 解碼 scramble 招牌時刻 → `27e4c54` C7 Esc-during-converge 修正（re-review APPROVED；converge 中第一下 Esc＝跳到收斂結尾不關面板、close() 加殘留保險）。
- 測試 **310/310 綠**；首載 gzip **306.8KB**（守衛上限 1465KB）；字型子集 dl-cjk 92.1KB（288 glyphs）＋ dl-latin 14.5KB。
- 每個 task 都過了 spec＋quality 雙審（獨立 subagent），含修正全數 APPROVED。
- 另外：本地 main 與 `feat/first-act-narrative`（首部曲敘事 7 commits）都已 push 上 origin；VC2 舊 worktree/branch 已清；repo 根有 `START-HERE.md` 跨機器接手指南；CLAUDE.md 有「跨機器接手必讀」節。

## 2. Phase C 還沒做的（按順序；用戶 2026-07-03 拍板：後續 task **單審即可**省額度）

1. **Task C8 手機 holding-state**（plan 有完整碼）：#holding 直向電報畫面＋media query＋renderHolding＋i18n 鍵。注意新文案會讓 tofu guard 紅 → `cd game && npm run fonts:build`（原始 TTF 已在本地 `game/fonts-src/`，缺檔會印 curl 指令）。
2. **Task C9 i18n 鍵對齊守衛**（注意：敘事分支有同路徑同用途檔，合併時任取一版）。
3. **收尾 hardening pass**（審查累積的 plan 級問題，集中一個 commit 修）：
   - `applySegment` 包 try/finally 強制 `transition.reveal()`（現在 enterRail/enterFree throw 會讓 wipe 永遠蓋著）；
   - `transitioning` 旗標改在 applySegment 尾端（reveal 後）才釋放＋`cover()`/`reveal()` 開頭 `gsap.killTweensOf(bar)` 或 `overwrite:true`（現在 reveal 期間連按 N 會兩個 tween 打架、轉場全隱形）；
   - 選單/boot 期間鍵盤漏洞（M2 既有）：N 鍵在 menu 開著時會偷跑 `seq.next()`、Tab+Enter 可穿透 boot 按到選單——加 menu-level guard；
   - （可選小補）transition 測試在 0.1s 處加 `isCovered===false` 斷言。（scramble 的 reduced-motion/double-finish 測試已於 `27e4c54` 補掉。）
4. **Electron CDP 自查**（主控端）：`cd game && PORT=5180 npm run dev` → `cd electron && DARKLINE_PORT=5180 DARKLINE_DEBUG_PORT=9222 npm start`，`electron/shot.cjs` 截圖：boot 開場／選單+簡報卡（新字型+打字機）／rail1 HUD／wipe 轉場／解碼 scramble／窄視窗 holding。
5. **用戶檢查點**（spec §5 五問）＋順便補 **Phase B 檢查點 5 問**（一直 pending）＋首部曲敘事分支試玩（另一分支）。

## 3. Electron 眼驗清單（雙審累積，供用戶對味時逐項看）

- **解碼招牌時刻 6 顆旋鈕**（C7 品質審，都是旋鈕不是重寫）：
  1. churn 頻率：現在 60Hz 每幀全區重擲＝白噪閃爍；經典 hacker-text 是 15-25Hz 節流（加 tick timer 每 50-66ms 重擲一次）——**最值得先試**；
  2. duration 1.4s → 甜蜜點可能在 1.8-2.5s＋ease-out（尾段減速落地感）；建議呼叫端顯式傳 duration 讓旋鈕可見；
  3. `.converging` 整行 2Hz 閃爍疊在 churn 上會不會像「CRT 壞了」；替代＝鎖定前緣放亮色掃描頭（新碼，對味後再做）；
  4. clue payoff 文案現在是瞬間 pop——可共用 typewriter 或 onDone 後 fade；
  5. ok 點亮是純 CSS text-shadow（DOM 不過 bloom）——不夠炸就加一次性進場 keyframe（短暫 scale/亮度 flash）;
  6. 音效 sting 需要 `onReveal` 回呼（onSolve 太早）——M3 不必做，先記。
- **字型**：700 字重只有 faux-bold（子集只 pin 了 400）——HUD SCORE/字卡看起來糊不糊；糊就子集加 700 instance 或 `font-synthesis-weight:none`。
- **字卡打字時垂直重心跳動**：#overlay 是 flex 置中、p 邊打邊長高 → 整卡上移半行；英文卡 4-5 行可能像抖動。便宜修法＝預量高度設 min-height 或改 top-align。
- **Phase B 5 問**（還沒驗）：天空同調／遠樓淡出／巷弄調性／harbor 海港感／整體電影感。

## 4. 質感提升方向（M3 之後，優先序建議）

1. **Milestone E：sprite 內容升質**——style bible、多角度 sheet、動畫。這是剩下最大的視覺短板（現在敵人是單張 billboard、主角無形象）；Awwwards 評審看的「craft 密度」主要缺口在這。走既有內容分工：Claude 產候選、用戶拍板（見 CLAUDE.md 內容創作分工）。
2. **B5 可選點綴**（spec §4.5）：harbor 真水面＋碼頭結構（rail2boss 的「海港感」大概率靠這個才過）、吊掛招牌/橫幅/電線、塵霧粒子。資料驅動 cheap quads。
3. **音效/音樂里程碑**（完全未動）：解碼 sting、槍聲/環境底噪、選單琥珀 UI 音。流程＝Claude 依描述挑候選、用戶聽了拍板。
4. **耐玩度軸**：軌道段戰鬥太稀疏（已立 chip 另案 brainstorm）——視覺收完後做，這決定「好玩」而不只「好看」。
5. **Phase A 可選**：A4 PS1 jitter（旗標已在、預設 OFF，Electron 對味決定開不開）、A5 LUT 手調 .cube。
6. **送件前必補**（spec §8）：完整 F 觸控瞄準＋裝置分級；LCP<1.5s 與 60fps p95<16.6ms 實測（參考機 integrated-GPU 筆電 @1080p）；公開站 meta/OG/favicon 第一印象順手補。
7. **劇情線**：首部曲敘事分支試玩對味 → 合併 → 二三部曲（1996／當代，弧線已定案於 ROADMAP）。

## 5. 合併順序與坑（重要）

- **darkline.js 衝突變大了**：Phase C 改寫了 showOverlay（打字機）、加了 advanceSegment（轉場）、boot 接線——敘事分支也動 darkline.js。建議：**Phase C 收完、m3 分支合回 main 之後**，再把敘事分支 rebase/merge 上來手解 darkline.js（locales 是純新增好解）。
- **敘事分支合併時 tofu guard 必紅**（新文案新字）→ `npm run fonts:build` 重生子集即可，這是設計內行為。
- **敘事分支的 i18n-keyalign 測試與 C9 的同路徑**——任取一版。
- OneDrive 坑照舊：worktree 刪不動用 `rm -rf`；preview 隱藏視窗 rAF 凍結，視覺驗證一律 Electron CDP（`electron/README.md`）。

## 6. 流程備忘（本次試跑的觀察）

- **subagent-driven＋spec/quality 雙審有效**：抓到 3 個真問題（clip-path 吃掉 glow、wipe 競態、Esc 錯過 clue）＋多次 mutation/行為推演驗證，全是 plan 作者盲點。建議保留雙審至少到 M3 收完。
- 成本參考：每 task 含雙審約 15-20 萬 tokens。要省：機械性 task 可降單審，craft 判斷類（如 C7）留雙審。
- Plan 檔是權威：發現 plan 本身的錯（CSS bug、註解自相矛盾）要連 plan 一起修，不能只修 code。
