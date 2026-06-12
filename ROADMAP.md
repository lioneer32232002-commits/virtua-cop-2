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

### B v1 完成（2026-06-12）

**重大發現**：CAMMOV **把戰鬥停頓烤進路徑**了。用 `analyze-path.mjs` 掃 camera.bin 速度剖面，stage1 三個真實戰鬥節點（相機速度降到 ~0）：
- **A** 港口開場 t≈0–28s，cam~(-83,-8,257)
- **B** 中段 t≈72–92s，cam~(368,1.5,-165)
- **C** 終點 t≈172–196s，cam(-363,-7.7,-886)（t=176–180 完全凍結）
- **t≈196s 有 261 u/s 瞬移**（跳回 B 位置）= 場景切點/第二圈 → 第一輪有效範圍 0–196s。

**做法**：`stage1.json` 波次錨定這三節點（time=4/74/173），各一波 + `clearPoint` 閘門（相機停→清完才前進，engine 既有機制 main.js:132），終點 boss(t=178)+clearPoint(179)，duration 188（切點前結束）。波次位置用相機相對 offset（spawn 當下解算+raycast 落地）。

**驗證**：60/60 測試過；`verify-waves.mjs` 確認 12 個 spawn 全在相機前方視野錐內、落在三真實戰鬥區；preview 端到端 eval 確認敵人落街面高度（B raycast 命中幾何 y≈0；A/C 正下方無地板網格→fallback camY−1.6≈街面−10，與相機眼高假設一致，視覺合理）。

**已知限制 / B-phase2 後續**：
- 節點間有 ~40–70s 純移動空檔（無敵人）。要補 transit pop-up 波次需先加「通過/落後的敵人 despawn」機制（現在 EnemyManager 只在 isDead 才移除，未殺的會堆在相機後方）。
- A/C 正下方無地板 GLB（港口開闊處），靠 fallback；若要更準可擴充地板覆蓋或讓 fallback 用該關平均街面高。
- stage2/3 套同法（F 項），工具 `analyze-path.mjs`/`verify-waves.mjs` 已通用。

**新增 dev 工具**（`tools/extract-stage-assets/`）：`inspect-glb.mjs`（GLB 逐 node bbox）、`analyze-path.mjs`（相機速度/轉角剖面找戰鬥節點）、`verify-waves.mjs`（波次 vs 相機路徑 headless 驗證）、`analyze-mot.mjs`（MOT 結構分析，供 H）。

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
- 伏筆 (b)：disarmed 敵人不逃跑/消失，併入 B-phase2 despawn。
- 註：disarmed 敵人仍算 hostile（aliveCount 計入），玩家仍需擊殺才清場——刻意。
- **preview 坑**：開始遊戲用 `document.getElementById('overlay').click()`（keydown Enter 不靈，需 isTrusted），已記 [[project-vc2-env-gotchas]]。

**已知簡化（未來忠實度項，排在 E/F 之後，規模中）：敵人攻擊為瞬間命中。**
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

## F. stage2/3 關卡 + Boss

- GLB/camera.bin 已齊（stage2: 10000f、stage3: 4200f）。
- 複製 B 的方法為 stage2/3 佈波次；關卡選單已能選。
- Boss：原版每關有中 boss + 關尾 boss（stage1 結尾=直升機）。先用部件/簡單模型代替，行為（血條、多階段）寫進 LevelDirector。

## G. 音效/BGM 提取（獨立工程）

- `virtuacop2/` 原版檔內找音效資源（BIN/ 目錄、或 .exe 旁的音檔；先 `ls -R` 盤點副檔名）。
- jevarg repo 可能有 SOUND 格式文件。若是標準 ADPCM/WAV 包裝，寫提取器到 `tools/`；若無解，先用免費音效佔位（標明非原版）。
- 遊戲端 `audio/` 已有架構，接上即可。

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

### 攻 H 的優先假設（2026-06-12 用戶提示，未驗證 — 下個 H session 從這裡起手，別從零猜）

1. **「部件順序即骨架順序」慣例**（Model 2 時代常見）：一個角色的部件在 model 表裡通常**連續排列**（頭→軀幹→上臂L→前臂L…），bone i 對應該角色 model 區段內第 i 個部件。**若成立則 #3 不必解 DLL**：解出 bind-pose 後按順序套、視覺驗證，錯了換一種排列假設再試。→ 攻 H 時把這當**第一個嘗試**。
2. **MOTCMN 開頭那段平滑浮點表（0.54, 0.0006, 0.566…）疑似「骨長/關節偏移表」**——正是組裝需要的東西，且位於檔案開頭，最好下手。→ 第二個著力點。
3. 角度編碼先試 CAMMOV 慣例（int16 滿幅=±180°）。

### A-lite 中間路線（存查，目前不做）

「截圖對照、手工把某敵人的原版部件擺成站姿」嚴格說**比程序化替身更貼近原版**（部件/貼圖是真的，只有關節位置目測），不算違反忠於原版。但需先從 441 個 model 視覺分類出某敵人的部件（中等 token 成本），且 H 解出後會被整個取代。→ 除非急著看原版角色觀感，否則不值得現在花。

## A 項決議（2026-06-12）

A 依賴 H（見上）。靠 bbox 硬擺 = 自創，否決。建議路線：**先做 B → C → D**（無角色依賴、高確定性忠實度），角色暫留程序化替身（明標 placeholder）；MOT/H 留作專門 session、用較強模型集中攻。（待用戶最終定）

## I. 雜項

- [ ] `git push`（main 落後 remote 兩個 commit，用戶說 push 才 push）
- [ ] 相機 FOV 校正：對照原版實機截圖調 FOV（原版 Model 2 約 4:3、FOV 偏窄）
- [ ] 效能：三關 GLB 全載時的 draw call 檢查；far plane 3000 是否需要分區裁切
- [ ] `assets/` 在新 worktree 需手動複製（已知坑，HANDOFF 有記）

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
