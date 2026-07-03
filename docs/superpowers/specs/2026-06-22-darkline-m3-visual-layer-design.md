# DARKLINE M3 視覺外觀層 Design Spec（2026-06-22）

> 本作 =《暗線 / DARKLINE — First Island Chain》。**舊 Virtua Cop 2 復刻遊戲已於 2026-06-22 全面放棄、死殼將清除**，本專案全力發展暗線。
> 權威上游：[首部曲設計 spec](2026-06-15-darkline-first-island-chain-design.md)、ROADMAP「🏆 Awwwards-ready ＝ M3 視覺北極星」節。
> 本 spec 已過一輪對抗式審稿（4 critic 翻 code 實證，全 `minor-fixes`，findings 已併入）。

## 0. 定位與北極星

M3 把 M2 的「能玩 MVP」拉到**可參賽的精緻度**。北極星 = Awwwards（對標 Abeto《Messenger》：同 Three.js 棧、靠 craft＋優化贏、非擬真）。評分權重 **Design 40% / Usability 30% / Creativity 20% / Content 10%**，評審**先看手機**、破版直接淘汰；效能門檻 LCP <1.5s、持續 60fps、首載 <3MB。

本里程碑 = **視覺外觀層**，一個 spec、內分 4 個 Phase（D→A→B∥C），每 Phase 結尾一個 **Opus 檢查點 + 用戶 Electron 判對味**（沿用 M1/M2 節奏）。每個 Phase 可獨立 writing-plans / 執行。

**🌟 招牌時刻（hero moment，第一級 deliverable）**：把**解碼 set-piece**（凱撒轉盤 + 琥珀電報 + 掃描線/CRT + 「scramble 收斂成明文」解密動畫）做成那個會被截圖記住的招牌——它是遊戲的獨特機制，craft 集中砸在這一點（Awwwards 評審記的是一個 show-stopper，不是一疊通用 post-FX）。橫跨 Phase A（琥珀的 grade/bloom）與 Phase C（scramble 動畫），自己一條檢查點。

**核心鐵律（不可違反）**：
- **保住 keeper**：夕陽塊狀街景（`OriginalEnvironment.js` 的 unlit `shadedBox` + dusk palette + 亮窗）是用戶定案的視覺資產，所有升質**疊在它上面**，不打掉重建。
- **共用引擎一律保留**：暗線跑在原 VC2 鷹架演化來的引擎上（`Renderer`/`sky`/`unlit`/`OriginalEnvironment`/`EnemyManager`/`Enemy`/`Projectile`/`BossController`/`HUD`/`GameManager`/`CameraRig`/`WeaponViewModel`/`mergeStatic`…）。這些**是暗線的底層、不是 VC2**，保留並逐步去 VC2 命名語感。要刪的只有「VC2 復刻遊戲本體」。
- **TDD + 測試綠當安全網**：純邏輯先測；刪檔前先相依掃描（含 JSDoc 型別參照），測試綠保證沒誤刪暗線依賴。
- **資產紀律**：原圖 gitignored，只 commit 處理後小檔；登 `CREDITS.md`；字型限 OFL self-host；**首載體積有會 fail build 的硬上限**（§6）。

## 1. 範圍

**做（A+B+C+D）：**
- **D 公開入口修 + VC2 退役 + 資產紀律 + 首載體積守衛**
- **A 後處理電影感層**（EffectComposer + LUT/threshold-bloom/grain/vignette/CA + tone mapping）
- **B 氛圍 / 天空 / 場景**（dusk 天空、per-segment 霧、自由段巷弄升級、點綴）
- **C UI 諜報化 + 第一印象 + 最小 mobile holding-state**（OFL 字型、design token、HUD restyle、loading 開場、GSAP 轉場、解碼招牌時刻、手機持機畫面）

