# VirtuaCop2 Handoff — 2026-06-11 (Session 6)

## 現在在哪裡

Three.js 重製版 Virtua Cop 2。本 session 完成**忠實度路線的第 1、2、4 項**：
unlit 渲染、回歸原版座標 + CAMMOV 運鏡、三關 GLB 全部提取。

⚠️ **改動尚未 commit**（用戶尚未決定），全部在 main 的 working tree 裡。
下次 session 第一件事：問用戶要不要 commit，或直接 `git diff` 確認後處理。

### 2026-06-11 現況快照
- ✅ 本機可跑：`cd game && npm run dev`（port 改為自動分配，見下）
- ✅ 測試：遊戲 `npm test` **60 全過**；提取器 `cd tools/extract-stage-assets && npm test` **14 全過**
- ✅ Unlit 渲染 + 原版座標 + CAMMOV 運鏡完成並驗證
- ✅ 資產：**三關各 5 個 GLB 全部提取完畢**（P_COMMON + P_STGxC + P_STGx0/1/2），camera.bin 已用修正後的 yaw 重新提取 ×3
- ⚠️ `game/public/assets/*` 為 gitignored，新 worktree 需從主目錄複製
- 📌 port 5173 被另一專案（battle_video）佔用 → launch.json 加了 `autoPort: true`、vite.config.js 讀 `process.env.PORT`，本次跑在 58191

---

## 忠實度診斷（本 session 確立的路線）

用戶反映「美術跟原版差遠了」。診斷出三個原因，按優先序排：

| # | 問題 | 狀態 |
|---|------|------|
| 1 | **渲染風格錯誤** — 原版 Model 2 無即時光照（明暗烤在貼圖裡），但專案用了 PBR + tone mapping + 多盞燈 | ✅ 已修（unlit） |
| 2 | **原版座標系被丟掉** — 場景縮放 60 單位、自創地板、CAMMOV 停用 | ✅ 已修（原版座標 + CAMMOV，yaw 修正 180°） |
| 3 | **角色是程序化替身** — P_COMMON.glb 其實是身體部件（頭/軀幹/四肢分開），原版用骨架 + MOT*.BIN 動作驅動 | ⬜ **下一步**，最大工程，可先做靜態組裝 |
| 4 | stage2/3 GLB 未提取 | ✅ 已修（extract.mjs 擴充三關，15 GLB 全出） |

新增已知課題（第 2 項做完後浮現）：
- **波次時間軸 vs 原版路徑長度**：CAMMOV stage1 全長 304 秒（9118 frames @30fps），但 stage1.json 的 duration=35s、只有 3 波 + boss——玩家只會走完路徑前 ~12%。原版敵人配置在 PG_STG1.DLL（jevarg RE 未解），中期可手工沿路徑加波次。
- 敵人 spawn 已改為「相機相對偏移 + raycast 落地」，JSON 維持小座標語意，曲線/CAMMOV 兩種模式通用。

**用戶在意 token 成本**（Fable 模型貴）：不開 multi-agent/workflow，直接改檔案 + 測試 + preview 驗證，單線作業。

---

## 本 session 改動（未 commit）

### 批次 2：原版座標 + CAMMOV（第 2、4 項）

- `game/src/scene/StageEnvironment.js` — **重寫**：載入該關全部 4 個場景 GLB 區塊（P_STGx0/1/2/xC，CAMMOV 路徑會穿越多個區塊）、**不縮放不置中**（原版世界座標直用）；自創 400×400 地板只在 fallback 模式出現；新增 `groundYAt(x, z, refY)`（向下 raycast 求街道高度）。
- `game/src/gameplay/EnemyManager.js` — 新增 `_resolveSpawnPosition()`：JSON 敵人座標改釋義為**相機相對偏移**（x=右、-z=前），spawn 時按相機 yaw 旋轉 + 平移到世界座標，再 raycast 落地（fallback：相機 y − 1.6 眼高）。無 camera 時（單元測試）維持絕對座標。
- `game/src/main.js` — 恢復 `loadCameraPath()`（CAMMOV frame mode）；`enemyMgr.environment = environment`；`window.__game` 加 THREE/renderer/cameraRig/environment。
- `game/src/render/Renderer.js` — far plane 500 → 3000（stage1 世界橫跨 ~1300 單位）。
- `tools/extract-stage-assets/lib/camera-reader.mjs` — **yaw 修正**：`-θ` → `π − θ`。X 鏡像下 yaw 應映射為 180°−θ；用「鏡頭面向 vs 行進方向」點積驗證（90 個取樣點 avg +0.8，舊值 −0.8 = 永遠面向後方）。pitch 不變（負 pitch=俯視，已用 raycast 幾何驗證）。
- `game/public/assets/*/camera.bin` — 用修正後 yaw 重新提取（stage1: 9118f / stage2: 10000f / stage3: 4200f @30fps）。
- `tools/extract-stage-assets/extract.mjs` — STAGE1_MODELS 寫死清單 → 三關 STAGE_MODELS 映射，輸出至 `<out>/stageN/`；15 個 GLB 全部提取成功。
- `tools/extract-stage-assets/test/camera-reader.test.mjs` — 斷言更新為新 yaw 慣例（14/14 過）。
- `.claude/launch.json` + `game/vite.config.js` — `autoPort: true` + vite 讀 `process.env.PORT`（5173 被別專案佔用）。

