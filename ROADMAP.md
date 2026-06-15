# VirtuaCop2 工程路線圖（2026-06-12 規劃）

> 原則：**一律忠於原版**，不自創玩法。每項做完跑 `npm test` + preview 驗證
> （驗證流程照 HANDOFF.md「Preview 驗證的坑」一節，全程 eval + HTTP 接收器截圖）。
> 單線作業、不開 multi-agent/workflow（token 成本考量）。

## 優先序總表

| # | 工程 | 規模 | 難度 | 前置 |
|---|------|------|------|------|
| A | 角色部件組裝（靜態）✅ | 中 | 中 | H（已完成） |
| B | 沿 CAMMOV 路徑增補波次 | 中 | 低 | 無（可與 A 平行） |
| C | 射擊機制忠實度（lock-on 圈、彈數/換彈、部位判定） | 中 | 低-中 | 無 |
| D | HUD 忠實度 | 小 | 低 | C 先定資料 |
| E | 平民/人質與 justice shot | 小-中 | 低 | A、C |
| F | stage2/3 關卡 JSON + Boss | 中 | 低 | B 的工具經驗 |
| G | 音效/BGM 提取 | 中 | 中-高 | 無 |
| H | MOT*.BIN 動作逆向（角色動畫）✅靜態 | 大 | **高** | A |
| I | 雜項：push、效能、相機 FOV 校正 | 小 | 低 | 隨時 |

建議執行順序：**A → B → C → D → E → F**，G/H 視情況穿插，H 留到最後（最難）。

---

## A. 角色部件組裝（HANDOFF 第 3 項，靜態版）— ✅ 完成（2026-06-13，併入 H-3）

> **A 已完成**：H 解出後，A 不再靠 bbox 硬擺（自創），而是用 MOTCMN 的真實骨架慣例 +
> `characters.json` rig 表組裝原版部件，靜態姿勢取 motion 24 frame 0。實作 = `CharacterFactory`
> + `EnemyManager` 接線，詳見 **H-3 完成**。fallback 保留程序化人形。下方原步驟存查。

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

### B v1 完成（2026-06-12）

**重大發現**：CAMMOV **把戰鬥停頓烤進路徑**了。用 `analyze-path.mjs` 掃 camera.bin 速度剖面，stage1 三個真實戰鬥節點（相機速度降到 ~0）：
- **A** 港口開場 t≈0–28s，cam~(-83,-8,257)
- **B** 中段 t≈72–92s，cam~(368,1.5,-165)
- **C** 終點 t≈172–196s，cam(-363,-7.7,-886)（t=176–180 完全凍結）
- **t≈196s 有 261 u/s 瞬移**（跳回 B 位置）= 場景切點/第二圈 → 第一輪有效範圍 0–196s。

**做法**：`stage1.json` 波次錨定這三節點（time=4/74/173），各一波 + `clearPoint` 閘門（相機停→清完才前進，engine 既有機制 main.js:132），終點 boss(t=178)+clearPoint(179)，duration 188（切點前結束）。波次位置用相機相對 offset（spawn 當下解算+raycast 落地）。

**驗證**：60/60 測試過；`verify-waves.mjs` 確認 12 個 spawn 全在相機前方視野錐內、落在三真實戰鬥區；preview 端到端 eval 確認敵人落街面高度（B raycast 命中幾何 y≈0；A/C 正下方無地板網格→fallback camY−1.6≈街面−10，與相機眼高假設一致，視覺合理）。

**B-phase2 完成（2026-06-12，三刀 TDD）**：
- **#1 通過敵人 culling**（`d5c2cae`）：`EnemyManager.update` 中 active 敵人落到相機後方 >3 單位（純函式 `isBehindCamera`）→ `despawn()`。節點敵人在前方不受影響（測試釘樁）。
- **#2 disarmed 逃跑**（`edf24fa`）：justice shot 後 2s 起逃跑（沿 spawn 相機右向量，複用 drift）、5s despawn；逃走後不再阻擋 clearPoint（原版 justice shot 可清場）。
- **#3 transit 波次**（本刀）：stage1/2/3 各補 2–3 小波（無 clearPoint，spawn 遠處 -z），殺不完的被 #1 culling。`verify-waves.mjs` 驗 spawn 在視野（18/18/14）；preview 實跑確認「出現→相機通過→culling 移除」（t=40 spawn 2 隻→t=42 相機通過→0）。

**其餘已知限制（未做）**：
- A/C 正下方無地板 GLB（港口開闊處），靠 fallback；若要更準可擴充地板覆蓋或讓 fallback 用該關平均街面高。

**新增 dev 工具**（`tools/extract-stage-assets/`）：`inspect-glb.mjs`（GLB 逐 node bbox）、`analyze-path.mjs`（相機速度/轉角剖面找戰鬥節點）、`verify-waves.mjs`（波次 vs 相機路徑 headless 驗證）、`analyze-mot.mjs`（MOT 結構分析，供 H）。

### B-phase3 完成（2026-06-14，`bb8e5fb`）— 補滿 stage1 中段空檔（用戶試玩回饋）

**用戶回饋**：清完港口開場那波後「後面沒敵人、有的也很快衝過去」。`analyze-path.mjs` 重掃 camera.bin 速度剖面證實主因＝**stage1 只有 3 個深停頓 arena（A@4 / B@74 / C@173），中間是兩段長距離高速移動**（A→B t≈32–70、B→C t≈92–168，15–37 u/s）。舊的 transit 波次（t=40/110/150）把單一敵人 spawn 在遠處 -z，相機 30u/s 一下超過→被 #1 culling＝「衝過去」；中段就空。

**做法（純資料，只改 `stage1.json`）**：把那 3 個 transit 波改成 **3 個真 clearPoint ambush arena**（相機停、清完才前進，敵人放回 A/B/C 交戰距離 z −12..−21）：**A2@56**（TOYLAND 城市街，過彎慢速）、**B2@112**（高架道路）、**B3@160**（過橋後工業街）。B3 原排 t=150 在橋下多層結構，地面 raycast 把 2/3 敵人放到 y≈−2 半空 → 移到 t=160 乾淨平街。淨結果：stage1 **3→6 arena＋boss**，最長空檔 70s→~48s（112→160 高架環道段），無衝過去。仍是手排近似（原版佈點在 PG_STG1.DLL 未解）。

**驗證**：`verify-waves.mjs` 22/22 spawn 全在視野錐內；game 171 測試綠（LevelDirector/LevelLoader 用 fixture 或泛用檢查，不受 stage1.json 重排影響）；preview 截圖確認 3 新點取景＋落地；實際驅動 `director.update` 確認 wave A 在 t=4 spawn、clearPoint 真的暫停相機/凍結 elapsed（aliveCount=3 不含平民）。

**驗證時順帶釐清的兩個視覺問題（下個 session 起點，用戶要做 Q1/Q3）：**
- **缺地板是「特定區域」非全關**：arena B(t=74) 有完整水泥街道、場景完整；港口開場 A、A2(t=56)、高架 B2(t=112)/B3(t=160) **下方無地板網格** → 直接露出 `Renderer.js` 的純色背景 `0x88aacc`＝用戶說的「藍底」。修法＝幫缺的區域補地板（catch-all 地面/擴充覆蓋）＋可選漸層天空/遠景霧（目前無 skybox/fog）。比舊註記「A/C 無地板」範圍更廣。
- **招牌文字是真英文但渲染成鏡像反的**（preview 實拍：建物招牌「TOYLAND」顯示成「DNALYOT」）。所以用戶 Q3「文字改英文」**八成不是翻譯/重繪美術工，是渲染翻轉 bug**，且**很可能與角色背心鏡像字同源**（H-2/H-3 清單記過「背心背面鏡像字」）。下手前先診斷成因：雙面材質背面看穿（`unlit.js` 保留 `m.side`）vs 全面座標手性翻轉。若後者，一個小修可能讓全關招牌都正過來、零美術工。

**stage2/3 仍用舊 transit 波次**（B-phase2 #3），可日後套用同一 clearPoint-arena 手法（先 `analyze-path.mjs` 找深停頓點 + preview 截圖挑乾淨落地的 ambush 點）。

### stage1 視覺完成：Q1 藍底 + Q3 鏡像字（2026-06-14，本 session，2 commit，子代理並行診斷）

用戶解除「單線、不開 multi-agent」限制，要求「直接完成第一關」（之後要做自創關卡）。開 2 個子代理並行診斷 Q1/Q3 根因，主執行緒統一實作＋preview 驗證＋TDD＋commit。

**Q1 藍底（`6235086`）— 空洞用「漸層天空＋霧＋catch-all 地面」三件補滿：**
- 根因：`Renderer.js` 只設純色背景 `0x88aacc`、**無 skybox/fog**，凡 stage 幾何沒蓋到的視野像素就是藍。
- **修正舊註記**：子代理實測（@gltf-transform 重建相機 pose + 對 stage GLB 射 ray）證實「A/A2/B3 下方無地板」**不準**——那幾關相機正下方其實有地板（−10/−9），只是**側面/中距有縫**；**唯一真正空洞是 B2（t=112，相機在高架 y≈+9.7、下方幾乎全空）**。
- 新 `render/sky.js`（純模組，+7 測試）：①漸層天空 dome（BackSide 球＋垂直 shader 漸層，深藍頂→淺霧 horizon）`fog:false`、`raycast` 停用、每幀跟相機置中；②`THREE.Fog`（horizon 色，near 260/far 1500<相機 far 3000）讓遠景幾何溶進霧。`MeshBasicMaterial` 天生吃 fog，故 `unlit.js` 不用改。接進 `Renderer.render()`。
- `StageEnvironment` 加 **catch-all 地面**（`_addVoidFloor`，+3 測試）：街面下 ~1u（stage1 y=−11，街在 −10）一張大平面填補欠地板的視野洞；**加在 scene（非 env.root）且 `raycast` 停用** → 完全不碰 `groundYAt` 敵人落地 raycast；fog 讓遠邊溶進 horizon。只 stage1 有（其他關沒給街面高度，維持原狀無回歸）。z-fight 靠「比真街低 1u、真街贏 depth test」避開。
- preview 驗證：A(t=4)/A2(56)/B(74)/B2(112) 四點——藍洞全消、手前空洞被灰地面填、B2 高架下方變「溶進霧的遠方地面」（比舊「浮在空中」好）、control 關 B 完全不變（真地板贏）。181 game 測試綠。