**不做（→ 後續里程碑 / 另案）：**
- **完整 F（觸控瞄準玩法 + 多層裝置分級）**：deferred。**但最小 mobile holding-state 已拉進 Phase C**（評審先看手機、破版即淘汰，不能讓公開 URL 露破版）。
- **E sprite 內容升質**（劇情角色 sprite / atlas / 動畫）：獨立內容創作分工里程碑，與本層並行或其後。
- 真 3D / PBR / 高解析貼圖路線（與風格化 2.5D 定位相違）。
- 第二/三部曲內容。

## 2. Phase D — 公開入口修 + VC2 退役 + 資產紀律

**目標**：repo 從此只剩暗線；公開 build 第一眼即真美術、無灰盒降級；首載體積守衛上線。

**做法：**
1. **相依掃描（Task 0，前置）**：建 import 圖譜，列出 `VC2-only`（可刪）vs `shared engine`（暗線依賴、保留）。**掃描含 JSDoc `import()` 型別參照，不只 ESM import**。高信心 VC2-only 刪除集：
   - `game/index.html`、`game/src/main.js`
   - `game/src/scene/StageEnvironment.js` — **但保留同目錄 sibling `game/src/scene/OriginalEnvironment.js`（＝keeper 街景 builder）。darkline.js 直接 `import { buildOriginalEnvironment }`，不經 StageEnvironment；StageEnvironment 反而 import OriginalEnvironment → 別被「同目錄/同被某檔 import」誤判成一起刪。**
   - `game/src/level/levels/stage{1,2,3}.json` + 僅服務這些的 level/camera loader（`CameraPathLoader`、camera.bin 處理）
   - `game/src/character/*`（`CharacterFactory.js`、`MotionData.js`——後者 fetch `assets/common/characters.json`）
   - spike/VC2-only HTML 頁：`game/m0.html`、`game/viewer.html`、`game/contact-sheet.html`、`game/motion-strip.html`、`game/m0-compare.html`（Task 0 確認均不被 `darkline.html` 觸及）
   - `game/src/darkline/m0/*` spike——**明列**：`m0/spike.js`、`m0/compare.js`、`m0/FreeRoamController.js`、`m0/latencyProbe.js` 等。**`game/src/darkline/free/`（`AlleyScene.js`、`FreeRoamController.js`）＝KEPT、Phase B 依賴**（注意：`FreeRoamController` 在 `m0/` 與 `free/` 各有一支，canonical = `free/`，別誤刪）。
   - `tools/extract-stage-assets/`（SEGA GLB/相機/角色/音訊/MOT 提取逆向）、gitignored `game/public/assets/`
2. **刪除 VC2 死殼** + 從 `vite.config.js` 移除 `main`/`m0` rollup 輸入，只留 `darkline.html`，並讓它服務於 `/`（公開站首頁 = 暗線；確認 `wrangler.toml` 的 `/` 解析指向它）。
3. **刪檔後清 dangling 參照**：`game/src/gameplay/EnemyManager.js:106` 的 `@type {import('../scene/StageEnvironment.js')...}` 改結構型/移除；`sky.js`/`unlit.js`/`mergeStatic.js` 內提到 StageEnvironment 的過時註解清掉。（純型別/註解、不影響 runtime，但要清，guard 才真能斷言「無 dangling」。）
4. **清資產漏洞**：`git rm` 整個 `game/public/m0/` 目錄（m0 spike 一併刪，含誤入版控的 4.75MB `enemy.png`——它是 rule 前就 commit 才被追蹤；既有 `.gitignore:68 /game/public/m0/*.png` glob 已涵蓋、**無需改 glob**）。
5. **丟棄孤兒改動**：工作區未提交的 `stage2/3.json`、`electron/package-lock.json` 直接 `git` 捨棄。**StageEnvironment.js 的 void-floor 工作改動隨整檔刪除而 moot，不需另外處理。**
6. **guard 測試（兩條）**：①**路徑** — 斷言暗線頁只引用 `/darkline/`、不依賴 gitignored `/assets/`；②**首載體積** — build 後計首載 gzip（JS+CSS+字型+LUT+初始 sprite），**超過硬上限（建議 1.5MB，留 <3MB headroom）即 fail**（見 §6）。
7. **命名去 VC2**（低優先、漸進）：保留的共用引擎檔名/註解逐步去 VC2 語感；功能性移除為主，改名不阻塞。