驗證：stage1 相機沿原版路徑行進、敵人 raycast 落在街道面（y=-10，與相機眼高一致）且在視線前方；stage2 同樣 4 區塊 + frame mode + 敵人貼地（y=-0.1）；四個路徑時間點（5/40/90/180s）畫面內容豐富多變（unique colors 1200–2000）。

### 批次 1：unlit 渲染（第 1 項）

主題：全面改 unlit，刪掉所有自創光照。

- `game/src/render/Renderer.js` — 刪 4 盞燈（ambient/hemi/key/fill）、tone mapping（改 NoToneMapping）、shadowMap、霧。保留天空色背景。
- `game/src/scene/StageEnvironment.js` — GLB 載入後 traverse 把 MeshStandardMaterial 換成 **MeshBasicMaterial**（保留 map/color/transparent/opacity/alphaTest/side，舊材質 dispose）；刪 `color.multiplyScalar(2.0)` 補亮 hack 和 shadow 旗標；fallback 與地板 plane 也改 Basic。
- `game/src/gameplay/EnemyModelLoader.js` — Lambert → Basic；新增 `shade()`，四肢用 0.65 深色（unlit 下沒有明暗，輪廓靠色差）。
- `game/src/gameplay/EnemyManager.js` — fallback 方塊材質 Lambert → Basic。
- `game/src/render/WeaponViewModel.js` — Standard → Basic，顏色微調亮（0x3a4049 / 0x4a382a）。
- `game/src/main.js` — `window.__game` debug 出口加 `renderer`、`cameraRig`（驗證 session 必需，見下方）。
- `game/tests/EnemyManager.test.js` — mock `MeshLambertMaterial` → `MeshBasicMaterial`。

**驗證證據**：60 測試全過；實跑掃描場景 3135 個材質全為 MeshBasicMaterial、2852 個帶貼圖；console 0 錯誤 0 警告；截圖確認貼圖直出。

---

## ⚠️ Preview 驗證的坑（本 session 踩出來的，下次直接照做）

Claude Preview 的瀏覽器視窗是**隱藏**的，後果：
1. `window.innerWidth` 初始為 0 → canvas 0×0。解法：eval `window.dispatchEvent(new Event('resize'))`。
2. **requestAnimationFrame 完全不跑** → 遊戲迴圈凍結、`preview_screenshot` 永遠 timeout、任何依賴 rAF 的 eval 也會 timeout。
3. `preview_click` 點 `#overlay` 會點到正中央的 Stage 按鈕（只選擇不開始）。開始遊戲用 eval 派發 Enter：
   `document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }))`

**正確驗證流程**（全部用 preview_eval，不用 screenshot）：
```js
// 1. 開始遊戲（派發 Enter），等幾秒讓 GLB 載完，確認 __game.gameMgr.state === 'playing'
// 2. 手動驅動一幀並擷取（同一個同步 task 內 drawImage 才拿得到 WebGL buffer）：
const g = window.__game; const r = g.renderer;
g.enemyMgr.spawnWave([{type:'grunt',position:[2,0,-8],hp:1}]); g.enemyMgr.update(2.0);
g.cameraRig?.advance(5); r.render();
const off = document.createElement('canvas'); off.width=640; off.height=360;
off.getContext('2d').drawImage(r.webgl.domElement,0,0,640,360);
window.__shot = off.toDataURL('image/jpeg',0.6).split(',')[1];
```
取回 base64 時**不要**用 eval 回傳值（會被靜默截斷，連 6000 字的 slice 都掉過 4% 字元）。
正解：**HTTP 接收器**——本機跑一個一次性 Node server（收 POST body 寫檔，CORS `*`，收到即關），
頁面端 `fetch('http://localhost:18877/', {method:'POST', body: b64})`。
範本在 `C:\Users\oneda\AppData\Local\Temp\shot_receiver.mjs`（不在 repo，遺失就照上述重寫，約 25 行）。
另：4-camera/多時間點對照圖可在頁面端把多次 render 畫進同一個 2×2 canvas 再一次 POST。
若 Read 圖片遇到 API「Could not process image」，可能是影像服務暫時故障（2026-06-11 發生過，連先前成功的圖都讀不了）——改用 PIL 數值分析（unique colors / edge fraction / sky fraction）judge 畫面內容。