**Q3 鏡像字（`d0aafd5`）— extractor 翻 U 補償全場 X 鏡像：**
- 根因（子代理在 EXE/extractor 找到鐵證）：`tools/extract-stage-assets/lib/glb-builder.mjs` ~L95 `allPos.push(-v.x,…)` **把每個頂點 X 取負**＝**全場景 X 鏡像**（與 `camera-reader.mjs` 也鏡像 X、yaw θ→π−θ 同一慣例，互相補償讓佈局正確）。但 UV 沒跟著補→所有貼圖水平翻轉，**只有文字看得出來**（看板「TOYLAND」顯示成「DNALYOT」）。**與角色背心鏡像字同源**（推翻 H-2 舊猜測「疑原版 UV 即如此」）。
- 為何不直接拿掉 X 取負：那是**承重慣例**（相機路徑、yaw、H-2 整套 rig 都對著鏡像座標調過）→ 拿掉會整場左右翻、相機/rig/敵人 spawn 全爆。安全解＝**補 UV** 不動鏡像。
- 修法：`makeUvs` baseline `left=0,right=1`→`left=1,right=0`（U 翻轉），export + 3 回歸測試。**屬 build-time 改**，需重生 GLB 才生效。
- 驗證兩段：①**先 preview 實測**（在 stage 全 1175 貼圖 runtime 設 `repeat.x=-1`）→ TOYLAND 變正、其他貼圖**零破壞**（證實鏡像是全場一致、U 一律翻就對，排除「面向不同要分別處理」的疑慮）；②改 `makeUvs` 後 `node extract.mjs <virtuacop2> game/public/assets` **重生 stage1/2/3 全 15 GLB**，重載 preview→ TOYLAND **原生正確**、角色 pipeline 載重生 P_COMMON 無回歸（grunt #3 立姿/貼圖正常）。29 extractor 測試綠。
- **資產仍 gitignored**（只 commit extractor 原始碼）；任何人重跑 `node extract.mjs <virtuacop2> game/public/assets` 即得修正後 GLB。

**stage1 視覺至此「完成」**（藍底消、文字正）。剩餘 stage1 待辦皆 user-gated 或獨立工程：SE manifest 校正（用戶耳朵）、FOV 校正（用戶原版截圖）、玩家槍真模型（contact-sheet 目視，小-中 cut）、開火/中彈專屬動作（難）、BGM（MIDS 合成，獨立）。**下一步＝用戶要做自創關卡**（關卡 JSON 格式見 `level/` + stage1.json 範例）。

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

### C-1 完成（2026-06-12，純邏輯 + 整合，TDD）

**已做（10 個新測試，全 TDD 紅→綠）：**
- **Lock-on 相位狀態機**（`Enemy.lockPhase` getter）：VISIBLE 期間綠(<60%)→黃(<85%)→紅，到 `attackInterval` 開槍。disarmed 時回 null。
- **擊殺分數倍率**（`Enemy.killMultiplier`，致命一擊當下相位捕捉）：綠×3／黃×2／紅×1，非致命為 null。
- **部位判定**（`Enemy.hit(damage, zone)`）：head=即死、hand=justice shot 繳械（`disarmed`/`justiceShot`，之後永不開槍）、body=一般傷害。
- **`zoneOfHit(object)`**（EnemyManager）：raycast 物件走 parent 鏈找 `userData.zone`，預設 body。
- **部件標 zone**（EnemyModelLoader）：頭球=head、雙臂=hand、軀幹/腿=body。
- **main.js 整合**：射擊用 zoneOfHit→`hit(1,zone)`；擊殺得 base×倍率；首次 hand 命中 +JUSTICE_BONUS(200)。
- **驗證**：npm test 71/71；preview eval 確認 `clone(true)` 保留 zone（6 部件 zone 正確、enemyRef 並存）、真 raycast 解 head、4hp heavy 一發爆頭即死。

### C-2 完成（2026-06-12，lock-on 圈視覺，TDD）

**已做（5 個新測試）：**
- **`Enemy.lockRemaining`**（getter，1→0 跨 lock 窗，無 lock 時 0）——圈收縮用。
- **`HUD.updateLockOns(locks)`**：每個 lock 一個 `.lock-ring` div，依 phase 上色（綠/黃/紅 CSS），依 remaining 縮放（22+remaining×46 px），lock 消失即移除。`#lock-overlay` pointer-events:none 不擋瞄準。
- **main.js `updateLockRings()`**：每幀 `Vector3.project(camera)` 投影有 lockPhase 的敵人到螢幕像素，**排除 innocent**（伏筆 a），餵 `hud.updateLockOns`；接進 game loop。`__game` 加 `hud`/`updateLockRings` debug 出口。
- **驗證**：npm test 78/78；preview eval 確認 3 敵人(含 innocent)→只 2 個圈(innocent 排除)、座標在視窗內、green→yellow 變色、寬度 68→39 收縮。

### C-3 完成（2026-06-12，敵人開火提示 + 手動 reload，TDD）

**已做（3 個新測試）：**
- **手動 reload**（`InputManager` 右鍵 contextmenu→`onReload`，preventDefault 隱藏瀏覽器選單）：main.js `input.onReload` → playing 且未滿彈時 `gameMgr.reload()` + `hud.setAmmo`。原版「畫面外開槍 reload」的 remake 對應。
- **敵人開火畫面提示**（`HUD.flashDamage()` 紅色邊緣 vignette `#damage-flash`，120ms 後淡出）：main.js `onEnemyAttack` 觸發（紅圈已是「即將開火」前置警示，flash 是「中彈」回饋）。
- **一行修正**（Fable C-2 review）：`updateLockRings()` 在 state 非 PLAYING/CLEAR_POINT 時 `hud.updateLockOns([])` 清空——避免 GAME OVER/結算畫面殘留凍結圈。
- **驗證**：npm test 81/81；preview eval 確認右鍵 ammo 2→6、onEnemyAttack→`#damage-flash` active+HP 5→4、state=dead→圈數 1→0。

**C 系列剩餘 / 後續：**
- **justice shot 字卡** → 留給 D（HUD 忠實度）一起做。
- ~~伏筆 (b)：disarmed 敵人不逃跑/消失~~ → **已於 B-phase2 #2 完成**：disarm 後 2s 起逃跑（沿 spawn 相機右向量）、5s despawn。
- 註（已更新）：disarmed 敵人在逃走前仍算 hostile（aliveCount 計入），但**逃走 despawn 後 aliveCount 自然歸零→可清場**。這是原版行為：**justice shot 可以「清場」**（不必擊殺繳械的敵人，等它逃走即可過節點）。
- **preview 坑**：開始遊戲用 `document.getElementById('overlay').click()`（keydown Enter 不靈，需 isTrusted），已記 [[project-vc2-env-gotchas]]。

### C 子彈飛行忠實度完成（2026-06-12，三刀 TDD）

把「敵人攻擊瞬間命中、必中」改成原版的**可見彈丸 + 命中率 + 可射落/可取消**。

- **第 0 刀（B-phase2 review nit，`040555e`）**：disarm 的 flee/despawn 計時在 DYING/DEAD
  停止累計（`Enemy.update`）——否則繳械後被殺的敵人會在死亡閃爍中途被 flee-despawn
  移除。加單元測試。
- **#1 Projectile 純邏輯（`47004af`）**：新 `gameplay/Projectile.js`（純函式，11 測試）—
  飛行時間依距離（`flightTimeFor`，speed 25 u/s，clamp 0.4–1s）、命中/miss 的 roll
  **在發射時就定**（`rollHit(rate, rng)`，決定性，不在 update 用 Math.random）、
  progress/position lerp、可 cancel。`EnemyManager.fireProjectile` 依 difficulty 設命中率
  （**佔位 easy 0.5 / normal 0.7 / hard 0.9，原版確切機率未知，待考證**），每幀推進，
  **抵達才扣命**（`onEnemyAttack` 從「開火即扣」改成「抵達才扣」）；發射者死亡/despawn
  取消其在途彈丸（原版：飛行中擊殺可取消攻擊）。`enemy.onDamageDealt` 改為 `fireProjectile`。
- **#2 視覺 + 可射落（`25098e2`）**：彈丸是亮黃白 unlit 球（`MeshBasicMaterial 0xffffcc`），
  敵人→相機飛、近相機放大（scale 1→3）；miss 用 `aimPoint`+相機右向量側偏 `MISS_OFFSET=2.5`
  （飛過相機側邊，不正中心穿過）；`Projectile.shootDown()`+`resolveProjectile` 讓玩家
  raycast 射落在途彈丸→銷毀 + 少量分數（**佔位 50，待考證**）。main.js 射擊改成同時對
  敵人與彈丸 raycast（最近者勝）。
- **#3 整合 + preview 全循環驗證（本刀）**：抽出 `frame(dt)` 並掛 `__game.frame`
  供 headless 逐幀驅動。**preview 實跑確認**（rng 注入決定性）：HIT→彈丸 z −9.5→−3.25、
  scale 1.1→2.35、抵達 hp 5→4、彈丸退場；MISS→側偏 2.5u、抵達 hp 不變；CANCEL→擊殺發射者
  彈丸 cancelled、hp 不變；SHOOT-DOWN→真 raycast 射中 hp 不變、score +50、彈丸退場、耗 1 彈。
  截圖確認亮球在畫面中央放大、發射 grunt 在其後。**preview 坑**：彈丸 raycast 前要
  `cam.aspect`/`updateProjectionMatrix` + `scene.updateMatrixWorld(true)`（沒 render 過
  matrixWorld 是舊的，射不中），同 [[project-vc2-env-gotchas]]。

**驗證**：npm test 121/121（+22：Projectile 13、EnemyManager firing/shoot-down 5、Enemy nit 1、其餘既有）。

**Fable review 修正**：必修 #1 — 射落彈丸耗掉最後一發時 auto-reload 不觸發
（projectile 分支 `return` 跳過函式尾部的 `ammo===0` reload 檢查，玩家卡到手動 reload）。
改為 `if/else` 結構讓尾部 auto-reload 必然執行。順手帶 nit #2：`fireProjectile` 的 origin
`y += 1.0`（槍口/軀幹高度，與 lock 圈同高），子彈不再從腳底飛出。preview 紅→綠驗證：
ammo=1 射落彈丸→回滿 6；mid-mag(3) 射落→2 不誤觸 reload；origin 比腳底高 1.0。

**後續/可調（低優先 TODO，Fable review 留）**：
- 命中率與射落分數是佔位值（待考證原版）。
- **nit #3**：miss 彈丸抵達側偏點即 arrived 退場，沒有真的「飛過去」。要更像原版可把 miss 的
  target 再往相機後方延伸幾單位（讓它真的掠過再消失）。
- **nit #4**：`_attachProjectileMesh` 每發 new `SphereGeometry`+`MeshBasicMaterial`、`scene.remove`
  後未 dispose——長 session 小洩漏。彈丸全長一樣，可在模組層共享一份 geometry/material。
- 其他：彈丸音效/接近提示（原版有）、miss 左右側隨機化、被射落的火花特效。

---