**測試**：相依掃描後全套 `npm test` 綠（刪 VC2-only 測試、保留並通過引擎測試）；新增兩條 guard；`npm run build` 產出僅暗線、無 `/assets/` 依賴、首載過體積守衛。

**Phase D 檢查點**：① `npm run build` 後本機開 `dist`（或 CI 部署）第一眼 = 暗線真美術、無灰盒；②測試綠、repo 無 SEGA 資產依賴、無 dangling 參照；③首載體積守衛通過。

## 3. Phase A — 後處理電影感層

**目標**：把 keeper 街景一口氣拉到電影感，但保留塊狀平塗手感；60fps。

**做法：**
1. **加 dep + `EffectComposer`**：`Renderer.js` 加 composer。**確定走 `pmndrs/postprocessing`（npm `postprocessing`，pin `^6.37.0`——相容 three 0.168；6.36.0 排除 168）**：它的合併 `EffectPass`（多效果合進單次全螢幕 draw）與 `BloomEffect`/`SelectiveBloom` 是 three `examples/jsm` 沒有的（jsm 只有 EffectComposer/UnrealBloom/SMAA/OutputPass）。計入 §6 預算。VC2 已死 → **不需「保護 VC2」的旗標體操**；保留輕量 `quality` 選項供日後裝置分級（非為 VC2）。
2. **合併單一 `EffectPass`**：**LUT 色彩分級**（暖琥珀-noir 夕陽調，全場 mood 單一旋鈕，呼應電報琥珀；由中性 identity strip 調出，存 `/darkline/`，數 KB）+ **vignette** + **film grain**（動畫噪點，藏平塗 banding）+ **subtle chromatic aberration**（<1.5px CRT 味；過強反扣 Usability）。
3. **Bloom = 亮度門檻**（pmndrs `BloomEffect` 的 `luminanceThreshold`，**非按物件選**）：亮窗 / 路燈 / 槍口火光 / 解碼琥珀本就超過亮度門檻 → 自然只有亮處發光。**這解掉原寫法的坑**：所有窗格（亮+暗）烤進單一合併 `windows` mesh（`OriginalEnvironment.js:185-190`），按物件選的 selective bloom 選不出亮窗。bloom 半解析度跑。
4. **tone mapping**：`NoToneMapping` → 輕度 `ACESFilmic`/`AgX` + 調 `toneMappingExposure`，**gentle、不洗白**，保塊狀平塗。
5. **效能**：`setPixelRatio(Math.min(devicePixelRatio, 2))`（此 clamp 即 Phase C 手機 holding-state 要的那一行，真落地）；composer 後 canvas MSAA 失效 → 加 SMAA。
6. **🔶 PS1 低解析 + vertex jitter（實驗旗標）**：低解析 RT + `onBeforeCompile` 注入 `gl_Position` 量化。又快又賺 Creativity 分，但可能與 keeper 手感衝突。**shipped 預設 OFF、讀自 `quality`/render 選項**；若 Electron 對味，轉預設 ON 是一行 follow-up → **Phase A 不因此裁決卡住**（D→A→B 順序不 stall）。sprite 為 billboard 不吃 jitter（只作用 3D 環境）。

**測試**：純邏輯/設定可單元測（composer 建構、`EffectPass` 順序、pixelRatio clamp、quality/PS1 旗標切換、bloom 門檻設定）。**視覺對味 = 用戶 Electron 判**（隱藏視窗 rAF 凍、後處理只能本機真視窗驗，`electron/shot.cjs` CDP 截圖，見 [[project-vc2-env-gotchas]]）。

**Phase A 檢查點**：①夕陽街景有光暈/grade/grain 的電影感、但仍是塊狀調（沒被洗白/糊掉）；②**60fps**＝參考機 integrated-GPU 筆電 @1080p、`devicePixelRatio` clamp ≤2，量測 frame-time p95 < 16.6ms 持續 30s；③PS1 jitter 對味嗎（留 ON / 維持 OFF）；④槍火/燈/琥珀 bloom 份量對嗎。

