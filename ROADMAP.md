# VirtuaCop2 工程路線圖（2026-06-12 規劃）

> 原則：**一律忠於原版**，不自創玩法。每項做完跑 `npm test` + preview 驗證
> （驗證流程照 HANDOFF.md「Preview 驗證的坑」一節，全程 eval + HTTP 接收器截圖）。
> 單線作業、不開 multi-agent/workflow（token 成本考量）。

## 優先序總表

| # | 工程 | 規模 | 難度 | 前置 |
|---|------|------|------|------|
| A | 角色部件組裝（靜態） | 中 | 中 | 無 |
| B | 沿 CAMMOV 路徑增補波次 | 中 | 低 | 無（可與 A 平行） |
| C | 射擊機制忠實度（lock-on 圈、彈數/換彈、部位判定） | 中 | 低-中 | 無 |
| D | HUD 忠實度 | 小 | 低 | C 先定資料 |
| E | 平民/人質與 justice shot | 小-中 | 低 | A、C |
| F | stage2/3 關卡 JSON + Boss | 中 | 低 | B 的工具經驗 |
| G | 音效/BGM 提取 | 中 | 中-高 | 無 |
| H | MOT*.BIN 動作逆向（角色動畫） | 大 | **高** | A |
| I | 雜項：push、效能、相機 FOV 校正 | 小 | 低 | 隨時 |

建議執行順序：**A → B → C → D → E → F**，G/H 視情況穿插，H 留到最後（最難）。

---

## A. 角色部件組裝（HANDOFF 第 3 項，靜態版）

目標：用 P_COMMON.glb 的原版角色部件取代程序化人形（`EnemyModelLoader.js` 目前是自製低多邊形人）。

步驟：
1. **探勘**：preview 裡用 `__game` + GLTFLoader 載 `assets/stage1/P_COMMON.glb`，列出每個 `model_N` node 的 bbox 尺寸/中心/三角形數，分類頭/軀幹/上臂/前臂/大腿/小腿/槍。
   - 參考 `tools/re-virtua-cop-2/` 的 wiki（GitHub wiki 有 TMP/部件資料結構文件），可能有部件索引對照表。
   - 把探勘結果（index → 部件名對照表）**寫進本檔附錄**，之後 session 不用重做。
2. **靜態組裝**：寫 `CharacterAssembler`（或改 `EnemyModelLoader`）按 T-pose/站姿把部件組成 Group。關節位置用 bbox 對齊（肩=軀幹頂部兩側、髖=底部兩側）。
3. 接回 `EnemyManager`：spawn 用組裝模型，billboard 面向已有。fallback 保留程序化人形（GLB 載入失敗時）。
4. 測試：EnemyModelLoader 單元測試更新；preview 截圖確認敵人外觀是原版部件貼圖。

注意：部件材質要走 unlit（MeshBasicMaterial）路線，與 StageEnvironment 的 traverse 替換邏輯一致——可抽共用函式。

## B. 沿 CAMMOV 路徑增補波次

背景：stage1 CAMMOV 全長 304 秒，但 `levels/stage1.json` duration=35s、僅 3 波 + boss → 只走路徑前 ~12%。原版敵人配置在 PG_STG1.DLL（jevarg 未解），所以**手工沿路徑佈波次**。

步驟：
1. 寫一個 dev 輔助（可只是 console 函式）：在 preview 裡按時間點跳轉相機（`cameraRig.advance(t)`）+ 截圖，掃 0–304s 每 10–15 秒一張，挑出「適合出敵人」的場景節點（轉角、開闊處、停頓點）。
2. 依節點擴充 stage1.json：每波給 time、敵人數、相機相對偏移座標（現行 spawn 語意：x=右、-z=前，raycast 落地）。原版節奏參考：每波 2–4 人、間隔幾秒、會躲掩體探頭（探頭行為可後補）。
3. duration 改為配合 CAMMOV 全長（或截到合理段落，原版 stage1 一輪約 3–5 分鐘）。
4. 驗證：實跑幾個時間段，敵人都落在街面、在視野內。

注意：CAMMOV 可能含停頓段（原版相機在交戰點會停）。若 frame mode 是等速播放，考慮在波次未清完時**暫停相機推進**（原版行為：清完該點敵人才前進）——這項若要做，動 `CameraRig`/`LevelDirector`，先確認現行行為再決定。