#### （原始規格，存查）已知簡化：敵人攻擊為瞬間命中
現況：敵人到 lock 紅相位即 ATTACKING，`onEnemyAttack` 直接扣 1 命（瞬間命中，必中）。原版是**子彈可見飛向鏡頭 + 依難度有命中率（會 miss）+ 子彈飛行途中擊殺該敵人可取消攻擊**。要做需：敵人開火時 spawn 可見彈丸（朝相機飛、有飛行時間）、命中判定移到彈丸抵達時、依 difficulty 設命中率、敵人死亡時取消其在途彈丸。動 `Enemy`/`EnemyManager`/新 `Projectile`，純邏輯（飛行/命中/取消）可單元測試。**排在 E/F 之後**。

**已知伏筆（C-1 review 留下，C-2/後續處理）：**
- (a) **innocent 的 `lockPhase` 會回 green**（innocent 也走 VISIBLE，attackInterval=999 但相位由 _timer/attackInterval 算，開頭就是 green）→ **C-2 畫 lock-on 圈前要排除 innocent**（平民不該有鎖定圈/威脅圈）。做法：畫圈時 `if (enemy.type === 'innocent') continue`，或讓 `lockPhase` 對 innocent 回 null。
- (b) **disarmed 敵人不會逃跑/消失**（繳械後站著不動直到被擊殺）→ 原版 justice shot 後敵人會逃。併入 **B-phase2 的「通過/落後敵人 despawn」機制**一起做（disarmed 敵人可走同一套 despawn/flee 路徑）。
- C-1 修正（`Enemy.hit`）：爆頭即死排除 boss 型別；EMERGING 期間致命一擊拿 ×3（最快擊殺＝最高分）。

## D. HUD 忠實度

原版 HUD：左上 SCORE、生命（警徽圖示 ×N）、右下彈匣 6 格、命中時 "JUSTICE SHOT" 等字卡、stage 開頭 "STAGE 1 START"。
- 改 `hud/HUD.js`，全 DOM/CSS 即可（原版是 2D overlay）。
- 字型先用近似 web font；圖示可先幾何形狀，之後再從原版資源提。

### D 完成（2026-06-12，全 DOM/CSS，TDD 字卡）

**已做：**
- **版面重排**到原版位置：SCORE **左上**、生命在 SCORE 下方、彈匣 **右下**（原本 score 在右上、彈藥+生命在左下）。
- **生命改警徽圖示**（幾何近似：金色 ★ 實心 / ☆ 空心），class `heart`→`life`。
- **彈匣 6 格**改長方形彈倉樣式（金色實心 / 灰空），class `bullet`→`ammo-slot`。
- **字卡系統** `HUD.showCard(text, duration=1400)`（TDD）：置中金色大字、scale+fade 動畫、自動淡出。接三處：**JUSTICE SHOT**（C 欠的，justice 命中時，main.js 射擊處）、**STAGE n START**（loadStage 開場）、**STAGE CLEAR**（onComplete）。
- 測試更新：`.heart`/`.bullet` → `.life`/`.ammo-slot`（行為不變，只改類名）。
- **驗證**：npm test 82/82；preview eval（真實 viewport 905×936）確認 SCORE 左上(20,12)、彈匣右下(right≈vw−20,bottom≈vh−20)、字卡水平置中(center≈vw/2)、生命 5 金星、字卡金色 + 文字正確。

**後續（未做，視需要）：** 命中率/justice 等字卡動畫細修；HI-SCORE 顯示（`updateHiScore` 已有邏輯但無 `#hi-score` 元素）；之後從原版資源提真警徽/字型。

## E. 平民/人質

- 原版：平民會跑過街道/被挾持，射中平民扣 1 命。
- 用 A 的部件組裝出平民外觀（P_COMMON 裡應有非敵人部件；探勘時順便記錄）。
- JSON 波次格式加 `type: "civilian"`，移動沿簡單路徑，命中 → 扣命 + "Oh no!" 字卡。

**待辦（B review 留下）**：原 `stage1.json` 第 2 波有一個 `innocent`，B 重寫時**暫移除**了。原因：clearPoint 用 `aliveCount()` 判定清場，若波次含玩家不該射的 innocent，會卡死節點（已於 B-review follow-up 修正 `aliveCount()` 排除 innocent 型別，並加單元測試）。**E 完成時把 innocent 加回 stage1 波次**——此時 engine 已能正確處理（innocent 不再阻擋 clearPoint，射中才扣命）。`innocent` 型別在 EnemyManager 已有特例（`attackInterval=999` 不主動攻擊）。

### E 完成（2026-06-12，TDD）

**已做（4 個新測試）：**
- **平民 despawn 機制**（共用 B-phase2 通過敵人 despawn）：`Enemy.lifetime`（秒，到時 `despawn()`）+ `gone` 旗標 + `despawn()`/`shouldRemove()`；`EnemyManager.update` 移除條件 `isDead()`→`shouldRemove()`（killed 或 gone）。一般敵人 lifetime=null 不自動消失。
- **平民移動**：`EnemyManager.update` 中 innocent VISIBLE 時沿 +x 漂移（`CIVILIAN_SPEED=2.5`），`CIVILIAN_LIFETIME=4.5s` 後跑走 despawn。spawnWave 給 innocent 設 lifetime。
- **射中平民懲罰**（main.js 射擊處新增 innocent 分支）：扣 1 命（`takeDamage`）+ `flashDamage` + **"OH NO!" 字卡** + **不給分** + `despawn()`。原版 "Oh no!" 對應。修掉「誤射平民還加分」的 bug。
- **stage1.json**：node A（t=4）波次加回 1 個 innocent。
- `__game` 加 `input` debug 出口（驗證射擊鏈用）。
- **驗證**：npm test 86/86；preview eval 走真實射擊鏈——打平民 HP 5→4 / score 0 / "OH NO!" 字卡 / 平民移除；回歸打 grunt 仍得分 300；平民移動 +5/2s 且壽命到自動跑走。（preview raycast 驗證的 aspect=NaN 與 matrixWorld 坑見 memory env-gotchas）

**後續**：disarmed 敵人也可走同一 `despawn()`（justice shot 後逃跑），併 B-phase2；平民外觀等 A 用真部件。

## F. stage2/3 關卡 + Boss

- GLB/camera.bin 已齊（stage2: 10000f、stage3: 4200f）。
- 複製 B 的方法為 stage2/3 佈波次；關卡選單已能選。
- Boss：原版每關有中 boss + 關尾 boss（stage1 結尾=直升機）。先用部件/簡單模型代替，行為（血條、多階段）寫進 LevelDirector。

### F 完成（2026-06-12，TDD）

**F-1 stage2/3 波次**（`29c2647`）：用 `analyze-path.mjs` 掃出真實戰鬥節點，重寫 stage2/3.json 錨定（clearPoint 閘門 + 平民 + boss + railDuration）。stage2 A@6/B@122/C@178/boss@222、duration 228（~230 切點前）；stage3（室內慢速）A@20/B@56/C@80/boss@126、duration 132。`verify-waves.mjs` headless 驗證 13+10 spawn 全在視野內、落真實節點。

**F-2 Boss 行為**（血條 + 多階段）：
- **`BossController`**（新，純邏輯 TDD）：依 boss HP 比例算階段（預設 3 階，閾值 2/3、1/3），跨閾值觸發 `onPhase` 一次；`hpFraction` 供血條。
- **`HUD.setBossBar(hp,maxHp)`/`hideBossBar()`**（TDD）：頂部紅色血條，fill 寬度=HP%。
- **main.js 接線**：`onBoss` 建 controller + 顯血條 + "WARNING" 卡；loop 抽 `updateBoss()` 每幀同步血條、跑階段、死亡隱藏；每階段 `onPhase` 出 2 隻增援（escalation）。loadStage 重置。玩家死亡路徑補 `hideBossBar()`。`__game` 加 `updateBoss`/`bossController` debug 出口。
- **忠實度註記（F review）**：
  - 移除了 "BOSS PHASE n" 字卡——**原版無此 UI**，多階段機制（增援/血條）保留，只是不顯示階段橫幅。
  - **"WARNING" 卡為暫代演出**，原版 boss 登場的實際表現待查證（可能是過場/特定字樣/音效）。查到再定；目前先放著當登場提示。
- **設計取捨**：boss 行為放獨立 `BossController`（非塞進 LevelDirector），關注點更清晰、可純測；LevelDirector 仍只管 wave/clearPoint/boss 計時。
- **驗證**：npm test 93/93（+5）；preview eval 真實 onBoss→血條 100%/WARNING、HP 7→phase2/fill 58%/+2 增援、HP 3→phase3/25%/+2、HP 0→血條隱藏+controller null。

**後續**：boss 用部件/真模型（等 A）；中 boss（每關兩個 boss）；stage1 結尾直升機。多階段行為可再細化（不同攻擊模式）。

## G. 音效/BGM 提取（獨立工程）

- `virtuacop2/` 原版檔內找音效資源（BIN/ 目錄、或 .exe 旁的音檔；先 `ls -R` 盤點副檔名）。
- jevarg repo 可能有 SOUND 格式文件。若是標準 ADPCM/WAV 包裝，寫提取器到 `tools/`；若無解，先用免費音效佔位（標明非原版）。
- 遊戲端 `audio/` 已有架構，接上即可。

### G 探勘完成（2026-06-12，第 1 刀）

**音訊資源全在 `virtuacop2/SE/`**（BIN/ 目錄全是 model/texture/motion/camera/scene/palette，無音訊；.exe 同層只有 BMP/DLL/HLP，無音訊）：

| 檔 | 大小 | 格式 | 內容 |
|----|------|------|------|
| `SOUND11.WVP` | 1.74 MB | WVP 容器，53 clip | 主 SE bank（22050/11025 Hz 混用） |
| `SOUND12.WVP` | 186 KB | WVP，2 clip | SE |
| `SOUND13.WVP` | 901 KB | WVP，28 clip | SE |
| `SOUND14.WVP` | 171 KB | WVP，2 clip | SE |
| `SOUND15.WVP` | 0 B | 空檔 | （無內容） |
| `SONG1.MDS` | 97 KB | RIFF/`MIDS` | BGM（streaming-MIDI） |
| `SONG2.MDS` | 14 KB | RIFF/`MIDS` | BGM（短曲，可能結算/選單） |

**jevarg 無音訊格式文件**（只有 model/texture/palette/exe 的 hexpat），但兩種格式都自證、不需逆向：

