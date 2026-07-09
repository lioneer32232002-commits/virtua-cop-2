# 交接紀錄：Milestone E3 — 敵人開火 tell（舉槍預警）動畫上線（2026-07-07）

> 最新接續點。先讀 `CLAUDE.md` → `docs/ops/00-INDEX.md` → `docs/DARKLINE-STYLE-BIBLE.md` → 本檔。
> 由 Opus 4.8 session 收尾。狀態以 repo 為準、已 push。**工作在分支 `feat/milestone-e-art`（未併 main）**。
> 承上一份：`docs/HANDOFF-2026-07-05-milestone-e-art-started.md`（E0 定調＋E1 內勤科 idle sprite）。

## 1. 這個 session 做了什麼

承 07-05 交接 §3 用戶掛著的設計題「特工都固定站著嗎？開槍沒姿勢嗎？」。用戶掌舵定 **(a) 開火格證管線**（先把內勤科做出「舉槍→擊發」的垂直切片，打通動畫管線再擴），本 session 完整落地並自驗。

**成果＝敵人進射程不再瞬殺，先舉槍 0.5s（可見 tell）才擊發**——把 VC2「敵人舉槍你才反應」的手感基因植回自由段。5 個 commit：

| commit | 內容 |
|---|---|
| `ced3dbe` | `stepAI` wind-up 狀態機（純函式 TDD，+5 測）＋接線（`BillboardSprite` 讀 `sheet.rows`、`faceFrame` 吃 `aiming?1:0`）。開關 off、向後相容 |
| `8873f7e` | 內勤科「舉槍」image-gen prompt 入定調 doc §4 |
| `d36e3fc` | `tools/sprite-pipeline/compose-sheet.mjs`——共用縮放＋對齊腳底疊 N-frame sheet |
| `7ff5012` | selective bloom（敵 sprite 不吃 bloom，`SelectiveBloomEffect` inverted） |
| `599af0c` | 落地 128×256 2-row sheet（row0 idle / row1 舉槍）＋翻開關 `sheet:{rows:2}`＋`ai.windup:0.5` |

**測試 318/318 綠**（+5 wanderai wind-up）。全程 Electron CDP 實測（preview 凍 rAF 不能用）。

## 2. 技術重點（別重踩）

- **wind-up 邏輯**（`game/src/darkline/free/WanderAI.js`）：進射程且冷卻好→設 `windup=cfg.windup` 進「舉槍」態站定倒數→歸零才 `fired`。回傳加 `windup/aiming`。**`cfg.windup` 未設（=0）＝退回舊即時開火**（向後相容，VC2 舊 mission 不受影響）。舉起槍即承諾擊發（不因玩家跑出射程取消）。
- **sheet 疊法**（`compose-sheet.mjs`）：`process-sprite.mjs` 是各張按自己 bbox fit-contain→寬姿勢（舉槍手臂前伸）會被縮小＝切換跳大小。compose-sheet 改**單一共用縮放**（兩格同尺寸）＋**對齊腳底**（站姿基線）＋**以站姿中心水平對齊**（避免手臂把 bbox 中心拉歪）。實測兩格都 →112px、無跳動。
- **selective bloom**（`game/src/render/postfx.js` + `Renderer.js`）：`SelectiveBloomEffect(scene,camera,{...})` 設 `inverted=true`＝selection 內物件**不吃** bloom、其餘照 bloom。`createCinematicComposer` 回傳 `{composer, bloomSelection}`（原本只回 composer，Renderer 已同步改）。`Renderer.excludeFromBloom(obj)`/`clearBloomExclusions()`（非 cinematic 模式 no-op）。`enterFree` 每次進段先 clear 再把每隻敵 sprite 註冊進去。**空 selection＝全部照 bloom（menu/rail 安全預設）**。API 用 `bloom.getSelection()`（`.selection` getter 不在 proto）。

## 3. 白斑：修到哪、還剩什麼（用戶直接質疑過，這裡講清楚）

E1 idle 時踩過白斑坑（交接 07-05 §2）；這次舉槍格又中，**逐層拆解＋Electron CDP 實測**：

1. **舉槍首版（glossy）滿身白斑** → 根因＝素材非-matte（皺褶高光/白襯衫袖口/槍反光），量化到 24 色散成白點。**用戶重生「STRICT MATTE」版**（prompt 加硬：全身純近黑平塗、零高光、袖口不露白、槍啞光）根治素材端。實測貼圖 `agent.png` row1 **L>160 像素＝0**（掃描 `tools/sprite-pipeline` 一次性 node script）。
2. **重生版 bloom ON 又浮白斑** → 是 bloom（門檻 0.62）把殘餘中亮像素放大。**做 selective bloom** 修掉這層。
3. **殘留（backlog，用戶 2026-07-07 判排 backlog）**：關 bloom+noise 後仍有 **(a) 全屏底片顆粒** `NoiseEffect`（opacity 0.055）灑在近黑西裝上最顯、**(b) 中山裝領口一小撮偏亮像素**（L 120–160、跟臉同級，量化成淺點）。**兩者都非「滿身白斑」、屬正常 boomer-shooter 顆粒範圍**，貼圖無真白斑。若要清：compose-sheet 加「非臉中亮像素 roll-off」（保護暖膚色）清領口；noise 全域調低要單獨評估（動整體調性）。