---

## 下一步：第 3 項 — 角色部件組裝

目標：用 P_COMMON.glb 的原版角色部件取代程序化人形。

要做的事：
1. **探勘 P_COMMON 結構**：在 preview 裡用 `__game` + GLTFLoader 列出 P_COMMON.glb 的 model_N 清單（每個 node 的 bbox 尺寸/位置），分辨哪些是頭/軀幹/四肢/槍。jevarg 的 wiki（`tools/re-virtua-cop-2/`，GitHub wiki 有資料結構文件）可能有部件索引對照。
2. **靜態組裝**：先按 T-pose 把部件組成一個 Group 當敵人模型（不用動作），EnemyModelLoader 換回 GLB 路線。billboard 面向已有（EnemyManager.update）。
3. **動作（長期）**：MOT*.BIN 格式逆向（MOTCMN/MOTSTG1...），讓部件動起來。
4. 平行可做：沿 CAMMOV 路徑增補波次（見「已知課題」），讓 304 秒路徑前段有合理敵人密度。

驗證方式照「Preview 驗證的坑」一節（HTTP 接收器截圖 + PIL 分析）。

---

## 架構總覽（與 Session 5 相同，僅 Renderer 描述更新）

```
VirtuaCop2/
├── game/                        ← Vite + Three.js 遊戲前端
│   ├── src/
│   │   ├── main.js              ← 進入點；window.__game 有 loop/director/gameMgr/enemyMgr/renderer/cameraRig
│   │   ├── render/
│   │   │   ├── Renderer.js      ← WebGLRenderer，unlit：無燈、NoToneMapping、無霧無影
│   │   │   ├── CameraRig.js     ← 鏡頭移動（curve mode / frame mode 雙模式）
│   │   │   ├── CameraPathLoader.js  ← 載入 camera.bin（CAMMOV 路徑）
│   │   │   └── WeaponViewModel.js   ← 一人稱手槍 placeholder
│   │   ├── gameplay/            ← EnemyManager / EnemyModelLoader（程序化人形）/ Enemy / Shooter
│   │   ├── scene/StageEnvironment.js ← 載入該關全部 4 個 GLB 區塊，原版座標直用；groundYAt() raycast
│   │   ├── level/               ← LevelLoader / LevelDirector / levels/*.json
│   │   ├── hud/HUD.js
│   │   ├── input/InputManager.js
│   │   ├── GameManager.js / GameLoop.js / audio/
│   ├── public/assets/           ← gitignored；stage1/2/3 各 5 GLB + camera.bin（全部齊）
│   └── tests/                   ← Vitest，60 個全過
├── tools/extract-stage-assets/  ← Node.js 提取器（三關 GLB + camera.bin，14 測試全過）
├── tools/re-virtua-cop-2/       ← jevarg 的逆向工程 repo（資料結構參考）
├── virtuacop2/                  ← 原版 PC 遊戲檔（BIN/、ppj2dd.exe 等）
└── HANDOFF.md                   ← 本文件
```

---

## 開發環境

```bash
cd game
npm install
npm run dev     # Vite dev server（或用 preview 工具，launch.json 名稱 virtua-cop-2-dev）
npm test        # Vitest，60 tests 應全過
```

提取資產（三關 GLB + 相機路徑，輸出至 assets/stageN/）：
```bash
node tools/extract-stage-assets/extract.mjs virtuacop2 game/public/assets
node tools/extract-stage-assets/extract-camera.mjs virtuacop2 game/public/assets
```

---

## 下一個 Session 的開始指令

```
讀 HANDOFF.md。

1. 先處理未 commit 的改動（兩個批次：unlit + 原版座標/CAMMOV，問用戶或依指示 commit）
2. 開始第 3 項：角色部件組裝（見「下一步」一節，從探勘 P_COMMON.glb 結構開始）
```
