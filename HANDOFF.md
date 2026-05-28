# VirtuaCop2 Handoff — 2026-05-28 (Session 2)

## 現在在哪裡

Three.js 重製版 Virtua Cop 2，**Stage 1 基本可玩**。
Dev server：`cd game && npm run dev`（通常 port 5175）。
最新 commit：`dad6c5a`

---

## 架構總覽

```
VirtuaCop2/
├── game/                        ← Vite + Three.js 遊戲前端
│   ├── src/
│   │   ├── main.js              ← 進入點，組裝所有系統
│   │   ├── render/
│   │   │   ├── Renderer.js      ← WebGLRenderer + ACES tone mapping + lights
│   │   │   ├── CameraRig.js     ← 鏡頭移動（curve mode / frame mode 雙模式）
│   │   │   └── CameraPathLoader.js  ← 載入 camera.bin（CAMMOV 路徑）
│   │   ├── gameplay/
│   │   │   ├── EnemyManager.js  ← 敵人生成、更新、hit detection
│   │   │   ├── EnemyModelLoader.js  ← 從 P_COMMON.glb 載入模型群組
│   │   │   ├── Enemy.js         ← 單個敵人狀態機
│   │   │   └── Shooter.js       ← Raycaster 射擊
│   │   ├── scene/
│   │   │   └── StageEnvironment.js  ← 載入 P_STGxx.glb，自動縮放至60單位世界
│   │   ├── level/
│   │   │   ├── LevelLoader.js
│   │   │   ├── LevelDirector.js ← 依時間線觸發波次/Boss
│   │   │   └── levels/
│   │   │       ├── stage1.json  ← 手工關卡資料（小世界，z=0→-40，45秒）
│   │   │       ├── stage2.json
│   │   │       └── stage3.json
│   │   ├── hud/HUD.js           ← 血量❤/彈藥/分數，crosshair 命中閃紅
│   │   ├── input/InputManager.js← 滑鼠移動 crosshair，點擊射擊
│   │   ├── GameManager.js       ← 狀態機（MENU/PLAYING/CLEAR_POINT/DEAD）
│   │   ├── GameLoop.js          ← requestAnimationFrame
│   │   └── audio/AudioManager.js
│   ├── public/assets/           ← **gitignored**，需手動複製或重新提取
│   │   ├── stage1/
│   │   │   ├── camera.bin       ← CAMMOV 路徑（已提取但暫停使用）
│   │   │   ├── P_STG10.glb      ← 主場景模型
│   │   │   ├── P_STG11/12/1C.glb
│   │   │   └── P_COMMON.glb     ← 敵人模型
│   │   ├── stage2/ (同上)
│   │   └── stage3/ (同上)
│   └── tests/                   ← Vitest，51 個全過
├── tools/extract-stage-assets/  ← Node.js 資產提取器
│   ├── extract-camera.mjs       ← CAMMOV*.BIN → camera.bin
│   └── extract-glb.mjs          ← BIN → GLB
└── HANDOFF.md                   ← 本文件
```

---

## 座標系問題（最重要的架構決策）

目前有**兩套互不相容的座標系**：

| 系統 | 座標範圍 | 說明 |
|---|---|---|
| JSON 關卡資料 | ~40 單位 | 手工製作，railPath z=0→-40 |
| 原始遊戲資料（CAMMOV + GLB）| ~數百單位 | CAMMOV stage1 起始約 (-122, -8, 274) |

**現在的權宜解：**
- `StageEnvironment.js`：GLB 縮放到 60 單位後置中（bounding box auto-fit）
- `main.js`：**暫停** `loadCameraPath()`，強制用 JSON railPath，敵人才看得到
- `camera.bin` 已提取完畢但未使用

**若要重新啟用 CAMMOV**，取消 `main.js` 的注釋：
```js
// const camData = await loadCameraPath(stageId)
const camData = null   ← 改回 await loadCameraPath(stageId)
```
但同時需要把 stage*.json 的 enemy position 轉成原始遊戲世界座標。