> 教訓（已寫進定調 §4）：**動作/舉槍 pose 的生圖天生愛加戲劇光**，matte 三條要比 idle 版壓更用力。素材端 vs bloom 端 vs 全屏顆粒是**三種不同的白點**，別混為一談、別拿 bloom 版跟素材版比就喊「乾淨」（我犯過，用戶抓包）。

## 4. 下一步（用戶掌舵，優先序建議）

- **🎮 windup 0.5s 手感＝用戶對味（唯一沒驗的）**：我只驗 forced frame，反應窗口夠不夠、tell 醒不醒目要**實玩**判。reload Electron 進 free 段，看敵人開火前有沒有明顯舉槍。改 `first-island-chain.js` 的 `ai.windup` 一個數字即可（太長敵人像卡住、太短反應不及）。
- **backlog：殘留白點**（全屏顆粒＋領口）——見 §3，用戶已判排後。
- **backlog：rail 段敵 sprite** 也可套 `excludeFromBloom`（API 已通用，follow-up）。
- **E1 續生其餘陣營 idle**：北方滲透網（彈鼓）／將軍新軍（M1 鋼盔＋Garand）／街坊平民（旗袍女＋布衫男）。prompt 都在定調 §4（含 STRICT MATTE 守則）。流程：用戶生圖→丟 `game/public/m0/` 或 Downloads 給檔名→我 `process-sprite.mjs`（單張）或之後也做開火格就 `compose-sheet.mjs`→CDP 驗→對味→commit。
- **E3 續**：走路循環（治「立繪滑行」）／中彈／繳械格；多角度 sheet（E2，free pointerlock 繞背用）。管線都已備（compose-sheet 支援 N-frame、`BillboardSprite` cols=視角/rows=動畫）。
- **併分支**：`feat/milestone-e-art` 這條線（E0/E1/E3）是乾淨收尾點，可考慮併回 main（另有 07-03 `integrate/first-act-on-m3` 首部曲敘事也還等併）。

## 5. 跑法／驗證備忘（這次踩過的坑）

- **視覺驗證走 Electron CDP**（preview 凍 rAF）：`cd game && PORT=5180 npm run dev`（背景）→ `cd electron && DARKLINE_DEBUG_PORT=9222 DARKLINE_PORT=5180 npm start`（背景，polling `curl localhost:9222/json/version` 等 ready）→ `DARKLINE_DEBUG_PORT=9222 node electron/shot.cjs <out.png> <waitMs> "<evalExpr>"`。`window.__dl` 暴露 `seq/renderer/free`（free 含 controller/enemies/bullets）。
- **⚠️ 連續 `seq.jumpTo('free')` 會累積敵 sprite**：`enterFree` 每次呼叫都新增一組敵人到 scene 不清舊的→多次跳段會殘影重疊（純驗證副作用，實玩只進一次）。乾淨截圖前先 `location.reload()`。
- **改 sprite 檔後遊戲沒更新＝texture HTTP 快取**：`location.reload()` 或重開 Electron 才載新圖。
- **驗證 evalExpr 範式**：`jumpTo('free')`→`setTimeout(2600)` 等 enterFree loadImage→`free.controller.detach()`（停相機）→`free.enemies.forEach(en=>{en.alive=false;en.bb.sprite.visible=false})`（凍住免 loop 覆寫格）→擺兩隻 `setCell(0,0)`/`setCell(0,1)` 對照→相機擺前方 `lookAt`→`free.bullets.clear()`。關特定 effect：`composer.passes.flatMap(p=>p.effects||[])` 找 `BloomEffect`/`NoiseEffect`（`blendMode.opacity.value=0`）/`ChromaticAberrationEffect`（`offset.set(0,0)`）。
- **⚠️ 共用視窗**：用戶會直接玩那個 Electron 視窗。CDP 截圖（跳段/detach/擺鏡頭）會打斷他玩；驗證前先確認視窗沒人玩。本 session 尾我開的 debug Electron（bg task `bm7kqae8f`）可能還在跑，用戶要玩自己 reload 即乾淨。
- raw 原圖 gitignored 在 `game/public/m0/`（`agent.png` idle raw、`agent-aim.png` 舉槍 raw）。改文案觸發 tofu guard 才需 `npm run fonts:build`（本 session 未動字）。