**WVP（SE）= 標準 16-bit PCM 的簡單自訂容器 → 分支 (a)，可直接提取：**
- Header 16 B：`"WVP\0"`(4) + uint32 clip 數 N + uint32 N−1 + uint32 0。
- Directory：N × **40 B (0x28)** entry，從 0x10 起。每 entry =
  - +0x00 **16-byte `PCMWAVEFORMAT`**：`wFormatTag=1`(PCM)、`nChannels=1`、`nSamplesPerSec`(22050 或 11025)、`nAvgBytesPerSec`、`nBlockAlign=2`、`wBitsPerSample=16`。
  - +0x10 uint32 fieldA（恆 0）、+0x14 uint32 **dataBytes**、+0x18 12 B 餘 + 末 dword 為遞增索引（提取用不到）。
  - WFX offset 實測 0x10/0x38/0x60/0x88 → stride 0x28 一致。
- PCM 資料區：directory 之後 `dataStart = 0x10 + N*40`，各 clip 的 raw PCM 依序串接（長度=各自 dataBytes）。
- 提取＝逐 entry 取 WFX + 切 PCM → 包成標準 RIFF/WAVE `.wav`。**→ 進第 2 刀**。

**MDS（BGM）= Microsoft `MIDS` streaming-MIDI（RIFF：`fmt `(12B, division=0x1e0=480) + `data`）：**
- **不是** H 等級的未知自訂格式（格式已識別、有微軟文件），但**不是 PCM**——是 MIDI 事件流。
- 要忠實播放需：MIDS→SMF(.mid) 轉換 + **瀏覽器端 MIDI 合成**（Web Audio + soundfont/JS MIDI player）。原版用 PC MIDI 合成器，音色取決於 soundfont。
- 這條 = 獨立中型子工程（MIDI 合成管線），**不在本次 SE 提取範圍**。建議：第 2 刀先把 SE（WVP→WAV）做完接好；BGM 是否現在做（引入 MIDI 合成）交回用戶/Fable 決定。

**第 2 刀（SE 提取 + 接線）IP 規則**：提取出的 WAV = 原廠資產 → 輸出 `game/public/assets/audio/`（gitignored），**絕不 commit、不進 CI/公開部署**（同 GLB）。public 部署維持現有合成佔位音。**聽不到音（preview 隱藏視窗）→ clip 索引語意（哪個是槍聲/中彈…）要用戶本機聽過確認**；提取器與接線只驗載入無 404、播放呼叫無錯。

### G 第 2 刀完成（2026-06-12，SE 提取 + 接線，TDD）

**已做：**
- **提取器** `tools/extract-stage-assets/`：純 reader `lib/wvp-reader.mjs`（`readWvp` 解容器 + `pcmToWav` 包 RIFF/WAVE，**4 個 node:test**，合成 Buffer 釘樁，沿用既有測試風格）+ CLI `extract-audio.mjs <virtuacop2> [out]`。實跑提出 **85 個 WAV**（SOUND11=53/12=2/13=28/14=2，SOUND15 空跳過）+ `manifest.json` 到 `game/public/assets/audio/`（gitignored，已 `git check-ignore` 確認不會被 commit）。
- **遊戲端接線** `game/src/audio/`：`AudioManager` 加 `loadSamples()`（fetch+decodeAudioData，404→留合成佔位）、`_playSample()`（每個 SE method 先試真音、無則 fallback 合成）、`audition(file)`（dev helper 供用戶逐 clip 試聽）；新增 `reload()`/`card()` method。`se-manifest.js` 一處集中 logical name→clip 檔（**佔位 mapping，依時長猜，標明 USER 要聽過校正**）。main.js：boot `audio.loadSamples()`、reload handler（手動+自動）接 `audio.reload()`、JUSTICE SHOT 字卡接 `audio.card()`、`__game.audio` 出口供試聽。
- **驗證**：game 121/121 + tools 18/18（+4 WVP）；preview 實跑——5 個 clip 全 HTTP **200（無 404）**、全 decode 成 AudioBuffer、5 個 SE method 呼叫無 throw（ctx running、走真音非合成）、`audition('sound13_00.wav')` 無錯、boot log「loaded 5 original SE clips」。

**待用戶（聽過校正）**：`se-manifest.js` 的 clip 索引是依時長猜的佔位，哪個 clip 是槍聲/中彈/reload/JUSTICE SHOT 語音要本機 `__game.audio.audition('soundXX_NN.wav')` 試聽後修正（85 clip 清單見 `/assets/audio/manifest.json`）。

**BGM（MDS/MIDS）未做**：需 MIDS→SMF + 瀏覽器 MIDI 合成（soundfont），獨立中型工程，交回用戶/Fable 決定是否現在做。

## H. MOT*.BIN 動作逆向（最難，最後做）— A 的真實前置

- 目標：MOTCMN/MOTSTG1…BIN → 骨架關鍵幀，驅動 A 組裝的部件（原版就是部件式骨架動畫，不需 skinning）。
- jevarg **未**逆向 MOT（explorer core 只有 Models + Textures parser），無現成文件可抄。
- 產出：`tools/extract-stage-assets/lib/motion-reader.mjs` + 遊戲端 `MotionPlayer`。
- 這項建議用較強模型做（逆向工程試錯成本高）。

### MOT 探勘結果（2026-06-12，工具 `tools/extract-stage-assets/analyze-mot.mjs`）

對 MOTCMN.BIN（343KB）+ MOTSTG1.BIN 做結構分析：
- **基本 record = 12 bytes（Vec3-like），跨檔不變量**：MOTCMN stride 自相關 12 最高（諧波 24/36/48）；MOTSTG1 同樣 stride 12 最高且 121992÷12=10166 整除。格式穩定。
- **檔頭無目錄/offset 表**，資料直接開始；檔尾無乾淨 footer。→ 動作段/骨架/幀數邊界要間接推斷（比 CAMMOV 難，後者是無腦定長 16-byte）。
- 主體為高頻變動的密集逐幀 Vec3（僅開頭一小段平滑遞增）；散布 513 段 8–9 byte zero-run（疑似區塊分隔）；混合型別（~25% 小浮點，餘為 int16/結構欄位）。
- **角度編碼推測**：沿用 CAMMOV 慣例（int16 滿幅=±180°）機率高，待驗。

### 忠實靜態組裝（H-lite/bind-pose）需要三塊，目前進度

1. ✅ 動畫/transform 數值流 —— 已定位（12-byte Vec3 record）。
2. ⚠️ 骨架結構（骨數/階層/幀數/動作邊界）—— 無 header，未定位，需深入 RE。
3. ⚠️ **bone → P_COMMON model_N 對照**（關鍵樞紐）—— MOT 內未見。可能在 ppj2dd.exe/DLL（前例：貼圖包 metadata 就在 EXE），**但風險可能被高估**，見下方「攻 H 的優先假設」。

**判斷**：即使只取 frame-0 bind-pose，仍需 #2+#3，與完整逆向同一個問題，無捷徑。屬多 session RE 工程（符合 roadmap「H=大/高難度」）。

### 攻 H 的優先假設（2026-06-12 用戶提示 — 已被 H-1 探勘超越，留作紀錄）

1. ~~「部件順序即骨架順序」慣例~~ → **實際更好：EXE 有顯式角色表**（見下），不用猜順序。部件確實按角色連續分佈（例：21..35 一隻角色），但骨序由表給定。
2. ~~MOTCMN 開頭浮點表疑似骨長表~~ → 實為**第一個動作的 root 位置通道**（動作 0 = 起身，y 從 0.54 平滑升到 0.86）。骨長不在 MOT 內。
3. 角度編碼 int16 滿幅=±180° → 仍是工作假設，待視覺驗證。

### H-1 格式破解完成（2026-06-12，Fable session）— 三大未知全數解決

**方法**：循貼圖 metadata 前例直攻 ppj2dd.exe，全部結構在 EXE 資料區找到，零 DLL 反組譯。

**1. EXE 檔案載入表 @0x71268**（20B/筆 = 16B 檔名 + u32 固定載入位址）：
`MOTCMN.BIN→0x576000`、stage MOT 共用 `0x5d69d0`（一次載一個）、`MOTINT→0x536000`、`P_COMMON→0x6069d0`、`P_STGxC→0x6569d0`。這些位址是後續所有指標掃描的鑰匙。

**2. 動作目錄 @0x52d48**（EXE 內有 7 份相同副本）：272 個 u32 指標 = **136 個動作 × (rootPtr, rotPtr)**。`F=(rot−root)/12`；136/136 驗證 `next = rot + F×80`；**Σ F×92 = 343344 = MOTCMN 檔案大小，byte-exact**。幀數 1–75，共 3732 幀。

**3. 動作格式**：每動作 = `[root 位置通道 F×Vec3 float32][旋轉通道 F×40 int16]`。40 個 int16 通道跨幀全平滑（mean|Δ|<2000）。**40 = 13 動畫骨 × 3 歐拉角 + 1 pad**（15 部件中兩隻手為剛性附掛）。

**4. 角色→部件表 @0x8f298**：NULL 結尾變長清單，**43 個 rig**（42×15 部件 + 1 個黏連段 25=10+15，缺一個 NULL；10 部件 = **上半身限定 rig**，原版窗戶/掩體探頭敵人）。指標→`P_COMMON 基址+model×16` 或 stage 包基址（boss 用 stage 部件）。

**5. 槽位語意**（bbox 分類，多重旁證自洽）：
`0=軀幹, 1=頭, 2-4=臂A(上/前/手), 5-7=臂B, 8=骨盆, 9-11=腿A(大/小/腳), 12-14=腿B`。
旁證：槽 4/7 跨角色共用成對 model（194/192、195/193、12/10…）=**持槍手**（justice shot 部位！）；槽 11/14 共用鞋款家族（84/83、123/122、182/181、398/397）；row 29 用 model 0–14（主角級角色）。

**6. 部件建模慣例**：關節在原點、沿骨軸延伸（bbox center 一致單側偏）→ **骨長/接點可由部件幾何推導**（部件沿軸延伸長度≈到子關節距離）。顯式 bind offset 表未找到（候選：motion 表前 0x52c80 的 int16 角度狀區塊，189 開頭，未解）；視覺迭代時校正即可。

**產出**：`tools/extract-stage-assets/lib/motion-reader.mjs`（readMotionDirectory / readMotion / readCharacterTable）+ 6 測試（4 合成 + 2 真實檔整合，無原版檔時自動 skip）。工具測試 24/24。