## C. 射擊機制忠實度

原版核心規格（VC2 實機行為）：
- 手槍 6 發彈匣，射空自動／手動 reload（畫面外開槍 reload）。
- **Lock-on 圈**：敵人出現時套綠圈，倒數變黃→紅，紅圈時敵人開槍打玩家。打死紅圈前的敵人按剩餘時間給分數倍率。
- 部位判定：爆頭即死、打手繳械（justice shot 加分）、打身體。
- 敵人子彈飛向鏡頭有提示（原版：子彈接近時有音效+畫面提示），被擊中扣 1 命。

現況盤點（執行時先讀 `Shooter.js`/`Enemy.js`/`GameManager.js` 確認哪些已有）：彈數/reload 可能已部分存在，lock-on 圈大概率沒有。

步驟：
1. Lock-on 圈：HUD 層畫圈投影到敵人螢幕座標（`Vector3.project(camera)`），綠→紅計時器掛在 Enemy 上，倒數完敵人射擊。
2. 部位判定:raycast 命中時依命中點對部件（A 做完就有頭/手/身體 mesh 可分）回傳 zone，分數/即死邏輯進 GameManager。
3. 測試先行：倒數狀態機、分數倍率都可純單元測試。

## D. HUD 忠實度

原版 HUD：左上 SCORE、生命（警徽圖示 ×N）、右下彈匣 6 格、命中時 "JUSTICE SHOT" 等字卡、stage 開頭 "STAGE 1 START"。
- 改 `hud/HUD.js`，全 DOM/CSS 即可（原版是 2D overlay）。
- 字型先用近似 web font；圖示可先幾何形狀，之後再從原版資源提。

## E. 平民/人質

- 原版：平民會跑過街道/被挾持，射中平民扣 1 命。
- 用 A 的部件組裝出平民外觀（P_COMMON 裡應有非敵人部件；探勘時順便記錄）。
- JSON 波次格式加 `type: "civilian"`，移動沿簡單路徑，命中 → 扣命 + "Oh no!" 字卡。

## F. stage2/3 關卡 + Boss

- GLB/camera.bin 已齊（stage2: 10000f、stage3: 4200f）。
- 複製 B 的方法為 stage2/3 佈波次；關卡選單已能選。
- Boss：原版每關有中 boss + 關尾 boss（stage1 結尾=直升機）。先用部件/簡單模型代替，行為（血條、多階段）寫進 LevelDirector。

## G. 音效/BGM 提取（獨立工程）

- `virtuacop2/` 原版檔內找音效資源（BIN/ 目錄、或 .exe 旁的音檔；先 `ls -R` 盤點副檔名）。
- jevarg repo 可能有 SOUND 格式文件。若是標準 ADPCM/WAV 包裝，寫提取器到 `tools/`；若無解，先用免費音效佔位（標明非原版）。
- 遊戲端 `audio/` 已有架構，接上即可。

## H. MOT*.BIN 動作逆向（最難，最後做）

- 目標：MOTCMN/MOTSTG1…BIN → 骨架關鍵幀，驅動 A 組裝的部件（原版就是部件式骨架動畫，不需 skinning）。
- 先查 jevarg wiki 是否已有 MOT 格式文件；有 → 照文件寫 parser；無 → hex 分析（frame 數、channel 數、角度編碼，參考 CAMMOV 逆向經驗：定長 frame、16-bit 角度的可能性高）。
- 產出：`tools/extract-stage-assets/lib/motion-reader.mjs` + 遊戲端 `MotionPlayer`。
- 這項建議用較強模型做（逆向工程試錯成本高）。

## I. 雜項

- [ ] `git push`（main 落後 remote 兩個 commit，用戶說 push 才 push）
- [ ] 相機 FOV 校正：對照原版實機截圖調 FOV（原版 Model 2 約 4:3、FOV 偏窄）
- [ ] 效能：三關 GLB 全載時的 draw call 檢查；far plane 3000 是否需要分區裁切
- [ ] `assets/` 在新 worktree 需手動複製（已知坑，HANDOFF 有記）

---

## 附錄：P_COMMON 部件對照表

（A-1 探勘完成後填入：model index → 部件名 → bbox 尺寸）

| model_N | 部件 | bbox (w×h×d) | 備註 |
|---------|------|--------------|------|
| （待填） | | | |
