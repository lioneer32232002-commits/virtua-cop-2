# Handoff — 2026-05-28 Three.js 遷移決策

**Session 日期：** 2026-05-28 上午  
**目前分支：** `fix/playmode-bugs`（Unity）  
**下一個 session 的工作：** 開始 Three.js 專案

---

## TL;DR

這個 session 做了兩件事：
1. 驗證 Unity Stage 1 play-mode bug 修復（**PASS**）
2. 決定整個專案**從 Unity 遷移到 Three.js**

---

## Unity 驗證結果（PASS）

在 Unity 2022.3.62f3 Editor 開啟 Stage1.unity，Press Play 確認：

| 項目 | 結果 |
|------|------|
| Boss 顏色 | ✅ 深灰色身體 + 紅色球頭，不是粉紅色 |
| 敵人出現（t≈3s） | ✅ Enemy_Grunt×2 + Enemy_Gunman×1 出現在 Hierarchy |
| 後續波次 | ✅ Enemy_Heavy、Innocent_Civilian 也出現（Timeline 正常） |
| 血量 HUD | ✅ 5顆紅心 → 2顆紅心 → 全灰（敵人攻擊有效） |
| Console | ✅ 0 errors / 0 warnings |

**PR #2（fix/playmode-bugs）技術上可以 merge，但因為遷移決定，暫時擱置。**

---

## 遷移決定：Unity → Three.js

### 理由（按重要性排序）

1. **不佔用電腦** — Unity 需要 computer-use 接管螢幕，Three.js 我可以背景開發，你可以同時做其他事
2. **迭代速度** — 存檔→瀏覽器重整（<5秒），vs Unity batch mode（10-30分鐘）
3. **我對 Three.js 更熟** — 出錯少，debug 快，省 sessions
4. **資產管線** — OBJ + PNG 在 Three.js 和 Babylon.js 載入難度相同，Babylon.js 的優勢消失了

### 為什麼不用 Babylon.js

- jevarg/re-virtua-cop-2 用 Babylon.js 的優勢前提是能跑 extractor
- Extractor 需要原版遊戲檔案（用戶沒有 → 正在下載中）
- 即使有，OBJ + PNG 兩個框架載入難度相同
- 我 Three.js 熟悉度 > Babylon.js，減少 debug 風險

---

## 資產管線計畫

### 流程
```
Virtua Cop 2 PC 版（PPJ2DD.EXE + BIN/資料夾）
        ↓
jevarg Python extractor（pip install Pillow → python extractor.py）
        ↓
OBJ 模型 + PNG 貼圖
        ↓
Three.js OBJLoader 載入
```

### 現況
- 用戶正在下載遊戲檔案（2026-05-28 下午）
- 具體需要：`PPJ2DD.EXE` + 旁邊的 `BIN/` 資料夾
- RIP 版（12MB）太小，需要完整版（300MB+）才有 BIN 資產

### 新關卡場景的美術策略
- **敵人/角色**：原版遊戲解包 → OBJ 模型（全關卡共用）
- **新場景環境形狀**：Three.js 幾何體（牆壁、地板、柱子）
- **新場景環境貼圖**：用戶用 Gemini 生成 PNG（VC2 風格），我套入 Three.js

---

## Three.js 遊戲架構計畫

### 里程碑順序
1. **Framework**（8-12 sessions）：場景、軌道相機、滑鼠射擊 raycast、敵人 AI、JSON 關卡、HUD
2. **Stage 1-3**（9-15 sessions）：用幾何體 placeholder 先跑起來
3. **資產整合**（4-7 sessions）：拿到遊戲檔案後，OBJ + PNG 換進去
4. **Stage 4 原創關卡**（6-9 sessions）：Gemini 貼圖 + 原版敵人模型
5. **音效、主選單、UI**（5-8 sessions）
6. **收尾**（4-6 sessions）

**總估算：5-8 個月（每週 2 sessions）**

### 參考資源
- Unity C# 邏輯（GameManager、EnemyController、ScoringSystem 等）可以直接翻譯成 JavaScript
- jevarg/re-virtua-cop-2 explorer（TypeScript/Babylon.js）作為「理解資產格式」的參考

---

## Unity 專案的處置

- `fix/playmode-bugs`：Stage 1 驗證通過，PR #2 暫時維持 Draft 不 merge
- `feat/stage4-presidential-office`：Stage 4 設計 spec 和 plan 文件保留，用於 Three.js 版本的設計參考
- Unity 專案不刪除，作為邏輯參考（C# → JS 翻譯用）

---

## 下一個 Session 的開始指令

```
讀 docs/superpowers/handoffs/2026-05-28-threejs-migration-handoff.md

決定已確認：遷移到 Three.js。
[如果遊戲檔案已下載] 先跑 jevarg extractor 確認 OBJ + PNG 輸出，再開始 Three.js 框架。
[如果遊戲檔案還沒準備好] 先用 writing-plans skill 寫 Three.js 遊戲框架的實作計畫，幾何體 placeholder 版本。
```

---

## 關鍵技術決策記錄

| 決策 | 選擇 | 理由 |
|------|------|------|
| 框架 | Three.js | 我更熟，背景開發，OBJ 載入相同 |
| 3D 模型來源 | jevarg 解包 | 原版資產，無需 3D 建模 |
| 新場景環境 | Three.js 幾何體 + Gemini 貼圖 | 可行，風格一致 |
| 部署 | Cloudflare（現有設定） | 已通，靜態檔案 |
| 關卡格式 | JSON | 可讀，易擴充 |