**H-2 待辦（下一刀，視覺組裝）**：
1. ✅ `extract-motions.mjs` CLI：動作+角色表 dump 到 `game/public/assets/common/`（motions.bin + characters.json，gitignored）。角色表實為 **47 隻 rig**（45 全身含 8 隻 stage 部件 boss + 2 隻上半身；H-1 的 43 是概數）。
2. ✅ `CharacterAssembler` + 慣例破解（2026-06-12，本 session）。**重大修正，推翻 H-1 #3 的「13 骨×3+pad」**：
   - **ch39 不是 pad**（全幅變動）。40 通道 = **16 關節**：`[root姿態3][torso3][head3][上臂A3][肘A1][手A3][上臂B3][肘B1][手B3][骨盆3][大腿A3][膝A1][腳A3][大腿B3][膝B1][腳B3]`。
   - 鐵證：ch12/ch19 全 3732 幀 ≥0（肘）、ch29/ch36 全 ≤0（膝）——4 個單向鉸鏈通道；12 球關節 −1 虛擬 root = 11+4 = 15 = 部件數（手有腕通道，非剛性）。
   - **角度慣例**（stance-foot-slide 自動搜索 1728 組合 + 視覺確認）：通道存 (z,y,x) 即 `perm=[2,1,0]`、sign=(+,−,−)、euler 順序 ZYX、鉸鏈軸 −z。int16 滿幅=±180° 證實。
   - **層級**：torso 直掛 root（非 pelvis 下）；pelvis 區塊帶結構性 −90°（ch23/25），只當「腿部空間轉接器」。骨長由部件幾何推導（關節在原點、沿 −x 延伸、左右 z 鏡像）成立。
   - **槽位≠model 序**：row 30 hero rig parts=[8,2,4,14,11,3,13,9,5,7,1,84,6,0,83]（slot4/7=自有手、slot11/14=共用鞋 84/83）。
   - 驗證：motion 117（跑步）整週期換腿/揮臂/root 前移全部正確。工具：`search-conventions.mjs`（慣例搜索）、`game/viewer.html`（?char&motion&frame + window.viewer hooks + /__shot 截圖 sink，繞開 preview rAF/screenshot 凍結坑）。
   - 殘留小修：足部偶有角度怪、髖部一塊未貼圖 quad 待查、背心背面文字鏡像（疑原版 UV 即如此）、肩點/骨盆寬度可再微調。
3. ✅ `MotionPlayer`（30fps 逐幀+插值；int16 環繞減法天然給最短弧，loop 末幀 blend 回 0）。viewer hooks：`playMotion(idx)/step(dt)`。
4. ✅ **H-3 真部件接進遊戲（2026-06-13，本 session，TDD）** — 同時完成 roadmap **A**（角色靜態組裝）。

### H-3 完成（2026-06-13）— 原版角色部件取代程序化人形

**已做（+10 測試：CharacterFactory 8、EnemyManager 整合 2）：**
- **`CharacterFactory`**（新）：`build(type)` 用 `collectParts`+`CharacterAssembler` 組一隻**獨立**角色（部件 clone），包成 wrapper Group：外層 wrapper（EnemyManager 設世界座標/scale/billboard yaw）→ 內層 grounded group（把姿勢後的角色抬到腳底 y=0、套 `FACING_YAW`）→ asm.root（動作驅動）。三層分離讓 billboard/縮放不打架動作。`assembler` 存在 `wrapper.userData` 供日後動畫。`loadCharacterFactory()` GLTF 載 P_COMMON + 動作資料，缺檔（gitignored）回 null → 程序化 fallback。
- **敵種→rig 對照表**（`TYPE_TO_RIG`，**佔位待校正**，同 SE manifest）：grunt=8、gunman=9、heavy=0、boss=30（hero 綠迷彩 commando）、innocent=7。全選**純 common-pack rig**（避開 stage 部件 rig 全黑問題）。
- **靜態姿勢校正**：`DEFAULT_POSE = motion 24 frame 0`（直立戰鬥站姿，頭抬、臂垂——viewer 內逐 motion 量「頭高×軀幹垂直×臂未舉」挑出；motion 0 frame 0 是 getting-up 蹲姿，否決）。`FACING_YAW = +π/2`（部件朝 local +x，轉 +90° 讓胸口對 billboard 的 +z＝玩家方向）。**（後於「H-3 動畫」刀改為 π——因 root 朝向被 anchorRoot 中和。）**
- **EnemyManager 接線**：`setCharacterFactory` + spawnWave 優先用 factory，失敗退程序化 template，再退 box；typeScale 重構成對 factory/template 都套。lock-on zone **自動接上**（slot 自帶 head/hand/body tag，clone 保留）。
- **共用 `toUnlit`**（抽 `render/unlit.js`，StageEnvironment/viewer/factory 共用，了結 roadmap A 註記的去重）。viewer 加固定畫布尺寸 fallback（隱藏 preview window innerWidth=0 → 0×0 canvas/blank shot 坑，`?w=&h=` 可覆寫）。
- **驗證**：game 148/148 + tools 26/26。preview 實跑——factory 載入（136 motion / 47 rig）；5 種敵全組出真貼圖部件（高 ~1.6u、腳底 y=0）；billboard yaw 精確對相機；相機→敵 raycast 解 head→head（爆頭）/torso→body，resolveEnemy 對到同一敵（lock-on/justice-shot 鏈完好）。viewer 截圖確認 grunt（橘背心紅護肩）、gunman（綠衫牛仔褲）、boss（綠迷彩 commando）皆正確貼圖、面向玩家。

**待用戶/後續：**
- ~~**`TYPE_TO_RIG` 是佔位**~~ → **已校正（2026-06-14）**：新增 `contact-sheet.html`（一次渲全 47 rig 對照表、標現有對應、`?only=` 渲子集，POST 到 /__shot），逐隻目視挑出 grunt #3（深西裝打手）／gunman #12（藍夾克）／heavy #16（赤膊壯漢）／innocent #26（紅大衣女性，明確平民）／boss #30（綠迷彩，沿用）。全選乾淨全身 15-part common rig（避開 stage* 全黑 rig）。原版確切身分無文件，依視覺辨識度挑（各 type 一色、平民一眼可辨），仍可再調。
- ~~動畫為下一刀~~ → **已完成**，見下「H-3 動畫」。
- **殘留視覺微調**（沿用 H-2 清單）：腿偏寬蹲姿（motion 24 站姿＋髖寬/足角）、髖部未貼圖 quad、背心背面鏡像字。
- **stage 部件 rig（含真 boss）全黑待查**：本次 boss 用 common rig(char30) 迴避；要用原版 stage boss 部件需先解 stage-pack 貼圖全黑。

### H-3 動畫完成（2026-06-13，本 session，TDD）— 移動敵人播放真實步態

**重要發現**：MOT 動作集**沒有「待機 idle」**（每個動作都會位移；嚴格掃「腳定點＋直立」全空）。原版敵人是「擺好姿勢等→開火」，不是呼吸式 idle。所以**只動會動的敵人**：逃跑的繳械敵人=跑、平民=走；站樁瞄準的敵人維持 `DEFAULT_POSE` 靜態站姿。

**已做（+5 測試：assembler anchorRoot 1、factory 2、EnemyManager 2，共 153 game / 26 tools 全綠）：**
- **`CharacterAssembler.anchorRoot`**：開啟時 `applyPose` 讓 root group 維持單位變換——**忽略動作的 root 位移（channel root）與整體朝向（channel 0）**，只動子骨。原因：**每個動作把不同的 root yaw 烤進 channel 0**（motion 24=1.688rad、走/跑=0），不中和的話跑步會比瞄準姿勢轉~97°。中和後**所有動作共用一個朝向**，朝向交給外層 wrapper 決定。
- **`FACING_YAW` 由 π/2 改 π**（重新校正）：因 root 朝向被中和（identity），胸口對 wrapper +z 的偏移變成 π。靜態站姿/走/跑全部適用同一常數。
- **`CharacterFactory.playLocomotion(wrapper, kind)`**：在角色 assembler 上起一個 loop `MotionPlayer`（`RUN_MOTION=117` 跑 / `WALK_MOTION=134` 走，皆 H-2 確認的步態），設 anchorRoot 原地播放，並**依該步態重新 ground**（靜態 grounding 是 motion 24 的腳位，步態腳位不同→重算，腳浮從 0.2u 降到 ~0.05u）。
- **EnemyManager 接線**：drift 分支內，移動敵人**面向行進方向**（`atan2(drift.x,drift.z)`）而非相機——否則橫越畫面的跑者會「月球漫步」；並每幀步進 per-enemy `_locoPlayer`（fleeing→run、innocent→walk）。程序化 fallback 無 assembler 時自動略過。
- **驗證**：preview 實跑——平民 VISIBLE 後膝蓋鉸鏈逐幀變動（0.679→1.083，動畫活的）、面向行進方向、腳貼地（浮 −0.03~−0.06u）；靜態 grunt 無 loco player、面向相機（billboard 配 FACING π 正確）；viewer 截圖確認走步態直立面向前方。

**後續/可調**：~~死亡專屬動作~~ → **已完成**（見下「H-3 死亡動畫」）；開火/中彈專屬動作仍待（語意未考證，開火現為靜態瞄準姿、中彈無反應）；emerge 起身動作（motion 0 是起身但原版是掩體探頭，語意存疑）；步態 root 朝向若含轉身會被中和掉（目前走/跑 root yaw≈0，無妨）。

### H-3 死亡動畫完成（2026-06-14，本 session，TDD）— 中槍倒地取代閃爍

**動作語意逆向**（同 rig 校正的「資料啟發式 + 視覺確認」套路）：MOT 無文件，先用資料找候選——掃 136 motion 的 root-Y 剖面，一群 motion 的 root Y 從站立 ~1.0 崩到貼地 0.1–0.4 = 倒地動作。新增 dev 工具 `game/motion-strip.html`（一動作一列、橫向取樣 N 幀、**anchorRoot OFF** 讓 root 位移/翻倒看得見、POST /__shot）視覺確認，挑出 **motion 65 = 經典後仰中彈倒地**（recoil→後倒→平躺，橫移僅 0.6u）。開火/中彈反而難抓（幾無「短、原地」手勢 motion，root 看不出），留後續。

**已做（+3 測試：CharacterFactory death 2、EnemyManager death 1，共 156 game / 26 tools）：**
- **`CharacterFactory.DEATH_MOTION=65` + `playDeath(wrapper)`**：起一個非循環 `MotionPlayer`（末幀自動定格＝定格倒地姿）。關鍵與 locomotion 不同——**`anchorRoot=false`**，讓動作自帶的 root 位移＋翻倒朝向真的把身體放倒（locomotion 是 anchorRoot=true 原地播）。播前 `update(0)` 取 frame0（≈站姿）再 `groundFeet` 對齊起點，之後 root 下降即倒地。抽出共用 `groundFeet(asm)`（build/locomotion/death 三處共用，去重）。
- **`Enemy.DYING_DURATION` 0.5→1.4**：涵蓋倒地動畫（40f@30fps≈1.3s）播完才移除。dying 仍計入 aliveCount，故 clearPoint 在最後一殺後多等 ~0.9s（可接受）。
- **`EnemyManager` 接線**：DYING 時——有 assembler 走 `playDeath`（起一次、每幀步進、**不閃爍**）；程序化 fallback 維持閃爍。並**凍結 billboard 朝向**（DYING 不再轉去面相機，否則倒下的屍體會邊倒邊轉）。
- **驗證**：156 game + 26 tools 全綠；motion-strip 視覺確認後仰倒地；**preview 端對端**（真實 stage1、真 grunt #3）——擊殺→死亡播放：root Y `1.038→0.129`（站→倒地單調下降）、`visible` 全程 true（無閃爍）、朝向凍結 `-1.192` 不變、step 41(≈1.37s) 移除、無 throw。

