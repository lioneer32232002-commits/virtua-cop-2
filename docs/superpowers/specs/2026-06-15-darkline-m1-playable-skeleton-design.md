# 《暗線 / DARKLINE》M1 可玩骨架設計規格（spec）

> 產出日期：2026-06-15
> 狀態：設計定案，待寫實作計畫（writing-plans）
> 上游文件：[首部曲設計 spec](2026-06-15-darkline-first-island-chain-design.md)、[M0 垂直切片計畫](../plans/2026-06-15-darkline-m0-vertical-slice.md)、`ROADMAP.md`「M0 垂直切片完成」節
> 本 spec 以 **M0 四未知數裁決**為輸入（全過：sprite 收斂有條件可／自由段可／全迴圈可／Electron 8.1ms 可），定義 M1「可玩骨架」的範圍與架構。

---

## 1. 概念一句話

**在乾淨的 `darkline/` 命名空間下，把 1953 台北首部曲任務的「真骨架」端到端搭起來——軌道→自由→軌道/Boss 一條任務跑通，佔位美術，滑鼠手感可玩。**

M1 是 spec §9 里程碑表的「可玩骨架」：1 個任務軌道＋自由跑通（佔位美術）＋滑鼠手感。**M1 蓋的是真任務的骨架、不是丟棄式測試關**——M2 在此之上裝修（真 sprite／劇情／情報／英文），不是重蓋。M0 spike（`game/src/darkline/m0/`）的程式可丟棄或留參考，M1 在乾淨結構下重寫，純邏輯沿用 M0 已驗證的演算法但不直接 import spike。

---

## 2. 驗收標準（M1「做完」長怎樣）

從選單選「暗線・第一島鏈」→

1. 📋 **簡報卡**：西緣貿易公司閣樓，受命攔截名單交接（純文字 overlay，走 i18n）。
2. 🎯 **軌道 1**：騎樓街便衣伏擊（自由游標光槍、lock-on 圈、clearPoint arena）。
3. **下車接縫**：相機交給自由控制器、輸入切 pointer-lock、寫存檔點。
4. 🚶 **自由段**：線性巷弄——pointer-lock 走動＋找情報＋護投誠者＋輕交火（billboard sprite 敵人＋輕磁吸瞄準）。
5. **上車接縫**：走到巷尾觸發區 → 相機交回軌道、恢復自由游標、寫存檔點。
6. 🎯 **軌道 2 / Boss**：碼頭對決，奪回暗線名單（重用引擎＋`BossController`）。
7. 📋 **結尾卡**：1996 伏筆鉤子（「待第一島鏈再次收緊之日」）。

→ **整輪端到端跑通、可存檔讀回**；佔位美術；滑鼠手感（兩模型＋輕磁吸）可玩；純邏輯模組走 TDD；整合/視覺/手感走 preview 手動驗收。

---

## 3. 範圍

### 3.1 In scope
- 段落狀態機（`MissionSequencer`）。
- rail↔free 相機接管＋輸入模式切換（`SeamController`）＝**M1 真正的新風險，優先釘住**。
- 自由段 production：走動＋碰撞＋簡單 AI＋billboard sprite＋輕磁吸瞄準。
- 軌道段：重用既有引擎＋新增 `taipei1950s` 程序場景 preset＋兩段 railPath/波次資料。
- 簡報/結尾字卡（純文字 overlay）。
- 最小存檔（段落級）。
- **i18n 鷹架**（`t()`＋`zh.json`、零硬寫字串）。
- 美術管線（M0 調色盤/buildSprite 升級、參數放寬）。

### 3.2 Out（YAGNI → M2 及之後）
- 英文翻譯與語言切換 UI（M1 只做鷹架，紀律從第一天起；翻譯與切換 M2）。
- 真 sprite 美術升質、多角度 sprite sheet。
- 情報解碼小遊戲（M1 用佔位互動點）。
- 配音、原創 BGM 編曲。
- navmesh／A\* 真繞路 AI（線性巷弄不需要）。
- 軌道段敵人換 sprite（M1 沿用既有程序人形，見 §7.3）。
- 手機觸控、Steam/Electron 包裝（M4）。

---

## 4. 設計決策（2026-06-15 腦力激盪定案）

| # | 決策 | 選擇 | 理由 |
|---|---|---|---|
| ① | 建構順序 | **接縫骨架優先** | M1 真正的新風險＝模式接縫；先釘住，之後每次加深都能在完整流程裡驗；順勢先立乾淨 `darkline/` 結構。 |
| ② | 自由段動線 | **線性巷弄** | 進出＝兩個接縫點，天然對齊 rail↔free 切換；動線最清楚、最好驗骨架；天生避開「笨 AI 在 U 型卡死」。 |
| ③ | 滑鼠瞄準模型 | **軌道自由游標／自由 pointer-lock，接縫切換** | 兩模型各自最適合且**都已存在**（軌道游標光槍＝`InputManager`/`Shooter` 既有；自由 pointer-lock＝M0 `FreeRoamController`）；保住用戶在意的光槍感。 |
| ④ | 瞄準輔助力度 | **輕量磁吸（可調）** | 滑鼠（尤其 free 段 mouse-look）無光槍 1:1 精度；可調磁吸補落差又保技術感；正是 spec §6「輔助力度要調」。 |