---

## 最後一批修改（本 session 做的）

### 1. Playability fixes（commit `28461b7`）
- **HUD.js**：拿掉重複的 `#crosshair` DOM 建立，改 `document.getElementById('crosshair')` 重用 index.html 現有的；加命中閃紅 CSS（::before/::after/`.ring`）
- **StageEnvironment.js**：GLB 縮放至 60 單位 + 置中 + `castShadow/receiveShadow`
- **EnemyModelLoader.js**：改從子節點找有幾何體的 group，不再用 `children[0]`（常是空 Group）
- **main.js**：暫停 CAMMOV（加注釋說明原因）

### 2. Lighting overhaul（commit `dad6c5a`）
- **Renderer.js**：
  - `ACESFilmicToneMapping` + `toneMappingExposure = 2.2`（PBR 場景不加就會超暗）
  - 換 `HemisphereLight(0x99bbff, 0x443322, 1.5)` 取代平面 ambient
  - Key light 前方 2.0 intensity + rim 背光 0.8
  - Shadow map 2048²
  - 天空/霧顏色從 `#111122` 改 `#334466`，霧起始距離 30→90
- **StageEnvironment.js**：載入後對 MeshStandardMaterial 強制 `roughness ≥ 0.6`、`metalness ≤ 0.1`，防止無 env map 時看起來是黑鏡面

---

## 已知問題

### 高優先

1. **場景亮度**
   - 已做了 ACES + hemisphere light，但截圖時還沒確認效果
   - 若仍太暗：把 `Renderer.js` 的 `toneMappingExposure` 從 2.2 再拉高到 3.0
   - 或把 GLB 材質改成 `MeshLambertMaterial`（不受 metalness 影響）

2. **敵人對應未確認**
   - `EnemyModelLoader` 把 P_COMMON.glb 的有幾何體子節點按順序分配給各類型
   - 不確定哪個 index 是哪種敵人；需要在 Three.js 場景裡探索 GLB 結構
   - Fallback 為各色方塊（grunt=紅, gunman=藍, heavy=黃, boss=黑, innocent=膚色）

3. **Crosshair 雙重顯示（舊版問題）**
   - 已在 `28461b7` 修好，但若截圖時 Vite HMR 沒更新，需要 Ctrl+Shift+R 強制重整
   - index.html 有 `#crosshair`（CSS 十字線+圓環），InputManager 讓它跟著滑鼠

### 中優先

4. **一人稱武器**（用戶有反映看不到槍）
   - 需在 camera 的右下方加一個槍的 3D mesh，不參與 raycasting

5. **Stage 2 / 3 波次資料**
   - stage2.json、stage3.json 可能只有基本骨架，需補充波次設計

6. **敵人 clone 的 bbox 問題**
   - `template.clone(true)` 複製的 Group 若包含多個 children，raycasting 可能失效
   - 需測試是否能射中敵人

---

## 下一個 Session 建議

**第一步**：`npm run dev` 看畫面亮度。若仍太暗：
```js
// game/src/render/Renderer.js 第22行
this.webgl.toneMappingExposure = 3.0
```

**第二步**：開始遊戲，等 3 秒，看 z=-12 處是否出現 2 個 grunt（方塊或 GLB 模型）。打開 browser console 看有無 EnemyModelLoader 的 warn。

**第三步**：確認只有一個 crosshair（CSS 十字線，跟著滑鼠移動）。

---

## 開發環境

```bash
cd game
npm install
npm run dev     # Vite dev server
npm test        # Vitest 51 tests，應全過

# 若在新 worktree 工作，需複製 GLB（gitignored）
# PowerShell:
Copy-Item "game\public\assets\stage1\*.glb" `
  ".claude\worktrees\<name>\game\public\assets\stage1\" -Force
```