### A-lite 中間路線（存查，目前不做）

「截圖對照、手工把某敵人的原版部件擺成站姿」嚴格說**比程序化替身更貼近原版**（部件/貼圖是真的，只有關節位置目測），不算違反忠於原版。但需先從 441 個 model 視覺分類出某敵人的部件（中等 token 成本），且 H 解出後會被整個取代。→ 除非急著看原版角色觀感，否則不值得現在花。

## A 項決議（2026-06-12）

A 依賴 H（見上）。靠 bbox 硬擺 = 自創，否決。建議路線：**先做 B → C → D**（無角色依賴、高確定性忠實度），角色暫留程序化替身（明標 placeholder）；MOT/H 留作專門 session、用較強模型集中攻。（待用戶最終定）

## I. 雜項

- [x] `git push` — 持續同步（最新 2026-06-14 `355c429`）；維持「用戶說才 push」。
- [ ] 相機 FOV 校正：**現值 fov=60／near 0.1／far 3000**（preview 量得）。原版 Model 2 約 4:3、FOV 偏窄。**需用戶提供原版實機截圖對照**才能定值。
- [x] 效能 stage 幾何 merge：**已完成（2026-06-14）**。詳見下方「效能 merge 完成」。
  - 量測（merge 前，2026-06-14）：drawCalls **3982**、triangles 僅 **~23K**（in-frustum）、geometries 8397、場景 mesh 9870 → **draw-call bound**（平均 ~6 三角/call、上千個微小獨立 mesh）。
  - preview 取用內部物件：`__game.renderer.webgl`＝THREE WebGLRenderer（`.info.render.calls`/`.memory`）、`__game.renderer.camera`＝相機、`__game.renderer.scene`＝場景（`__game.renderer` 本身是自訂 Renderer 包裝，無 `.info`）。
- [ ] `assets/` 在新 worktree 需手動複製（已知坑，HANDOFF 有記）

### 效能 merge 完成（2026-06-14，TDD + preview 前後對比）— stage 靜態幾何依材質合併

stage1 是 draw-call bound（上千個微小獨立 mesh）。把 `StageEnvironment` 載入的靜態 stage
幾何**依材質/貼圖 merge** 成「每材質一個 geometry／一個 draw call」。

**已做（+14 測試，純函式單測）：**
- **`render/mergeStatic.js`**（純函式）：`mergeStaticMeshes(root, {consume})` traverse 收 mesh、依
  `materialKey`（貼圖 uuid＋color＋transparent/opacity/alphaTest/side）＋屬性簽章分組，
  每組 clone 幾何→**`deleteAttribute('normal')`**（unlit 不需法線，省 buffer＋讓更多 mesh
  同屬性可併）→**`applyMatrix4(matrixWorld)` 烤世界座標**→`BufferGeometryUtils.mergeGeometries`，
  每組產一個 `Mesh`（沿用原材質/貼圖）、回傳新 Group。
  multi-material mesh（GLTFLoader 實際不產，防禦性）world-bake 原樣帶過；merge 失敗回退逐 mesh。
  - **預設純粹**（clone 幾何、不動 root）供單測；**`consume:true`** 重用/吞掉原幾何免上千次 clone（載入快）——
    內含**共享幾何防呆**（先掃 uuid 計數，被 >1 mesh 共用的幾何仍 clone，避免就地 `applyMatrix4` 汙染他人）。
    consume 後呼叫端**不可**再 dispose 原幾何（已重用或內部 dispose）。
- **`StageEnvironment.create` 接線**：`toUnlit` **之後**才 merge（順序要點：先統一 unlit 材質再分組），
  用 `consume:true`、不再 dispose root，env.root 換成 merged group。fallback（無 GLB）路徑不變。
  `groundYAt` raycast 對 merged root 照常運作。**dev 旗標**：`?nomerge` 跳過 merge（A/B 對照）、
  `?perfdebug` 印每 chunk＋前後三角數（抓掉幾何/壞 chunk；平常關閉，零 traverse 成本）。
- **為何烤 `matrixWorld` 普世正確**：P_STG 包頂點已烤世界座標（node transform=identity）→
  `applyMatrix4(identity)` 是 no-op；若 node 帶 transform 也會被收進去。兩種情況皆對，
  不需先判斷 GLB 怎麼擺。
- **只動 StageEnvironment 靜態件**，完全不碰 CharacterFactory 敵人/平民（動態件、帶 raycast zone tag）。

**驗證（preview 實跑 stage1，真 GLB）：**
- **同相機 pose 的 render-only A/B**（`webgl.render` 直接計時，排除 game logic／相機漂移）是本刀硬證：

  | 同 pose | NO-MERGE（原始）| MERGE |
  |---------|-----------------|-------|
  | env mesh | 9406 | **1251** |
  | draw calls | 11442 | **1461**（−87%）|
  | 三角（drawn）| 70254 | 145374 |
  | **render 時間** | **305.5ms** | **34.8ms（~9× 快）** |

  - **三角數反而上升**（merge 讓 frustum culling 變粗：寬 merged mesh 只要一角入鏡就整顆畫）——但
    **場景是 draw-call bound，145K 三角對 GPU 微不足道，11442 draw call 才是殺手**，故淨贏 ~9×。
  - 注：開場第一幀稀疏視野只 ~466 call；上表是看向街道縱深的較滿 pose。兩者皆遠低於同 pose 的 nomerge。
- **無幾何遺失**：`?perfdebug` 量得 4/4 chunks（20400+18764+22046+4432）、**65642→65642 tris**、9406→1251 mesh。
  「街道感覺空」是**原版 stage1 本來就只 ~65K 三角**的密度，非本刀掉東西。
- **載入成本**：consume merge 為**一次性主執行緒 ~600–750ms**（clone 只佔 ~140ms，主成本是 `mergeGeometries`）→
  stage 開場有一下凍結；之後 gameplay 渲染快 ~9×，權衡划算。
- 170 game 測試全綠（156＋14 新）；`groundYAt` 命中 y≈−9.8 照常；全程 0 console error。
- **到不了「十位數」的原因**：1251 merged mesh＝1251 個相異（貼圖×color×layout）組——stage 用了上千張
  相異貼圖，**相異貼圖不能併同一 draw call（除非做 texture atlas）**。draw-call −87% 已是 merge-by-material
  的上限收益；**下一步若要更順＝texture atlas**（更大工程，本刀範圍外）。

### 載入時間 — 平行化 + LOADING 指示（2026-06-14，用戶回報「選關→開打 5–10s 卡在載入」）

用戶試玩回報痛點其實是**載入時間**（非 gameplay 掉幀）。`main.js loadStage` 加每階段計時（log `[load]`）找瓶頸：

- **量得**（preview 隱藏窗 throttle ~6×，看比例）：`level ~0 | enemyModels ~50ms | factory ~28.7s ∥ env ~34.2s | camera ~0.1s`。
  瓶頸＝**GLTFLoader 解析 P_COMMON（factory）＋ 4 個 stage GLB（env）**，本來**序列 await**（互不相依卻一個接一個）。
  merge 只佔 env 的 ~0.6s，非主因。`level` 首次量到 5.5s 是 throttle 首抓暖機假象（再量 23ms）。
- **修法**：factory 與 env 改 `Promise.all` 平行 → wall-clock 從「和」變「max」（throttle 窗 ~63s→34s，**~1.8×**；
  factory 第一關後 cache，後續關只剩 env）。**dev log 保留**（`[load] stage1: ... | TOTAL Xms`）。
- **LOADING 指示**：原 `startGame` 一點就 `hideOverlay()` → 整段重載入**畫面全黑**＝「卡住」感。改成
  `showOverlay('loading')`（藏 stage/難度選鈕、顯「LOADING…」）撐到 stage 建好才 `hideOverlay()`；
  加 `loading` 旗標防連點重複載入。preview 驗證：載入中顯 LOADING→ready 轉 gameplay；敵人仍用真部件；170 測試綠。
- **真正的下一刀（load + draw-call 雙殺）＝離線預 merge**：把 stage GLB 在 `tools/extract-stage-assets` 抽取時就
  **依材質 merge 後再寫檔**（出 1251-mesh GLB 而非 9406），則執行期**解析更快 + 免 runtime merge（省那 0.6s）+ 開場免凍結**。
  需改抽取工具並重生 GLB（gitignored 資產，用戶本機重跑），屬獨立中型 cut。texture atlas 可一併在該管線做。

### 開槍在 CLEAR_POINT 失效修正（2026-06-14，`6b2792a`，用戶回報「按開槍沒反應」）

**現象**：用戶用筆電控制板按鈕開槍「沒反應」。**根因不是輸入**——`click`（含控制板左鍵）在 PLAYING 正常觸發。
是 `main.js` 的開槍/換彈 handler 都 gate 在 `state === PLAYING`，但**每個戰鬥節點相機會停在 `CLEAR_POINT`
狀態**（要清完該點敵人才前進）。所以一到第一個節點（stage1 node A，t=4）→ state=CLEAR_POINT → 點擊全被擋
→ 節點永遠清不掉 = **softlock**。preview 實證：PLAYING 點擊 ammo 6→5、CLEAR_POINT 點擊 ammo 不變（擋掉）。

**修法**：`GameManager` 加 `get inPlay()`（`PLAYING || CLEAR_POINT`），開槍 gate、換彈 gate、lock-ring gate、
frame loop gameplay gate、startGame 防護**全部統一用它**（後三者本來就等價，併成單一真實來源）。+1 測試。
preview 驗證：CLEAR_POINT 下開槍 6→5、右鍵換彈 2→6 都正常；171 綠。

### 玩家武器 view model 仍是佔位（待真資產）

`render/WeaponViewModel.js` 是**程序化佔位手槍**（3 個 box＋1 cylinder：滑套/槍管/握把，無原版貼圖；
程式碼註明 placeholder）。後座力動畫真實（recoil 純函式可測），但外觀陽春。**真實路線**＝從 P_COMMON 提原版
玩家槍模型（附錄點 4：P_COMMON 含「武器」部件），同 rig 校正套路（contact-sheet 目視找出哪個 model 是玩家槍
→ 取代佔位）。需先視覺辨識正確 model，屬小-中 cut，**待用戶要做時開工**。