**由 spec 已解（不另議）：** 主題＝1953 台北諜報（spec §5）、5 拍巨觀動線、i18n 從第一天（§6/§8）、最小存檔屬全迴圈一環。

---

## 5. 段落骨架與接縫（脊椎）

### 5.1 `MissionSequencer`（M0 `Sequencer` 升級）
```
SEGMENTS = [briefing] → [rail1] → [free] → [rail2boss] → [ending]
              字卡        光槍      pointer-lock   光槍+Boss      字卡
                          └─ 下車接縫 ─┘     └─ 上車接縫 ─┘
```
- 純狀態機，每段帶 `onEnter/onExit` 回呼（M0 只有 `onEnter`）。
- 整合層在每次切換做三件事：**①設定相機控制者 ②切換輸入模式 ③寫存檔點**。
- 可純單元測試（段落順序、轉換、回呼觸發、isDone）。

### 5.2 `SeamController`（M1 核心新風險）
- **下車（rail1→free）**：`CameraRig` 停 curve 推進 → 相機交給 `FreeRoamController`（位置設巷口入口、eye height）；`InputManager` 隱藏 `#crosshair` → `requestPointerLock`、啟用 WASD＋mouse-look＋中央準心；`save({segment:'free', score})`。
- **上車（free→rail2boss）**：玩家走到巷尾觸發區 → `exitPointerLock` → 相機交回 `CameraRig`（curve 模式跑 rail2 路徑）→ 恢復自由游標；`save({segment:'rail2boss', score})`。
- 邊界刻意簡單、狀態切換清楚（spec §6「隔離原則」）。純狀態部分可測，DOM/PointerLock 整合走手動驗收。

---

## 6. 自由段（線性巷弄，production）

- **空間/碰撞**：細長 L 形巷弄＝**2 段相接的矩形 AABB（構成 L 轉折）＋數個障礙 AABB**（攤位／木箱／牆角）。M0 `clampToRoom` 升級成吃「AABB 段清單」（夾進任一段的聯集）＋沿障礙滑動。**線性動線天生避開 M0 已知「笨 AI 在 U 型/迷宮卡死」**。
- **場景**：`taipei1950s` 巷弄程序生成（primitive＋程序貼圖，`OriginalEnvironment` 風格）。M1 佔位質感。
- **敵人＝billboard sprite**：重用 M0 `BillboardSprite`＋palette 管線，**參數放寬**（size 96→128/160、色數 12→24~32，照 M0 後續成本筆記）。2-3 隻，AI 重用 `WanderAI`（逼近→停→射）＋碰撞滑動。
- **free 段戰鬥用獨立輕量模組**——**不套 rail 的 `EnemyManager`**（那是為相機相對 spawn／lock-on 圈／程序人形設計的）。
- **動線互動**（M1 佔位）：①情報點（走近按 E → 字卡「取得線索」）②投誠者 `innocent`（誤擊扣分，沿用既有語意）③巷尾上車觸發區。解碼小遊戲留 M2。
- **瞄準**：pointer-lock＋中央準心（M0 模型乾淨重寫）＋輕磁吸（§8.1）。

---

## 7. 軌道段（重用引擎）

- **軌道 1 騎樓伏擊**：`CameraRig` curve 模式跑自編 railPath；`taipei1950s` 騎樓 preset；`EnemyManager` 程序人形＋lock-on＋clearPoint arena 波次（沿用 `downtown1`／ROADMAP J 套路）。自由游標瞄準。
- **軌道 2 / Boss 碼頭**：另一段 railPath；碼頭 preset 變體；`BossController` 重用（血條＋多階段）。
- **新建**：`taipei1950s` preset（`OriginalEnvironment` 加 preset）、兩段 railPath＋波次資料（集中在 mission 模組）。

### 7.3 軌道敵人 M1 不換 sprite（已拍板）
M1 軌道段沿用既有程序人形（3D 佔位），**不換 billboard sprite**——純重用、最快搭骨架。視覺上會「軌道 3D 人偶／自由 2D 紙片」並存一陣子，M1 佔位階段可接受；M2 隨真 sprite 美術一併統一。（M0 已驗證 sprite 可行，無需 M1 在軌道重驗。）

---

## 8. 共用系統

### 8.1 瞄準輔助 `aimAssist.js`（純函式）
輸入＝準心方向／螢幕座標＋敵人螢幕座標清單＋力度參數；輸出＝輔助後瞄準點／是否落在命中容差內。rail/free 共用，**力度各設**（free 高、rail 低或關）＋滑鼠靈敏度參數。純函式可測（磁吸計算、半徑邊界、無目標時原樣返回）。

### 8.2 存檔 `SaveStore`（M0 升級，乾淨重寫）
段落級存檔：接縫點寫 `{segment, score, ...}`；讀回從該段開頭。注入 storage 可測（往返、空、清除）。

