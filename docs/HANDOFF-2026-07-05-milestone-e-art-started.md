# 交接紀錄：Milestone E 美術內容啟動 — E0 定調＋E1 內勤科 sprite 定案（2026-07-05）

> 最新接續點。先讀 `CLAUDE.md` → `docs/ops/00-INDEX.md` → `docs/DARKLINE-STYLE-BIBLE.md` → 本檔。
> 由 Opus 4.8 session 收尾。狀態以 repo 為準、已 push。**工作在分支 `feat/milestone-e-art`（未併 main）**。

## 1. 這個 session 做了什麼

用戶掌舵選了 **Milestone E（authored 美術）** 當下一步（交接 07-03 §5 的最大槓桿：改掉「幾何佔位感」）。走內容協作分工（Claude 產候選、用戶判對味）。

- **E0 視覺定調＝用戶對味通過**（commit `e7cdc92`）。四陣營靠**帽型＋武器剪影**一眼分敵我，扛核心主題「你怕的敵人拿衝鋒槍，真正做掉你的人拿一把藏在西裝裡的左輪」。定稿入口：`docs/DARKLINE-M-E-美術定調-E0.md`（含四陣營剪影表、調色 accent、image-gen prompt 模板、管線指令、E0–E4 分期、時代錯置守則）。
- **E1 內勤科 sprite 定案**（commit `1108492`）。`game/public/darkline/sprites/agent.png`（呢帽＋matte 中山裝＋藏左輪），接進 free 段當敵人（取代 `enemy3.png` 佔位）。已 Electron CDP 近＋遠距離自驗。**313/313 綠。**

## 2. E1 的關鍵教訓（已寫進定調 §4，別重蹈）

- **第一版（西式西裝）撞白斑**：西裝皺褶的白高光/rim-light 像素，被 128px NearestFilter 放大 ＋ ACES tonemap／bloom（門檻 `luminanceThreshold: 0.62`，`render/cinematicConfig.js`）在近距離放大成**滿身白斑**。實測關 bloom 白斑仍在→非單純 bloom，是「亮高光像素本身」。管線壓亮度（clamp）因 tonemap 難精準、治標無效。
- **正解＝重生 matte 原圖**：prompt 加「matte 平塗／無 rim light／無地面陰影」三條（現為共用前綴**硬性守則**）。第二版 matte 中山裝白斑根治，且**無地面陰影→腿間殘留問題自然消失**，標準 `tools/sprite-pipeline` 直出即可（不需 clamp/腿間清理 hack）。
- **殘留小問題**：臉（全圖最亮區）近距離仍微 bloom 成暖光團。屬所有 sprite 共通，**留待 selective-bloom（讓敵 sprite 不吃 bloom）統一解**，不逐張硬壓臉。

## 3. 用戶交代「明天再聊」的設計問題：敵人動畫／開槍姿勢

> 用戶原話：「特工都是一樣這樣固定不動嗎？雖然說會開槍，但開槍時沒姿勢嗎？」——要我先想、記錄，明天續聊。

**現狀盤點**：
- free 段敵人＝**單張 billboard**（`BillboardSprite` cols=1, rows=1）。WanderAI 讓它移動/靠近（sprite 平移），但視覺上永遠同一張**站姿立繪**；開槍時 `BulletField` 發彈丸，**sprite 不變**（無舉槍/開火姿勢）。
- 架構**已預留** sprite sheet：`BillboardSprite` 的 cols=視角方向、rows=動畫格，`frameUV/setCell/faceFrame` 都在，只差資產（多姿勢/多角度圖）。這正是 **Milestone E3 動畫** 範疇。

**升級路徑（我的思考，明天定深度）**：
- **(a) 最小可玩＝加「開火格」**：rows=2（idle＋舉槍開火），敵人開火前切舉槍當 **tell**（呼應 VC2「敵人舉槍預警」的手感基因，耐玩度槓桿高、成本低）。**建議優先**。
- **(b) 單角度全動畫**：idle／走路循環（治「立繪滑行」）／開火／中彈／繳械（justice shot）。
- **(c) 多角度（cols）**：free 段 pointerlock 玩家會繞到側背，單一正面 billboard 從側看會「紙片轉向」穿幫→需 E2 前/側/背 sheet。工較大。
- **生圖策略**：同角色多姿勢/多角度圖 → 同管線 → 拼 sprite sheet（rows/cols）→ `setCell` 切格。
- **節奏取捨（待用戶定）**：先把五陣營正面 billboard 生齊（E1 續）再回頭做動畫（E3）？還是先把內勤科做成「有開火格的垂直切片」證明動畫管線再擴？我傾向「開火格」因其 gameplay 價值，可與生齊陣營並行。

## 4. 下一步（用戶掌舵，優先序建議）

- **明天先聊 §3 動畫方向**（用戶指定），定 E3 深度與節奏。
- **E1 續生其餘陣營**：北方滲透網（彈鼓）／將軍新軍（M1 鋼盔＋Garand）／街坊平民（旗袍女＋布衫男）。prompt 都在定調 §4（已含 matte/無陰影硬性守則）。流程：用戶用 prompt 生圖 → 丟 `game/public/m0/`（或 Downloads，跟我說檔名）→ 我 `tools/sprite-pipeline` 處理 → 驗證 → 對味 → commit。
- **selective-bloom**（敵 sprite 不吃 bloom）解臉微亮：獨立技術任務，跟 §3 動畫可排先後。
- 定調 OK 後把 `feat/milestone-e-art` 併回 main（另有 07-03 的 `integrate/first-act-on-m3` 首部曲敘事也還在等併，見 `docs/HANDOFF-2026-07-03-*`）。

## 5. 跑法／驗證備忘（這次踩過的坑）

- 視覺驗證走 Electron CDP（preview 凍 rAF）：`cd game && PORT=5180 npm run dev`（背景）→ `cd electron && DARKLINE_PORT=5180 DARKLINE_DEBUG_PORT=9222 npm start`（背景，等 CDP 9222 ready）→ `node electron/shot.cjs <out.png> <waitMs> "<evalExpr>"`。
- **看 free 段敵 sprite 要下重手**：敵人預設不可見（要玩家推進才現/或距離啟動）、且相機被 free controller 每幀控。驗證 evalExpr 範式：`seq.jumpTo('free')` → `setTimeout` 內 `free.controller.detach()`＋`enemies.forEach(e=>e.bb.sprite.visible=true)`＋把 `renderer.camera` 擺到 `enemies[i].bb.sprite.position` 前方 `lookAt` 它＋`free.bullets.clear()`（免玩家挨打觸發任務失敗）。動態關 bloom：`renderer.composer.passes[1].effects` 找 `BloomEffect` 設 `intensity=0`。
- **改 sprite 檔後遊戲沒更新**＝texture 快取：`enterFree` 只 `loadImage` 一次；`location.reload()` 或重開 Electron 才會載新圖。
- **⚠️ 共用視窗協調**：用戶會直接玩那個 Electron 視窗。我 CDP 截圖（拉鏡頭/跳段/detach）會打斷他玩，他玩也會讓我截到非預期畫面（SCORE 變動、跳到劇情卡都可能是他在玩）。要驗證時先跟用戶確認視窗沒人玩。
- **正面回饋（記）**：用戶實玩說「開槍變好順暢」（我沒動射擊手感，是既有手感在真實視窗跑順）。
- raw 原圖 gitignored 在 `game/public/m0/`；改文案觸發 tofu guard 才需 `npm run fonts:build`（這 session 未動字）。