## J. 自創關卡支援（2026-06-14，`4946969`）— 用戶要做自己的關卡

stage1 視覺完成後，用戶要「做自己的關卡」，選了「**在現有場景上排新波次**」路線（重用既有 stage 幾何＋相機軌道，自寫波次）。

**做法（一個 commit，TDD + preview 驗證）：**
- **`baseStage` 解耦**：關卡 JSON 可加 `"baseStage": "stage1"|"stage2"|"stage3"` 重用該 stage 的幾何＋相機（＋factory/models）。`main.js loadStage` 把所有資產載入改用 `const baseStage = level.baseStage ?? stageId`，而**關卡自身的 `id` 仍是 gameplay/HUD 身分**（gameMgr、START 卡）。
- **自動發現**：`LevelLoader` 改用 `import.meta.glob('./levels/*.json', { eager:true })` 掃描所有關卡 JSON；`load(id)` 依 JSON 自帶的 `id` 查找；`list()` 給選單（base stage 優先、custom 字母序）。**作關卡＝丟一個 JSON 進 `levels/`（給唯一 id）即自動上選單**，零改碼。
- **動態選單**：`buildOverlays` 由 `LevelLoader.list()` 生按鈕（取代寫死 stage1/2/3）；`prettyLabel` 把 id 轉「Stage 1 / Custom 1」。
- **範例＋模板** `levels/custom1.json`：「Custom 1 — Harbor Assault」，`baseStage:stage1`、用 stage1 已驗證乾淨的 dwell 點（4/74/173）＋更兇的自訂波次（gunman/heavy 加重）、boss hp16。`_notes` 寫滿作關卡教學（座標語意＝相機相對 x=右/-z=前/y=0 落地、clearPoint=相機停到清完、各 stage 乾淨 dwell 點清單、用 analyze-path/verify-waves）。
- **+4 LevelLoader 測試**（185 game 綠）。

**驗證**：preview 選單顯 Stage 1/2/3 + Custom 1；custom1 載入 stage1 幾何＋相機（9118 幀）跑自己的波次（`id=custom1`、`baseStage=stage1`、void floor −11 套用）；驅 director 到 t=4，wave A 在乾淨 harbor 開場 spawn grunt×3＋gunman 全在視野、接地、無遮蔽。**踩到的坑**：先試 `baseStage:stage2`，但 stage2 的 t=6 dwell 點相機貼著大樓面、spawn 被遮蔽（敵在視野內但牆擋住）→ 改用 stage1 已驗證乾淨的 dwell 點。**教訓：dwell 點要目視挑「開闊無遮蔽」的，光是相機會停不夠**（同 B-phase3）。

**下一步（用戶導向）**：用戶可複製 custom1.json 作更多關；要做 stage2/3 為底的關卡須先 `analyze-path` + preview 目視挑乾淨 ambush 點（stage2 部分 dwell 點貼牆）。其餘獨立工程：玩家槍真模型、SE/FOV 校正、BGM、開火/中彈動作（皆見上）。

---

## 附錄：P_COMMON 探勘結果（2026-06-12，A-1 完成）

探勘工具：`tools/extract-stage-assets/inspect-glb.mjs`（用 @gltf-transform/core 在 Node 直接讀 GLB，逐 node 算 bbox/中心/三角數/貼圖，避開 preview 的 rAF 凍結坑）。

### 關鍵發現（推翻 A 項原假設）

1. **P_COMMON.glb = 441 個 model node，全部建在原點**（每個 node 無 transform，bbox center ≈ (0,0,0)）。整體 bbox 僅 `size(3.3, 4.0, 6.1)`，所有部件重疊在原點，**組裝位置不在幾何裡**。
2. **原版 model 格式沒有任何 per-model transform / 位置 / 階層 / parent**——已用 jevarg 權威定義 `tools/re-virtua-cop-2/imhex/models.hexpat` 核實：Model header 只有 3 個指標（vertices/faces/materials）+ vertices_count + faces_count + 1 flag byte。
3. **對照組：P_STG10.glb（場景包）的部件是世界座標烤死的**（model_94 center `(-91.6,-9.9,248.2)`、model_96 `(-272.5,...)` 散在世界各處）→ 所以 StageEnvironment 直接載入位置就對。P_COMMON 與之相反，是 local-space 部件袋。
4. **441 個 model 混雜**：含真 3D 部件（model_340/373 等，z 深度 0.7~0.9）與大量平面 sprite（z=0，多為準星/槍口火花/UI/陰影，例 model_438 是 y=-1.2 的地面陰影平面）。遠超過一個角色 → P_COMMON 裝了所有角色（多敵種/平民/人質）+ 武器 + 特效。

### 組裝位置在哪裡

- **MOTCMN.BIN（343KB，BIN/ 最大的共用動作檔）** 才是骨架 + 各部件相對關節位置 + 逐幀動作。開頭是一張浮點表（0.54, 0.0006, 0.566…）。
- 同類：MOTSTG1/2/3.BIN、MOTADV.BIN、MOTINT.BIN、MOTFAED.BIN。
- **SCENE*.BIN** 是場景實例清單（model 指標 + 世界座標 XYZ），但 stage 包頂點已烤死世界座標，遊戲端用不到。
- **jevarg 未逆向 MOT/SCENE**（explorer core 只有 Models + Textures parser）→ A 沒有現成參考。

### 結論：A 依賴 H

「靠 bbox 對齊把頭/軀幹/四肢擺到關節」不可行——所有 3D 部件都疊在原點，硬擺等於自創（違反「忠於原版」）。**忠實的靜態組裝需要 MOTCMN.BIN 的 frame-0 bind-pose**，也就是 roadmap 的 H 項（最難）。A 與 H 實際上耦合，A 的前置不是「無」而是「H-lite（至少解 MOTCMN 骨架階層 + 第 0 幀關節 transform）」。

→ 路線調整見下方「A 項決議」（待用戶定）。

---

## ⚠️ 最新狀態 / 下次接手（2026-06-14）— stage2/3 相機檔對調已修，波次待重排

> **新 session 開工先讀這段。** 記憶亦有 [[project-vc2-stage-camera-swap]]。

**這次做了什麼**
1. **stage2/3 波次收尾嘗試（先做、後作廢）**：把 stage2/3 的散兵 transit 波改成 clearPoint 伏擊 arena（stage2 A2@40 / B2@95 / B3@165；stage3 A2@46 / 刪 t=70 / BC2@112）＋ 補 void floor（`StageEnvironment.VOID_FLOOR_Y` 加 stage2 −13、stage3 −8）。當時 verify-waves 22/22＋14/14、無掉層/遮蔽、185 測試綠。**但 preview 目視發現 stage2 整關空曠**（敵人站在灰地上、背景一艘遠船），追下去才發現是更底層的問題。
2. **診斷出根因＝相機檔對調**：原版有 4 個 CAMMOV（0/1/2/3）對 3 關，`tools/extract-stage-assets/extract-camera.mjs` 的 naive `0/1/2→stage1/2/3` 對應錯了。鐵證＝「相機每幀落在各關幾何 bbox 內的比例」矩陣：**CAMMOV1 只 6% 落在 stage2 幾何、100% 落在 stage3**；CAMMOV2 100% 落在 stage2。先排除過「extract 不完整」（否，stage2 1921 model 完整解析、只是擠在 ±300）與「忽略 SCENE 實例」（否，SCENE2x 座標也只 ±300、沒到相機的 ±1100）。
3. **修復（已 commit）**：`extract-camera.mjs` 的 `STAGE_MAP` 改成 **stage2←CAMMOV2、stage3←CAMMOV1**（CAMMOV3 是 ~6s 非關卡 clip）＋ 重抽 camera.bin（gitignored）。**preview 實證**：stage2 = 碼頭/航廈室內（柱子/紅地毯/牆）、stage3 = 濱海道路，相機都正確落在幾何內、場景完整。

**下次接手要做（＝完成原版的最後一塊）**
- **stage2/3 波次全部重排**：舊波次（含本次排的 arena）都是照對調的錯相機排的，**全作廢**。工作目錄裡 `stage2.json` / `stage3.json` / `StageEnvironment.js` 的改動是 **superseded WIP**（可 `git checkout -- …` 還原後重寫，或直接覆寫）。
- 照 **B-phase3 套路**：對**修正後**的相機跑 `analyze-path` → 挑 clearPoint arena（敵人 z −12..−21）→ `verify-waves` + preview 目視落地/取景。
  - **stage2（現 140s / CAMMOV2）停頓點已掃出**：開場 t≈4、t≈56、t≈68、t≈80；**t≈92 有 path cut**（速度爆衝+座標跳，usable 約 0–92s）。
  - **stage3（現 333s / CAMMOV1）**：待跑 analyze-path（範圍大很多，是真正的長關）。
- **void floor 重調**：街面高度隨相機換了，現值（stage2 −13 / stage3 −8）無效，要依修正相機的實際街面重設。
- 全部驗證好後，連同工作目錄的 stage JSON + void floor 一起 commit（相機修復本身已先 commit）。

**git 狀態**：相機修復（`extract-camera.mjs`）＋ 本 ROADMAP 段已 commit；`stage2.json` / `stage3.json` / `StageEnvironment.js` 為未 commit 的 superseded WIP。**其他機器**需重跑 `node tools/extract-stage-assets/extract-camera.mjs virtuacop2 game/public/assets` 重生 camera.bin（本機已重生）。

**自創海盜貨輪關**：用戶指示「原版優先」延後。方案已定（程式建船甲板場景 + Gemini 生貼圖 + 重用角色 rig 當海盜，需新增程序生成場景模組 + 走 railPath；`baseStage:stage1` 載 P_COMMON）。

**stage 身分（次要）**：相機對調後 stage2 幾何=碼頭航廈、stage3=濱海道路；JSON `name`（Industrial Factory / City at Night）仍是舊猜測，可日後對原版順序校。

---

## 🟢 路線決議（2026-06-14）：轉向「路 B＝完全原創、可商業化」

用戶確認方向＝**做完全原創、能上架販售的 VC 風格軌道射擊**（題材以真實警匪對峙事件為「靈感」，人名/地名/角色一律虛構化以避開形象權/誹謗/平台審核）。原版忠實重現（路 A）僅供私下自玩，不公開散佈。法律觀念：著作權保護「具體內容」不保護「類型/玩法手感」，所以引擎＋玩法（lock-on 圈、爆頭即死、justice shot、計分倍率）全可保留，只需把 SEGA 的**具體素材**（模型/貼圖/動作/相機路徑/音效/名稱）換成原創。

### J-B1 完成（`34e6b2a`）：第一關全原創 — downtown1（零 SEGA 素材）