## 4. Phase B — 氛圍 / 天空 / 場景（吃 A 的 bloom）

**目標**：天空與街景同調；自由段不再像 debug 盒；氛圍有層次。

**做法：**
1. **`sky.js` 參數化 + dusk 天空**：給暗線專屬 dusk 天空（暖橘地平線 → 深藍頂，dome fragment 加暖地平帶/sun-glow 項），換掉現與暖街景打架的日景藍（`SKY_TOP 0x4a78b0`/`SKY_HORIZON 0x9fbcd8`）。新增 `sky.js` `setAtmosphere(scene, params)` 匯出供**單呼叫 per-segment 重新著色**（feasible 不需 fork Renderer——`m0/spike.js:23-26` 已示範 ctor 後 mutate `scene.fog`）。**per-segment 霧色**：taipei 暖霾 / harbor 冷海霾。
2. **🛡 keeper 護欄（必做）**：keeper 街景遠樓的淡出是對**舊** `SKY_HORIZON 0x9fbcd8` 校的（`OriginalEnvironment.js:30-31` 註解）。retune 天空/霧後，**重驗遠樓 + backdrop 仍乾淨溶進新 dusk 地平線（無硬邊/banding seam），必要時重調 `FOG_NEAR`/`FOG_FAR`**。屬 keeper 調校、非重建。
3. **抽共用模組**：`shadedBox`/`pushWindows`/`streetlight` 目前是 `OriginalEnvironment.js` module-private（`:51/:77/:108`），抽成共用匯出模組，給 OriginalEnvironment 與 AlleyScene **drop-in 共用**。
4. **自由段巷弄升級到 keeper 詞彙**（`free/AlleyScene.js`，目前全場最醜的平板盒）：改用上述 `shadedBox` 面分色 + 亮窗 + 路燈 + 封閉 backdrop，拉到與軌道街景同調。
5. **場景點綴**（資料驅動、cheap quads、per-preset）：吊掛招牌/橫幅/雨棚/電線、塵霧粒子層、`HARBOR_PRESET` 真水面 + 碼頭結構，呼應琥珀霓虹點綴（與 `#e8c87a` UI motif 連動）。

**測試**：sky 參數/`setAtmosphere` 純函式測（顏色/霧 near-far 依 preset）；抽出的 `shadedBox` 等模組單元測；`AlleyScene` builder 測（含新 shaded/窗/燈節點）；落地/raycast 不回歸。視覺對味 = Electron 判。

**Phase B 檢查點**：①天空/霧與夕陽街景同調、**keeper 遠樓仍乾淨溶入新地平線**；②自由段巷弄拉到 keeper 調性了嗎；③點綴（招牌/塵霧/水面）份量對嗎、不雜亂。

## 5. Phase C — UI 諜報化 + 第一印象（純前端，多數可與 A/B 並行）

**目標**：全 UI 收斂成一套諜報軍情語言；有 boot 開場；轉場有電影編排感；手機第一畫面 intentional 非破版。

**做法：**
1. **OFL 字型 self-host**（無 Google CDN，Electron 離線可用）：電報/打字機 Latin（建議 Special Elite 或 Cutive Mono，woff2 ≤40KB）+ 思源黑/宋 CJK 子集（≤300KB），統一 `#overlay`/`#decode`/HUD，取代現用 `Courier New`/`system-ui`/`Arial Black` 三家。`font-display:swap` + fallback。登 `CREDITS.md`。
   - **CJK 子集策略**：glyph allow-list **從 locale/card 檔產生**（隨文案動，今 662 unique CJK glyphs）+ 測試「每個 user-facing glyph 都在子集內」（文案長新字即抓 tofu，順便 de-risk 與 `feat/first-act-narrative` 合併）。
