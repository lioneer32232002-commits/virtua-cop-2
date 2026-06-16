# DARKLINE 戰鬥調校設計 — 彈藥／部位傷害／lock-on 圈

> 狀態：草稿（待用戶 review）。日期 2026-06-16。
> 上游：首部曲 spec `docs/superpowers/specs/2026-06-15-darkline-first-island-chain-design.md`、M2 plan `docs/superpowers/plans/2026-06-15-darkline-m2-mvp.md`。
> 觸發：用戶試玩 M2 後的回饋（lock 圈鎖頭、無限彈藥沒難度、部位傷害數值）。

## 背景與動機

M2 把 DARKLINE 補成可玩 MVP，但用戶試玩後提出三點戰鬥手感回饋：

1. 軌道段 lock-on 圈鎖在頭部、偏小，想要大一點、視覺上包全身。
2. 目前彈藥「空了瞬間補滿、實質無限」（[darkline.js:96](game/src/darkline/darkline.js:96)），缺難度與省彈藥的急迫感。用戶想要 Duke3D 那種「從手槍開始就要管彈藥」。
3. 部位傷害：希望爆頭最省（小兵一發）、身體兩發、四肢解決不了（要補頭或身）。

## 核心設計原則：壓力分軸

rail 與 free 兩段的緊張感來源**刻意不同**，因此彈藥模型也不同——這不是不一致，是各用各的壓力軸，故事上亦通（rail＝被推著走的遭遇戰、free＝主動潛入要算計）：

- **rail（街機光槍）**：壓力＝ **lock-on 紅圈倒數**（敵人冒頭即倒數，倒數完開槍打玩家）。爽感是趕在紅圈前精準爆頭清場。換彈維持近乎零成本，避免街機節奏被資源管理打斷。
- **free（潛入／Duke3D）**：壓力＝**資源管理**。彈藥有限、爆頭最省、擊殺掉彈夾去撿。

用戶決策（2026-06-16 brainstorming）：採「分軸」、free 段「緊但不卡關」、四肢「手＝繳械(justice)、腿＝低傷」。

---

## 1. 彈藥系統（分軸）

### rail 段（維持現狀）
- 換彈瞬間完成、實質無限；不撿彈、HUD 不顯示備彈匣。
- 緊張全交給 lock-on 紅圈倒數。

### free 段（新：有限彈藥）
- M1911：**彈匣容量 7 發、起始 +2 備用匣**（共 21 發）。
- **換彈**：右鍵手動或彈匣打空時自動觸發，**耗時 1.0 秒**（換彈空檔可被偷打）；換彈消耗 1 個備用匣。
- **補給**：
  - 擊殺敵人**掉彈夾**：基礎掉落率 0.4；**保底（pity）**＝連續 3 次擊殺無掉落則強制掉一個（避免乾旱）。
  - 掉落的彈夾走進**半徑 1.2** 內**自動撿取**，每個回補 1 匣（7 發），至備彈上限。
  - 地圖**固定補給點**：首部曲 free 段放 2 處，各補 1 匣。
- **容錯＝緊但不卡關**：掉落保底＋固定補給點保證打得下去；真打光時靠閃避/潛行繞過，設計上不逼死。**不做近戰**。
- **HUD**：free 段顯示「備彈匣數」＋換彈中提示＋無彈藥提示；rail 段不顯示。

> 上述數值為預設值，皆 in-game 可調。

---

## 2. 部位傷害模型（rail＋free 統一）

重用既有 `Enemy.hit(damage, zone)`（rail 已實作 head/hand/body），新增 `leg` zone，兩段共用同一套：

| zone | 效果 | 傷害 |
|---|---|---|
| **head** | 即死（boss 例外：大扣血） | 致命 |
| **body** | 基準傷害 | 1 |
| **hand** | justice shot 繳械（不再開火＋加分），低傷 | 0（不致死） |
| **leg** | 低傷＋短暫減速；解決不了敵人 | 0（首版可先只 0 傷，減速列為後續微調） |

「四肢解決不了、至少要補身體一發」＝手/腿傷害皆 0（不致死），光打四肢無法擊殺，必須補頭或身。

### 敵人血量（hp＝身體發數；爆頭一律 1 發即死）

| 敵種 | 現值 | 新值 | 身體發數 |
|---|---|---|---|
| grunt（小兵） | 1 | **2** | 2 |
| gunman（中兵） | 2 | **3** | 3 |
| heavy（重裝） | 3–5 | **5** | 5 |
| free 特務（burp-gun） | 2 | **2** | 2 |

> rail 小兵也跟著變「身體 2 發」（更鼓勵爆頭，符合街機）。數值皆 in-game 可調。

### free 段 billboard 的部位判定

rail 敵人是程序人形（多 mesh，raycast 命中哪個 mesh→zone）；**free 敵人是單張 billboard sprite**，需改用「命中點在 sprite 上的相對位置」判定：