**重大發現**：引擎大部分原創 fallback 早就現成——`EnemyModelLoader` 是純程序化人形（含 head/body/hand 命中區）、`AudioManager` 有合成音、`CameraRig` curve 模式吃 `railPath`（無需 camera.bin）。**唯一缺的原創塊是 stage 3D 環境**（原本只能載 SEGA GLB，缺檔退化成一個盒子）。

- **`scene/OriginalEnvironment.js`（新）**：`buildOriginalEnvironment(config)` 用 primitive 程序生成「夕陽 downtown 街道」——平地（`groundYAt` 的落地面）、人行道、車道標線、雙側 per-face shaded 大樓、亮窗 mesh（單一 vertexColors mesh）、路燈、遠景封底。**seeded PRNG 決定性**（可單元測試）、unlit MeshBasicMaterial 與管線一致。裝飾條（人行道/車道線）`raycast` 停用，讓 `groundYAt` 永遠回真街面 y=0。
- **`StageEnvironment.create` 接線**：`STAGE_SCENE_CHUNKS[stageId]` 不存在時（原創關卡、無 `baseStage`）→ 走原創程序環境，完全不碰任何 GLB。stage1/2/3 + `baseStage` 關卡不受影響。
- **`level/levels/downtown1.json`（新）**：無 baseStage、`environment{type:downtown,seed}`、自編 `railPath`＋`railDuration`（curve 模式運鏡）、3 個 arena 波次（含 1 名人質 innocent）＋ boss、對齊的 clearPoints。**自動上選單**（LevelLoader 既有 glob 發現）。
- **`CameraPathLoader` bug 修復**：缺 camera.bin 時 dev/SPA host 回 index.html＋200（非乾淨 404），舊碼把 HTML 當二進位 → `new Float32Array` 長度 6e9 爆掉（RangeError）。修＝拒 `text/html`＋要求 header 完整描述位元組數，否則回 null 退 JSON rail。**這 bug 對任何缺 camera.bin 的原創關都會炸，非 downtown1 限定。**

**驗證**：game 測試 +20（OriginalEnvironment 5、CameraPathLoader 5、StageEnvironment 原創分支 2、LevelLoader 1、其餘既有）全綠；**preview 端到端實證**——選 downtown1→街道完整渲染（夕陽天空＋雙側亮窗大樓＋柏油街＋車道線＋路燈）、4 敵（3 grunt＋1 gunman 程序人形）spawn 並落在 y=0、4 個 lock-on 圈、HUD/彈藥/生命正常、相機走自編 rail（`rigMode:curve`）、arena clearPoint 正確凍結相機。截圖已交付用戶。

**git**：`34e6b2a` 已 commit 到 main（**未 push**，照慣例等用戶說）。只動原創新檔＋我的 hunk；stage2/3 superseded WIP 維持未 commit。

### 路 B 下一步（待用戶定先後）
- **品牌/命名**：選單標題仍硬寫 "VIRTUA COP 2"（dev 佔位），要取原創遊戲名 + 換掉。屬用戶決策。
- **美術升級**：目前是 primitive + 程序貼圖；可接 Gemini 生圖做原創貼圖（牆面/招牌/天空）貼到程序幾何上，質感大升（生圖避開「VC 風格」字樣與 SEGA 角色即乾淨）。
- **原創角色**：程序人形可玩但陽春；要原創角色美術（自製/AI/動補）取代 SEGA 部件。
- **手機**：three.js 網頁本來就能在手機瀏覽器開，但要加觸控瞄準（`InputManager` 已抽象化）＋效能調校；上架走 PWA / Capacitor，但建議原創化完成後再做。
- **更多原創關**：複製 downtown1.json 套路，或擴充 `OriginalEnvironment` 加別的 preset（碼頭/室內/夜市…）。
- **市場研究報告**：用戶要在「做出來之後」進行（競品＝Crisis VRigade / House of the Dead Remake / Pistol Whip 等，類型在 PC/VR 仍商業活躍）。✅ **已完成（2026-06-14），見下節。**

---

## 🟢 市場研究 + 首部曲規劃完成（2026-06-14）

用戶指示「跑 DARKLINE 市場研究報告，跑完直接紀錄收尾，明天用另一台本機讀」。用 deep-research harness（6 路平行搜尋 → 抓 30 來源 → 抽 132 主張 → 三票對抗式查證 25、存活 20、合成 10）＋ 定向補抓 7 個 Part B 史料來源完成。**兩份文件已寫進 `docs/`**（OneDrive 同步，另一台可直接讀）：

- **[`docs/DARKLINE-市場研究報告.md`](docs/DARKLINE-市場研究報告.md)** — Part A 市場可行性（競品銷量、平台、題材風險、回本定位）+ Part B 首部曲考據（韓戰駐台、1950s 街景/武器、1996 台海危機），含來源連結與對抗式查證的 caveats。
- **[`docs/DARKLINE-首部曲規劃.md`](docs/DARKLINE-首部曲規劃.md)** — MVP 範圍、虛構化故事框架、場景/美術/武器/情報層設計、對齊現有檔案的技術落地步驟、開發里程碑、題材風險控管。

**市場結論（TL;DR）：值得做，但當「精品小品」做、非商業豪賭。**
1. 類型還活著但天花板不高——HotD Remake 估 10–20 萬套（$24.99）、Phantom Doctrine 20–50 萬套、小團隊 VR 光槍作（Crisis Brigade 2）0–2 萬套且長尾線上僅個位數。
2. **平台＝Steam (PC) 優先**：three.js → Electron/NW.js + `steamworks.js`（MIT、維護中）上架路徑已驗證可行；VR 大環境 2025–26 轉弱、手機資料不足。Web 免費試玩當導流。
3. **題材是雙面刃**：兩岸踩中國三大紅線（台/藏/天安門），《還願》前車之鑑（下架+發行商吊照）→ **從第一天放棄中國市場、全面虛構化、主打台灣/海外華語/全球**。
4. 定價建議 **US$9.99–14.99**、短而精（2–4hr）、靠題材獨特性 + 視覺記憶點 + Web 試玩導流（買量不現實）。

**首部曲規劃結論：**
- 劇情**採用韓戰駐台起點**（1953 台北）——史骨架＝駐台美軍 MAAG + CIA 前線「西方公司」+ 反共義士（皆虛構化）；主角虛構「林沂/代號暗線」，留「暗線名單 / 待第一島鏈再次收緊之日」伏筆鉤到 **1996 第三次台海危機「保護民選元首」**第二部曲。
- **MVP（你問的「遊戲起點」）= M1+M2 里程碑**：複製 downtown1 套路，新增 `OriginalEnvironment` 的 `taipei1950s` preset（騎樓街）+ 新關卡 JSON（3 arena + boss + 人質）+ M1911 玩家槍 + 敵人 burp gun(PPSh/Type 50) 剪影 + 開場/結尾簡報 + 1 個情報層解碼互動。
- **美術兩段式**：先程序生成跑通（容量幾乎為零、流暢）→ 再 Gemini 升圖（招牌/牆/天空貼圖，輕量）。流暢感靠現有 draw-call merge（已驗 ~9× 快）+「輕量幾何 + 升圖貼圖」路線。
- **下一刀＝M1：`taipei1950s` preset + 關卡 JSON**（複製 `downtown1.json` 套路）。

**研究 caveats（須記）：** SteamSpy 為估計值僅供量級；「獨立佔 48% 營收」被 Wukong/Palworld 灌水勿誤用；Pistol Whip 自籌獲利為 2021 時點（Cloudhead 2026 初裁員 ~70%）；《還願》退出中國是「自行下架+review-bomb+發行商吊照」非明文禁令；MacArthur「不沉航母」備忘錄 1950/6/14 早於開戰且非原創比喻；手機/WebXR 效能、西方公司營運細節未深查。詳見報告。

**git**：兩份 docs + 本 ROADMAP 段 commit 到 main（**未 push**，照慣例等用戶說）。專案資料夾名維持 `vrcop`/`virtua-cop-2` 不動（用戶指示，內部識別）。

---

## 🟢 設計 pivot：半軌道+半自由 sprite 射擊（2026-06-15）

用戶與 Claude 腦力激盪後，玩法從「純軌道換皮 downtown1」演進為新方向，並寫成正式 spec + 計畫：

- **[`docs/superpowers/specs/2026-06-15-darkline-first-island-chain-design.md`](docs/superpowers/specs/2026-06-15-darkline-first-island-chain-design.md)** — 設計定案。
- **[`docs/superpowers/plans/2026-06-15-darkline-m0-vertical-slice.md`](docs/superpowers/plans/2026-06-15-darkline-m0-vertical-slice.md)** — M0 垂直切片實作計畫。

**新方向 TL;DR：**
- **玩法＝半軌道＋半自由**：軌道段(街機射擊，用現有引擎) + 自由段(走動調查/輕解謎/交火) + 簡報段。精神對標 Snatcher/Policenauts（諜報調查+射擊）+ Duke3D/Ion Fury（sprite 美術、爛機器跑得動）。首部曲軌道:自由 ≈ 50:50，**比例隨部曲遞增逼近全自由**（風險階梯）。
- **美術＝2D sprite**（取代 3D 模型/MOT 骨架那條路）：Gemini 生圖 + **程式化調色盤收斂**（固定調色盤量化，等同 Duke3D 共用 256 色盤；解 Gemini 風格漂移）。低配筆電可跑、避開 3D 動補地獄。
- **M0 垂直切片先打地雷**（下一步）：①Gemini sprite 動畫一致性 ②自由段好玩+AI 成本 ③rail→free→存檔全迴圈 ④Electron 延遲。**M0 結果決定首部曲軌道:自由比例。** M0 隔離在 `game/src/darkline/m0/`，丟棄式、不汙染 production。
- **唯一真技術未知數＝Gemini sprite 動畫一致性**，已排 M0 第一驗證項。
- **工作模式**：用戶給方向 / Claude 研究(deep-research)+草稿+選素材+控風險 / 用戶判對味（見記憶 feedback_content_workflow）。模型：設計/劇情/M0 判讀用 Opus、機械執行用 Sonnet、切細 session。
- **資源**：字體(Noto CJK/Cubic11/jf-openhuninn OFL)、音效(Kenney/freesound CC0/Sonniss)、音樂(incompetech CC-BY)皆免費可商用；CC0/CC-BY/OFL 限定 + CREDITS 記帳。配樂走 ambient-led 點放式。中英文 i18n 從第一天做。
- **上架**：Steam(Electron) US$100 上架費 + Web 免費試玩導流；放棄中國市場、全面虛構化（《還願》教訓）。

> 舊「H-3 EnemyModelLoader 切真部件 + MOT 骨架」路線**因 pivot 到 sprite 而擱置**（3D 角色不再是主路）；軌道引擎與既有原創關（downtown1）續用。下一刀＝**M0 Phase A**（調色盤 + 公告板 sprite，建議 Sonnet）。