2. **CSS design token 層**（`darkline.html` `:root` `--amber`/`--amber-bright`/`--intel-bg`/`--scanline`/`--ease`/`--dur`/`--glow`）；`HUD.js` 注入樣式 + `#menu`/`#overlay`/`#decode` 全改吃 token。**今 HUD 金 `#ffe000/#ff8800` 與 overlay 琥珀 `#e8c87a/#f4e2b0` 實際打架** → token 統一成琥珀。
3. **HUD restyle 到琥珀電報語言**：丟 `Arial Black` 字卡 → tracked amber telegraph caps；`★/☆` 星命 → dossier/clearance 徽記；彈匣/lock 圈 → 琥珀-紅情報配色。**`#crosshair.hit` hit-flash 是 LIVE**（`HUD.js:275` 加 `.hit`、`:278` 移除）→ **restyle 成琥珀/紅、不是刪**；要修的是 `HUD.js:118-121` 那段 target `.ring`/pseudo 在 darkline 簡單圓形 crosshair 上不存在的 selector mismatch（補 ring 結構或簡化為直接重上色）。
4. **loading 開場（boot sequence）+ LCP 策略**：boot 標題/電報框**用 inline CSS/系統字 fallback 立刻畫（LCP = boot 文字 <1s）**；**真 `THREE.LoadingManager` 進度在其下跑、不阻 first paint**（今無 LoadingManager，greenfield）；`font-display:swap` 讓慢字型不拖 LCP → 溶進選單。
5. **GSAP 轉場編排**（GSAP ~25KB，self-host）：段落間（briefing→rail1、free→rail2）琥珀 wipe + 掃描線（蓋凍結末幀）；`#overlay` 真打字機逐字揭示 + 閃爍游標；掃描線飄移/偶爾閃爍。**解碼揭曉做「scramble 收斂成明文」解密動畫＝§0 招牌時刻**，集中砸 craft、自己一條檢查點。
6. **最小 mobile holding-state（拉進 C）**：①designed 直向持機畫面（「best on desktop / 轉橫向」，琥珀電報語言）讓手機第一畫面 intentional；②`<meta viewport>` + Phase A 的 `setPixelRatio(min(dpr,2))` 真落地；③guard 測試斷言 breakpoint 以下渲染 holding-state。完整觸控瞄準/裝置分級仍 deferred（F）。
7. **新 i18n 鍵**（boot/loading/手機 holding 文案）→ 同步 zh/en，維持鍵對齊守衛。

**測試**：jsdom 測 token 套用、HUD DOM restyle、loading 狀態機、mobile holding-state breakpoint、glyph allow-list、i18n 鍵對齊；GSAP 時間軸以可注入 clock / onComplete 釘樁驗（不靠真實時間）。視覺對味 = Electron 判。

**Phase C 檢查點**：①全 UI 一套諜報語言、HUD 不再街機佔位；②字型對味（電報感、中英協調、無 tofu）；③boot 開場 + loading 體驗（LCP<1.5s）；④**解碼招牌時刻**夠不夠「被記住」；⑤手機第一畫面 intentional 非破版。

## 6. 跨段事項 — 資產預算（有強制力）

- **首載硬上限**：Phase D guard 把預算變成 build assertion——首載（JS+CSS+字型+LUT+初始 sprite）gzip **超過 1.5MB 即 fail**（留 <3MB headroom 給日後）。
- **per-asset 預算表**：

  | 資產 | 上限（gzip） | 備註 |
  |---|---|---|
  | JS baseline（three+引擎+darkline） | ~185KB（現況） | 量測基線 |
  | pmndrs `postprocessing` delta | 量測後填（~50–100KB min+gz，tree-shake） | Phase A 加 |
  | GSAP | ~25KB | Phase C 加，self-host |
  | LUT（.cube/png） | ≤16KB | Phase A |
  | Latin 字型 woff2 | ≤40KB | Phase C |
  | CJK 子集（思源） | ≤300KB | glyph allow-list 產生，最大變數 |
  | keeper sprite | ~24KB（現況） | — |