- 純函式 `billboardZone(hitPoint, sprite)`：把 raycast 命中點換算成 sprite local 座標（(命中點−sprite 中心)/worldSize），分區：
  - localY 上段（> +0.25）→ **head**
  - localY 下段（< −0.25）→ **leg**
  - 中段且 |localX| 外側（> 0.18）→ **hand**（持槍手側）
  - 其餘中段 → **body**
- 分界值為預設、in-game 調。
- 註：單張 billboard 的部位判定是近似（不如 rail mesh 精準），但足以達成「爆頭最省＋打手繳械」的核心手感。

---

## 3. lock-on 圈（rail，純參數）

- **尺寸放大**：`size = 40 + remaining×60`（40→100px；現為 22→68，[HUD.js:199](game/src/hud/HUD.js:199)）。
- **投影點下移到軀幹中心**：現 `LOCK_RING_Y=1.4`（上半身/頭，[darkline.js:303](game/src/darkline/darkline.js:303)）→ 改用敵人包圍盒中心（約 y 0.9–1.0），視覺上包全身。
- free 段不畫圈（維持 rail-only 現況）。
- 預設值 in-game 調。

---

## 架構與模組邊界

維持 DARKLINE 隔離原則：純邏輯抽成可測模組，整合走 `darkline.js`。

- **`PlayerState`**（[core/PlayerState.js](game/src/darkline/core/PlayerState.js)）：加 `reserveMags`、換彈狀態（`reloading`/`reloadTimer`）、`startReload()`/`updateReload(dt)`/`addMag()`。兩段行為以 mode 區分：rail＝瞬間補滿不耗備彈；free＝耗 1 備彈匣 + 1 秒。純邏輯 TDD。
- **掉落保底純函式** `rollMagDrop({ killsSinceDrop, dropRate, pityThreshold }, rng)`（新檔，建議 `darkline/combat/ammoDrop.js`）→ `{ drop: boolean }`。決定性、可測。
- **`billboardZone(hitPoint, sprite, bounds)`** 純函式（建議 `darkline/combat/billboardZone.js`）→ zone 字串。可測。
- **`Enemy.hit`**（`gameplay/Enemy.js`）：新增 `leg` 分支（0 傷＋減速旗標）。
- **`darkline.js`**：free 射擊接 `billboardZone`→`hit(damage,zone)`＋彈藥消耗/換彈計時/掉彈夾 spawn/撿取/補給點碰撞；rail 維持，reload 走瞬間。
- **`HUD`**（[hud/HUD.js](game/src/hud/HUD.js)）：備彈匣顯示＋換彈/無彈藥提示＋lock 圈尺寸與投影。
- **mission data**（[first-island-chain.js](game/src/darkline/mission/missions/first-island-chain.js)）：free 補給點座標、敵人 hp、彈藥/掉落參數。

## 測試策略

- **純邏輯 TDD**：`PlayerState` 備彈/換彈狀態機（耗匣、計時、補滿）；`rollMagDrop` 掉落＋保底（連續 N 殺強制掉）；`billboardZone` 四區分界；`Enemy.hit` leg 分支。
- **整合 preview**（隱藏視窗坑見 [[project-vc2-env-gotchas]]：decode/screenshot 走 eval/數值）：free 射擊四區（爆頭即死/身 2 發/手繳械/腿不死）、彈匣打空→換彈 1 秒→備彈−1、擊殺掉彈夾→走過去撿+1 匣、補給點補給、保底（連 3 殺強制掉）、HUD 備彈/lock 圈。rail 回歸：瞬間換彈、紅圈倒數、小兵身體 2 發/爆頭 1 發。

## 驗收標準

- **free**：彈藥有限、爆頭最省、緊但不卡關（保底＋補給點實測撐得過）、HUD 備彈正確、換彈空檔有張力。
- **rail**：維持瞬間換彈與紅圈倒數壓力；小兵身體 2 發、爆頭 1 發。
- 部位傷害模型 rail／free 一致；手＝繳械、腿不致死。
- lock 圈放大且包全身。
- 純邏輯測試綠 ＋ preview 端到端無 error。

## 範圍邊界（本次不做）

- **多武器／武器庫**（Duke3D 式武器升級）——留待後續部曲再議；本次僅 M1911 彈藥有限化。
- **rail 段彈藥拾取/補給**——分軸決策：rail 維持瞬間換彈、實質無限。
- **近戰系統**——free 容錯靠掉落保底＋補給點，不做近戰墊檔。
- free 可見敵彈丸已有（`BulletField`）——沿用，不在本次範圍。

---

*本 spec 由 2026-06-16 brainstorming 收斂而成；數值預設值皆標明 in-game 可調。經用戶 review 後轉 writing-plans 出實作計畫。*
