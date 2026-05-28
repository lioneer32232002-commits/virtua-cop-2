# VC2 原始資源整合設計

**日期**：2026-05-28
**範圍**：Stage 1，之後 Stage 2/3 照同樣方式套用

## 目標

把 Three.js 遊戲裡的積木佔位幾何體，換成從 PC 版 Virtua Cop 2 提取出來的真實 3D 模型和貼圖。

## 資源來源

- 路徑：`C:\Users\oneda\OneDrive\02_創作\14_AI TEST\VirtuaCop2\virtuacop2\`
- 模型：`BIN/P_STG10.BIN`, `P_STG11.BIN`, `P_STG12.BIN`, `P_STG1C.BIN`, `P_COMMON.BIN`
- 貼圖：`BIN/T_STG10.BIN` 等（對應的 `L_STG*.BIN` 是調色盤）
- 貼圖 metadata：`ppj2dd.exe`（內含位址表）
- 解析器：`tools/re-virtua-cop-2/tools/explorer/src/core/gamedata/`（TypeScript）

## 方案：Node.js CLI 批次輸出 GLB

### 步驟一：提取工具

新增 `tools/extract-stage-assets.mjs`：

1. 以 `tsx` 執行，直接 import 現有 TypeScript 解析器
2. 讀 `ppj2dd.exe` 取得貼圖 metadata
3. 讀 `P_STG*.BIN`（模型）+ `T_STG*.BIN` + `L_STG*.BIN`（貼圖+調色盤）
4. 用 `@gltf-transform/core` 組裝 GLB（幾何＋貼圖合包）
5. 輸出到 `game/public/assets/stage1/`

輸出結構：
```
game/public/assets/
  stage1/
    P_STG10.glb   ← Scene 0 模型
    P_STG11.glb   ← Scene 1 模型
    P_STG12.glb   ← Scene 2 模型
    P_STG1C.glb   ← 共用模型（角色等）
    P_COMMON.glb  ← 跨關卡共用模型
```

### 步驟二：更新 StageEnvironment.js

- 移除所有 `BoxGeometry` 積木程式碼
- 改為 `GLTFLoader` 載入對應關卡的 GLB
- `dispose()` 改成 traverse 清除 GLTF 場景

### 步驟三：更新 EnemyManager.js

- 載入 `P_COMMON.glb` 取得人物模型範本
- 每個敵人 `clone()` 一份 mesh（不重複載入）
- 不管難度高低，所有敵人都共用同一個模型範本

## 不包含在此次範圍

- 音效（WVP 庫切割需另外反向工程）
- Stage 2/3（等 Stage 1 確認沒問題再套用）
- 動畫（`MOT*.BIN` 留待未來）
- 鏡頭路徑（`CAMMOV*.BIN` 留待未來）