### 8.3 i18n `i18n.js`
`t(key)`＋`zh.json`；所有 UI／字卡／簡報文字走 `t()`、**零硬寫字串**。M1 只 zh；en＋切換 UI 留 M2（對齊 spec §8「紀律從第一天、翻譯 M2」）。純函式可測（找鍵、缺鍵 fallback）。

### 8.4 字卡/簡報 `cards.js`
briefing／ending 純文字 overlay（圖／演出 M2），文字走 i18n。可重用既有 `HUD.showCard` 概念或新 overlay 元件（計畫階段定）。

### 8.5 美術管線
M0 `palette.js`／`buildSprite.js` 升級：size／色數放寬、Gemini 原圖壓縮後再進版控（M0 的 `enemy*.png` 4~5MB 未進版控）。M1 佔位 sprite，用戶 Gemini 生圖或暫用 M0 圖。

---

## 9. `darkline/` 結構與重用清單

### 9.1 目標結構（精確分層計畫階段定）
```
game/src/darkline/
  mission/  MissionSequencer・SeamController・missions/first-island-chain.js
  free/     FreeRoamController・clamp・WanderAI・AlleyScene
  combat/   aimAssist・BillboardSprite・palette・buildSprite
  core/     SaveStore・i18n・cards
  darkline.html / darkline.js   入口（取代 m0.html，整合層接 game/ 引擎）
game/src/locales/zh.json
game/tests/darkline/**           純邏輯測試
```
任務資料（段落表＋railPath＋波次＋巷弄 layout）集中在 `missions/first-island-chain.js`，**直接驅動重用的引擎元件，不走 legacy `LevelLoader` 選單 glob**，保 darkline 乾淨。

### 9.2 重用（`game/`，不改或極小改）
`render/Renderer`、`GameLoop`、`gameplay/Shooter`、`input/InputManager`（rail 瞄準）、`CameraRig`（curve rail）、`scene/OriginalEnvironment`、`EnemyManager`＋lock-on＋`Projectile`（rail 敵人）、`BossController`、`hud/HUD`、`audio/AudioManager`。

### 9.3 新建（`darkline/`）
`MissionSequencer`、`SeamController`、自由段 production（FreeRoam／clamp／WanderAI／AlleyScene）、`taipei1950s` preset、`aimAssist`、mission 資料、`SaveStore`、`i18n`、`cards`。

> 原則：小而純、可單測，與 production `scene/gameplay/level` **零交叉改**。沿用 spec §7 的資料夾分法（`darkline/` ＝原創內容、`game/` ＝共用引擎）。

---

## 10. 測試策略與 Phase 節奏

- **純邏輯 TDD**（紅→綠→commit）：`MissionSequencer`、`clamp`、`WanderAI`、`aimAssist`、`SaveStore`、`i18n`、`SeamController` 狀態部分。
- **整合／手感／視覺＝手動驗收**：preview eval＋截圖（沿用既有套路，注意隱藏視窗 rAF/matrixWorld 坑，見記憶 `project_vc2_env_gotchas`）。
- **每 Phase 結尾 Opus 統一檢查點**（沿用 M0 節奏）：方便切細 session、評估 token、用戶過了才進下一 Phase。
- 模型分工：純邏輯/規格明確 → Sonnet；接縫整合/手感/視覺/延遲判斷 → Opus（承 CLAUDE.md）。

---

## 11. 風險與 M2 鉤子

| 風險 | 等級 | 對策 |
|---|---|---|
| 接縫切換（相機接管＋輸入模式）卡頓或狀態錯亂 | 🟡 | M1 優先做、純狀態部分 TDD、preview 端到端驗；邊界刻意簡單 |
| 兩種滑鼠模型切換手感突兀 | 🟢 | 對應「下車/上車」敘事節拍、可接受；磁吸力度可調緩衝 |
| sprite 清晰度（M0 偏暗臉糊） | 🟢 | M1 放寬 size/色數參數（已列 in scope） |
| 軌道 3D 人偶／自由 2D 紙片視覺並存 | 🟢 | M1 佔位可接受，M2 統一換 sprite |
| 自由段「好不好玩」深度不足 | 🟡 | M1 只求骨架可玩；趣味深化（分支/探索/解碼）M2 |

**M2 鉤子（M1 刻意留白給 M2 裝修）：** 真 sprite 美術、英文翻譯＋切換、情報解碼小遊戲、簡報/結尾演出、軌道敵人 sprite 化、自由段動線變寬/分支。

---

## 12. 驗收標準（重述，可勾稽）

選單 → 簡報卡 → 軌道 1 → 下車接縫 → 自由段（走/碰撞/AI/射擊/互動）→ 上車接縫 → 軌道 2/Boss → 結尾卡 → 整輪跑通 → 存檔讀回 → 滑鼠手感可玩 → 純邏輯測試綠 → preview 端到端無 error。

---

*本 spec 基於 2026-06-15 腦力激盪定案，以 M0 四未知數裁決為輸入。下一步：writing-plans 產出 M1 實作計畫（Phase 化、標模型、每 Phase Opus 檢查點）。*