- **i18n / 字型耦合**：CJK 子集走 glyph allow-list（§5.1），文案長新字必更新子集，測試把關。
- **手機（F）out-of-scope 但已預留**：A 的 pixelRatio clamp 落地 + C 的 holding-state；完整觸控/裝置分級送件前才補。
- **驗證環境**：後處理/視覺一律本機 Electron 真視窗驗（`electron/README.md` + `shot.cjs` CDP）；隱藏 preview rAF 凍、走 DOM-eval（見 [[project-vc2-env-gotchas]]）。

## 7. 相依與風險

- **誤刪暗線依賴**（Phase D）：相依掃描（含 JSDoc）+ 測試綠為網；StageEnvironment vs OriginalEnvironment 兄弟檔已明示分割；不確定的檔保留待確認。
- **後處理拖慢/糊掉 keeper**（Phase A）：合併 EffectPass + 半解析 bloom + pixelRatio clamp 控成本；tone mapping gentle、PS1 預設關，Electron 對味把關。
- **dusk 天空動到 keeper 校準**（Phase B）：§4.2 護欄重驗遠樓淡出。
- **CJK 字型體積爆 3MB**：子集 + allow-list + 體積守衛三重把關。
- **B∥C 視覺耦合**：見 §9。
- **與第一幕敘事 branch 衝突**：M3 從 `main` 開新 branch，與 `feat/first-act-narrative`（待用戶 Electron 試玩→合併）獨立；重疊面小（C 動 `darkline.html`/`HUD.js`/`locales` 新鍵、敘事動 `locales`/`CARD_PAGES`），glyph allow-list 從 locale 產生反而幫對齊；合併時留意。

## 8. 驗收（對 spec §12 與 M3 北極星）

整輪：公開入口 = 暗線真美術（無 VC2 降級、首載過體積守衛）→ 後處理電影感（保 keeper、60fps p95<16.6ms）→ 天空/場景同調、keeper 遠樓乾淨溶入、巷弄升級 → UI 一套諜報語言 + boot 開場（LCP<1.5s）+ 轉場編排 + **解碼招牌時刻** → 手機第一畫面 intentional 非破版 → 中英可切無 tofu、測試綠 → 用戶 Electron 逐 Phase 判對味全過。完整觸控玩法（F）標記為送件前必補。

## 9. 執行流程

每 Phase：`writing-plans` 出計畫 → `subagent-driven-development`（每 task Opus 實作 + spec + quality 雙審）→ TDD + 逐 task commit → Phase 結尾 Opus 檢查點 + 用戶 Electron 判對味 → 過了進下一 Phase。順序 **D→A→(B∥C)**，新 branch 從 `main`。

> **B∥C 並行的細節**：C 的非視覺工（token / 字型 / HUD DOM / i18n / loading 狀態機 / mobile holding）可與 A 並行；但 **C 的轉場/掃描線/招牌時刻 polish（§5.5）要在 A 的 look 鎖定後再調**（它們合成在 A 改變的渲染畫面上），免得對著 pre-A 畫面白調一次。

## 10. Self-Review

- **審稿已過**：4 critic 翻 code 實證、全 `minor-fixes`、findings 全併入（selective bloom→門檻 bloom、mobile holding-state 入 C、招牌時刻、pmndrs pin、刪除集補全、keeper 天空護欄、dangling JSDoc、體積守衛、LCP 策略…）。
- **無 TBD/佔位**：4 Phase 各有目標/做法/檔案/測試/檢查點；pmndrs delta 體積標「量測後填」（執行時量）。out-of-scope 明列（完整 F/E/真3D/二三部曲）。
- **一致性**：keeper 鐵律貫穿（含 §4.2 天空護欄）；VC2「死殼刪／共用引擎留」界線 §0+§2 講清、兄弟檔明示分割。
- **範圍**：一 spec 4 Phase、每 Phase 可獨立 plan/執行（同 M2 precedent）；C 較大但內聚（一套諜報語言），plan 時再細分。
- **歧義**：PS1 = 實驗旗標 shipped OFF（明確）；命名去 VC2 = 低優先不阻塞（明確）；60fps/LCP 有具體參考機與量測。
