# DARKLINE M2 — MVP 完成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans 逐 task 實作。步驟用 checkbox（`- [ ]`）追蹤。

**Goal:** 把 M1 的「可玩骨架」補成 spec §9 定義的 **MVP**——讓 1953 台北首部曲一條任務「能玩、能截圖、能放 Web」：玩家有 HP/彈藥/受擊回饋、軌道段有 lock-on 圈、繁中/英文可切、有最簡選單、首版 Gemini sprite（玩家 M1911＋burp-gun 敵）、情報解碼小遊戲、簡報/結尾真文案。**功能性首版**為準（spec §9：M2=能玩的 MVP、M3=美術升質）。

**權威上游：** 設計 spec `docs/superpowers/specs/2026-06-15-darkline-first-island-chain-design.md`（§5 MVP 範圍、§9 里程碑、§12 驗收）；M1 plan `docs/superpowers/plans/2026-06-15-darkline-m1-playable-skeleton.md`（房規格式）。有疑問先讀 spec，不要憑記憶。

---

## 範圍鎖定（M2 = MVP，功能性首版）

> 這節等同輕量 M2 sub-spec：把開工前的決策釘死，避免做著做著範圍漂移。

1. **美術深度＝功能性首版**（用戶 2026-06-15 拍板）：M2 只建「能用」的首版 sprite ＋ 生圖→去背→調色→壓縮→進版控管線；**風格聖經、多角度 sheet、動畫、音效**全留 **M3**。
2. **軌道段維持程序人形、不換 sprite**（spec §7.3「軌道段不換 sprite」為準）。M1 ROADMAP 的「軌道敵 sprite 化」carryover 與 §7.3 矛盾 → **按 §7.3，rail 不 sprite 化**；此決策在 **Phase 3 檢查點**請用戶複核。sprite 只用在**自由段** billboard 敵與玩家槍。
3. **沿用 M1 的隔離原則**：新碼一律 `game/src/darkline/` 命名空間；重用 `game/` 引擎類別但**零交叉改**（唯一例外：必要時 `OriginalEnvironment` 純新增匯出，同 M1 慣例）。
4. **m0 spike 不沿用**：演算法可參考，但乾淨重寫進 `darkline/`。
5. **資產 IP 紀律**：Gemini 生的原圖（4–5MB）**不進版控**；只 commit **壓縮去背後的小 sprite**（≤幾十 KB）。每用一個素材登 `CREDITS`（spec §8）。Gemini 原圖路徑進 `.gitignore`。

### 重用對照表（M2 直接接，不重造）

| 要做的事 | 重用既有 | 位置 |
|---|---|---|
| 玩家 HP / 彈藥 / 受傷 / reload | `GameManager`（`health/ammo/takeDamage/consumeAmmo/reload` + 狀態機） | `game/src/GameManager.js` |
| HUD（分數/生命/彈匣/字卡/血條/lock 圈/受擊閃白） | `HUD`（API 全齊，只差掛載） | `game/src/hud/HUD.js` |
| 玩家槍 view model（剪影＋後座力） | `WeaponViewModel`（`attachTo`/`fire`/`update`） | `game/src/render/WeaponViewModel.js` |
| 敵彈丸（可見飛行＋可射落） | `EnemyManager` 已備 `onEnemyAttack` / `projectileMeshes()` | `game/src/gameplay/EnemyManager.js`、`darkline/mission/RailController.js` |
| 軌道敵 lock-on 相位 | `Enemy.lockPhase` / `lockRemaining` | `game/src/gameplay/Enemy.js` |
| i18n（`t()`＋字典注入） | `I18n`（已支援多字典注入） | `game/src/darkline/core/i18n.js` |
| 字卡渲染 | `renderCard` | `game/src/darkline/core/cards.js` |

---

## 檔案結構（先鎖分工）

| 檔案 | 責任 | 可測 |
|---|---|---|
| `game/src/darkline/core/PlayerState.js`（或直接用 GameManager） | 玩家 HP/彈藥薄包裝（注入起始值，純邏輯） | ✅ TDD |
| `game/src/darkline/hud/dlhud.js` | 把 `HUD` 掛進 darkline + lock-on 投影助手（純投影函式可測） | 部分 TDD |
| `game/src/darkline/combat/projectThreats.js` | 敵人世界座標 → 螢幕 lock 圈 payload（純函式：project + 過濾） | ✅ TDD |
| `game/src/locales/en.json` | 英文字串字典（鏡像 zh.json 全鍵） | — |
| `game/src/darkline/core/lang.js` | 語言選擇（`?lang=` / localStorage / 預設）＋字典查表（純函式） | ✅ TDD |
| `game/src/darkline/ui/menu.js` | 最簡選單（標題/開始/繼續/語言切換），純 DOM | 部分 TDD |
| `game/src/darkline/intel/decode.js` | 情報解碼小遊戲純邏輯（驗證/狀態機） | ✅ TDD |
| `game/src/darkline/intel/DecodePanel.js` | 解碼 UI（DOM overlay，接 decode.js） | 手動 |
| `tools/sprite-pipeline/process-sprite.mjs` | build-time：raw PNG → flood-fill 去背 → 調色盤 → 壓縮 → 小 PNG | ✅ node:test（純函式部分） |
| `tools/sprite-pipeline/lib/floodfill.mjs` | 邊緣 flood-fill 去背（純函式） | ✅ node:test |
| `game/public/darkline/sprites/*.png` | 處理後的首版 sprite（**進版控**，小檔） | — |
| `game/src/darkline/darkline.js` | 整合層：接上 HUD/HP/敵火/lock 圈/選單/解碼（**改既有**） | 手動 |
| `game/darkline.html` | 加 HUD 容器 + 選單容器 | 手動 |
| `game/tests/darkline/*.test.js` | 上述純邏輯測試 | — |

> 全部新檔在 `darkline/` 或 `tools/` 命名空間；production 引擎類別只「重用」不改。`darkline.js`/`darkline.html` 是 M1 既建的 darkline 自有檔，可改。

---

# Phase 1 — 戰鬥系統補完（HP / HUD / 敵火傷害 / lock-on / 彈藥）

> 目標：把 M1 留 no-op 的「敵彈丸僅威脅提示」補成真戰鬥迴圈——玩家有 HP、被打會扣、HUD 顯示分數/生命/彈匣、軌道段有 lock-on 圈、彈藥會耗會 reload、玩家死亡有 game-over。**全程無美術判斷、純邏輯走 TDD、整合走 preview**。這段我（Opus/Sonnet 混）能立刻開工。

### Task 1.1: 玩家狀態 + HUD 掛載

**建議模型：** Opus（整合＋手感）；PlayerState 純邏輯部分 Sonnet 可代。

**Files:**
- Create: `game/src/darkline/core/PlayerState.js`（薄包裝 GameManager 或直接 re-export）
- Create: `game/src/darkline/hud/dlhud.js`
- Edit: `game/darkline.html`（加 `<div id="hud"></div>`）
- Edit: `game/src/darkline/darkline.js`（boot 時 `new HUD(...)`、接 score/health/ammo）
- Test: `game/tests/darkline/playerstate.test.js`

**做法：**
- **決策**：直接重用 `GameManager` 管 `health/ammo`（已測過），darkline 持一個 `gm = new GameManager()`，`gm.maxAmmo = 7`（M1911）、`startStage()` 初始化。`PlayerState.js` 可只是 `export { GameManager as PlayerState }` 的語意別名 + darkline 專用預設，避免無謂重造。若 GameManager 的 stage 狀態欄位干擾，再抽最小 `PlayerState`（hp/ammo/takeDamage/consume/reload）。**先試重用，TDD 釘住 darkline 要的行為**。
- `dlhud.js`：`mountHUD(container, {maxHealth:5, maxAmmo:7})` → `new HUD(...)`；包一層 `syncFromGM(hud, gm)`（把 gm.health/ammo 推到 HUD）。HUD `_build` 會 `innerHTML=` 覆寫容器 → **用獨立 `#hud` div，不要丟給 `#c`（canvas）**。HUD 重用既有 `#crosshair`（darkline.html 已有）。
- darkline.js：`score += x` 全改走 `gm`/`hud.addScore`，單一真相來源（現在 darkline 自持 `score` 變數 + HUD 自持 `score` 會雙頭）。收斂到 HUD：`hud.addScore(delta)`，讀 `hud.score`；存檔 payload 改讀 `hud.score`。

- [ ] **Step 1: 寫失敗測試（playerstate：darkline 要的行為釘樁）**

```js
// game/tests/darkline/playerstate.test.js
import { describe, it, expect } from 'vitest'
import { PlayerState } from '../../src/darkline/core/PlayerState.js'

describe('PlayerState (darkline 玩家狀態)', () => {
  it('starts at full hp/ammo for the M1911 loadout', () => {
    const p = new PlayerState({ maxHealth: 5, maxAmmo: 7 })
    expect(p.health).toBe(5)
    expect(p.ammo).toBe(7)
  })
  it('takeDamage reduces hp and reports death at 0', () => {
    const p = new PlayerState({ maxHealth: 2, maxAmmo: 7 })
    expect(p.takeDamage(1)).toBe(false)
    expect(p.takeDamage(1)).toBe(true)   // dead
    expect(p.health).toBe(0)
  })
  it('consumeAmmo fails when empty; reload refills', () => {
    const p = new PlayerState({ maxHealth: 5, maxAmmo: 1 })
    expect(p.consumeAmmo()).toBe(true)
    expect(p.consumeAmmo()).toBe(false)
    p.reload()
    expect(p.ammo).toBe(1)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗** — `cd game && npx vitest run tests/darkline/playerstate.test.js`
- [ ] **Step 3: 實作** PlayerState（重用 GameManager 或最小自造，含可注入 maxHealth/maxAmmo 的建構子）；`dlhud.js` mount + sync。
- [ ] **Step 4: 跑測試確認通過。**
- [ ] **Step 5: 手動驗證（preview）：** 開 `darkline.html` → HUD 出現（SCORE 左上、生命 5★、彈匣 7 格右下）；打敵得分時 SCORE 跳動；`__dl` 出口暴露 `gm`/`hud`。
- [ ] **Step 6: Commit** — `feat(m2): mount HUD + reuse GameManager for darkline player hp/ammo/score`

---

### Task 1.2: 敵火傷害接線 + 玩家死亡 game-over

**建議模型：** Opus（整合＋手感）

**Files:**
- Edit: `game/src/darkline/darkline.js`

**做法：**
- **rail 敵火**：`enterRail` 的 `onEnemyAttack` 由 no-op 改為 `() => { if (gm.takeDamage(1)) onPlayerDead(); hud.setHealth(gm.health); hud.flashDamage() }`。（敵彈丸抵達相機才扣命的語意已在 EnemyManager/Projectile，這裡只接 callback。）
- **free 敵火**：loop 裡 `r.fired`（WanderAI）目前丟掉 → 改成觸發同一套受擊：`if (r.fired) { if (gm.takeDamage(1)) onPlayerDead(); hud.setHealth(gm.health); hud.flashDamage() }`。功能性首版可不畫 free 彈丸（直接威脅命中＋閃白），或日後補可見彈丸（標 M3）。
- **彈藥**：左鍵射擊前 `if (!gm.consumeAmmo()) return`（空彈不發）＋ `hud.setAmmo(gm.ammo)`；空彈自動 reload 或右鍵 reload（接 `gm.reload()` + `hud.setAmmo`）。對齊 VC2「畫面外開槍 reload」remake。WeaponViewModel `fire()` 後座力同步觸發（Task 3.3 接槍模型後）。
- **玩家死亡**：`onPlayerDead()` → 顯示 game-over overlay（i18n `over.title`/`over.body`）、停輸入、提供「重試（從存檔點）」= reload `?resume`。`gm.onPlayerDead()` 切 DEAD 狀態，loop 停止戰鬥更新。
- **lock 圈清空**：死亡/結算時 `hud.updateLockOns([])`（同 VC2 C-3 修正，免殘留凍結圈）。

- [ ] **Step 1: 手動驗證紅線（preview，rng 注入決定性）：**
  - rail：驅動 `__dl.rail.controller` 讓敵抵達紅相位開火 → HP 5→4、`#damage-flash` active。
  - free：敵進射程 fired → HP 扣、閃白。
  - 連續受擊到 0 → game-over overlay 出現、輸入停、`?resume` 可重來。
  - 彈藥：連開 7 槍 → 第 8 槍不發（ammo 0）→ reload 回 7。
- [ ] **Step 2: Commit** — `feat(m2): wire enemy fire -> player damage + ammo/reload + game-over`

---

### Task 1.3: 軌道段 lock-on 圈

**建議模型：** Sonnet（投影純函式 TDD）＋ Opus（接線驗證）

**Files:**
- Create: `game/src/darkline/combat/projectThreats.js`
- Edit: `game/src/darkline/mission/RailController.js`（加 `activeThreats()` 暴露帶 lockPhase 的敵人）
- Edit: `game/src/darkline/darkline.js`（每幀投影 → `hud.updateLockOns`）
- Test: `game/tests/darkline/projectthreats.test.js`

**做法：**
- VC2 `main.js` 的 `updateLockRings()` 範式：每幀對有 `lockPhase` 的敵人 `Vector3.project(camera)` → 螢幕像素 + phase 色 + remaining 縮放 → `hud.updateLockOns`。**排除 innocent**（lockPhase 對 innocent 已回 null，仍防呆過濾）。
- `RailController` 加 `activeThreats()`：回 `this.enemies.enemies.filter(e => e.lockPhase)` 給整合層投影（不在 RailController 碰 DOM）。
- `projectThreats(enemies, camera, viewport)` 純函式：吃敵人陣列 + 相機 + `{width,height}`，回 `{x,y,phase,remaining}[]`（螢幕像素），phase 由 `lockPhase` 映 `'green'|'yellow'|'red'`。**純函式可測**（注入假相機 project 或用真 THREE camera + updateMatrixWorld）。

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/projectthreats.test.js
import { describe, it, expect } from 'vitest'
import { projectThreats, phaseClass } from '../../src/darkline/combat/projectThreats.js'

describe('phaseClass', () => {
  it('maps lockPhase enum to css class', () => {
    expect(phaseClass('green')).toBe('green')
    expect(phaseClass('red')).toBe('red')
  })
})

describe('projectThreats', () => {
  // 注入最簡 fake：project 把世界 x/y 當 NDC 直通
  const fakeCam = { p: ([x, y]) => ({ x, y }) }
  const enemies = [
    { lockPhase: 'green', lockRemaining: 0.8, _ndc: [0, 0] },
    { lockPhase: null,     lockRemaining: 0,   _ndc: [0.5, 0.5] },  // 無鎖 → 排除
  ]
  it('returns one ring for the locked enemy in screen px, excludes unlocked', () => {
    const out = projectThreats(enemies, fakeCam, { width: 800, height: 600 })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ phase: 'green', remaining: 0.8 })
    expect(out[0].x).toBeCloseTo(400, 5)   // ndc 0 → 中心
    expect(out[0].y).toBeCloseTo(300, 5)
  })
})
```

> 註：純函式以「敵人自帶 `_ndc` 或注入 projector」設計，避免測試吊 three.js 相機；真接線時餵 `v.project(camera)`。實作簽名以可測為先。

- [ ] **Step 2–4: 紅→綠 TDD。**
- [ ] **Step 5: 手動驗證（preview）：** rail1 開場波 spawn → 敵頭上出現綠圈、倒數變黃→紅、收縮；擊殺即消失；innocent 無圈；game-over 圈清空。
- [ ] **Step 6: Commit** — `feat(m2): rail lock-on rings (project threats -> HUD.updateLockOns)`

---

### Task 1.4: 可射落敵彈丸（rail，補 M1 未接）

**建議模型：** Opus（raycast 整合）

**Files:** Edit `game/src/darkline/darkline.js`

**做法：** rail 左鍵 raycast 目前只打 `enemyMeshes()`；補上 `rail.controller.projectileMeshes()`，最近者勝（同 VC2 main.js）。射中彈丸 → `Projectile.shootDown()` + 小分數（沿用 VC2 佔位 50）+ 耗 1 彈。**功能性首版可選**：若 free 段不畫可見彈丸，此 task 只接 rail。

- [ ] Step 1: 手動驗證——rail 敵開火 → 真 raycast 射落在途彈丸 → HP 不變、score +50、彈丸退場、耗 1 彈。（注意 preview raycast 前要 `updateMatrixWorld(true)` + `cam.aspect`，見 [[project-vc2-env-gotchas]]。）
- [ ] Step 2: Commit — `feat(m2): rail — shoot down incoming projectiles`

---

### ✅ Phase 1 檢查點 — 交用戶用 Opus 統一檢查

- [ ] **判斷題：**
  1. HUD 版面（分數/生命/彈匣）在 darkline 兩段都正確、不擋瞄準嗎？
  2. 敵火→扣血→閃白→死亡 game-over 的回饋手感對嗎？難度（敵命中率、扣命量）要調嗎？
  3. rail lock-on 圈的計時/上色/收縮像 VC2 嗎？
  4. 彈藥 7 發 + reload 節奏可玩嗎？（空彈自動 reload vs 右鍵手動）
- [ ] 用戶以 Opus 通讀 Phase 1 diff，確認戰鬥迴圈無誤後開 Phase 2。

---

# Phase 2 — 在地化與最簡選單（en.json + 語言切換 + 選單）

> 目標：spec §8/§12「中英文皆可切」+「從選單選關」。i18n 基建（`I18n` 注入字典）M1 已就緒，這段加 en 字典 + 切換 + 最簡選單。**無美術判斷**（文案是既有 key 的英譯，UI 是純 DOM）。

### Task 2.1: en.json + 語言選擇純邏輯

**建議模型：** Sonnet（json 鏡像 + lang 純函式）

**Files:**
- Create: `game/src/locales/en.json`（鏡像 `zh.json` **全鍵**，缺鍵會 echo key＝看得見漏譯）
- Create: `game/src/darkline/core/lang.js`
- Test: `game/tests/darkline/lang.test.js`

**做法：** `lang.js`：`pickLang({ query, stored, fallback='zh' })` 純函式決定語言（`?lang=en` > localStorage > 預設）；`dictFor(lang)` 回 `{zh, en}[lang]`。darkline.js boot 用它選字典建 `new I18n(dict)`。切換時寫 localStorage + 重建受影響文字（或最簡：切換即 reload 帶 `?lang=`）。

- [x] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/lang.test.js
import { describe, it, expect } from 'vitest'
import { pickLang } from '../../src/darkline/core/lang.js'

describe('pickLang', () => {
  it('prefers explicit ?lang query', () => {
    expect(pickLang({ query: 'en', stored: 'zh' })).toBe('en')
  })
  it('falls back to stored then default', () => {
    expect(pickLang({ query: null, stored: 'en' })).toBe('en')
    expect(pickLang({ query: null, stored: null, fallback: 'zh' })).toBe('zh')
  })
  it('ignores unknown lang codes', () => {
    expect(pickLang({ query: 'fr', stored: null, fallback: 'zh' })).toBe('zh')
  })
})
```

- [x] **Step 2–4:** 紅→綠；en.json 逐鍵英譯（**Claude 產草稿，用戶可校**，諜報 noir 語氣）。9 測綠（含鍵對齊守衛）。
- [x] **Step 5: Commit** — `feat(m2): en locale + language pick (query > stored > default)` (`7182b2f`)

### Task 2.2: 最簡選單 + 語言切換 UI

**建議模型：** Opus（DOM/接線/手感）

**Files:** Create `game/src/darkline/ui/menu.js`；Edit `game/darkline.html`（`#menu` 容器）、`darkline.js`（boot 先進選單）。

**做法：** 最簡選單：標題（`menu.title`）、「開始任務」、「繼續」（有存檔才亮，接 `?resume` 邏輯）、語言切換（中/EN，切了重載帶 `?lang=`）。選單收掉才進 briefing。對齊 §12「從選單選關」（首部曲單任務，選單即 start/continue/lang）。

- [x] **Step 1: 手動驗證（preview DOM-eval）——選單出現、語言切換 reload 改標題/按鈕、開始進 briefing、有存檔時「繼續」可用且還原分數+跳段。**
- [x] **Step 2: Commit** — `feat(m2): minimal menu (start/continue/language toggle)` (`102034b`)

### ✅ Phase 2 檢查點
- [ ] 判斷題：中英切換全文字都跟著變嗎（簡報/HUD/字卡/結尾無漏譯）？選單流程順嗎？英譯語氣對味嗎？

---

# Phase 3 — 美術管線與首版 sprite（Gemini → 去背 → 調色 → 壓縮 → 進版控）

> 目標：建可重複的 build-time sprite 管線，產**首版**玩家 M1911 + burp-gun 敵 sprite，替換 m0 佔位。**內容創作分工**（CLAUDE.md）：用戶給方向 → Claude 跑 Gemini 生候選 + 處理 + 控風險 → **用戶判對味**。**軌道段不 sprite 化（§7.3）**。

### Task 3.1: build-time sprite 管線工具

**建議模型：** Sonnet（純函式 floodfill/quantize）＋ Opus（CLI 視覺驗）

**Files:**
- Create: `tools/sprite-pipeline/lib/floodfill.mjs`（邊緣 flood-fill 去背，純函式，node:test）
- Create: `tools/sprite-pipeline/process-sprite.mjs`（CLI：raw PNG → 去背 → 調色（重用 `darkline/combat/palette.js` 的 nearestColor 邏輯）→ 縮放壓縮 → 小 PNG + alpha）
- Output: `game/public/darkline/sprites/*.png`（**進版控**）
- Test: `tools/sprite-pipeline/floodfill.test.mjs`（合成 buffer 釘樁，沿用 extractor 測試風格）

**做法：** 沿用 m0 的 flood-fill 去背思路（m0-compare.html 已實證可收斂），移成 Node 純函式（用 pngjs 或 sharp 讀寫 PNG，擇一加 devDep）。管線＝①讀 raw PNG ②從四角 flood-fill 把近背景色設透明 ③量化到 `DARKLINE_PALETTE`（M2 放寬：size 128/160、色數 24–32，承 M0「偏暗臉糊」筆記）④輸出小 PNG。**Gemini 原圖路徑 gitignore，只 commit 處理後小檔。** 每 sprite 登 `CREDITS`。

- [x] **Step 1: 寫失敗測試**（floodfill：角落同色連通區 → alpha 0；中心主體保留）。
- [x] **Step 2–4: 紅→綠。**
- [x] **Step 5: 手動驗證——拿 m0 既有 `enemy*.png` 跑管線 → 輸出去背乾淨、調色一致、檔案 ≤幾十 KB。**
- [x] **Step 6: Commit**（工具＋處理後 sprite；原圖不進）。

#### Task 3.1 完成（2026-06-15，TDD，10 node:test）

`tools/sprite-pipeline/`（自帶 package.json + pngjs，同 extract-stage-assets 慣例）。純函式管線：
`floodFillCutout`（四角 BFS 去背，連通性非色鍵→主體內背景色洞不被吃）→ `keepLargestComponents`
（去雜點，丟掉撐大 bbox 的角落殘塊）→ `cropToContent` + `fitContain`（裁到主體 + 等比置中，
**修掉把寬幅原圖硬壓成正方形的橫向壓扁**）→ `quantize`（**重用 game 的 `DARKLINE_PALETTE`**，
build-time/runtime 同一盒蠟筆）。CLI `process-sprite.mjs`（`--size/--tolerance/--margin`）。
- **重用**：`quantize`/`DARKLINE_PALETTE` 直接 import 自 `game/src/darkline/combat/*`（game 是 `type:module`，純 export 在 Node 下乾淨）。
- **驗證**：10/10 pipeline 測 + game 301/301 無回歸；拿現有 3 張 Gemini 候選跑出 128px、~20% 不透明、4–6 KB 小檔，**逐張讀回確認去背乾淨、比例正確、noir 調色一致**（Read image 當 preview 替代，符合用戶「明天本機看」）。
- **IP**：原圖 `game/public/m0/*.png` gitignore（新增規則）+ `node_modules/` 全域 ignore；只 commit 處理後小 sprite；登 `CREDITS.md`。

### Task 3.2: burp-gun 敵首版 sprite

**建議模型：** Opus（生圖 prompt + 視覺判讀 + 接線）；用戶判對味。

**Files:** Output sprite 進 `game/public/darkline/sprites/`；Edit `first-island-chain.js`（`MISSION.free.enemy.sprite` 指向新檔）。

**做法：** Claude 用 Gemini 生 1–2 隻 burp-gun（PPSh/Type-50）特務 sprite（1950s 暗色大衣/便衣、正面 billboard）→ 過 Task 3.1 管線 → 替換自由段 m0 佔位 enemy.png。**用戶看 preview 判對味**；不對就調 prompt 重生（圖生圖鎖底稿、壓格數，承 §11 風險對策）。

- [x] Step 1（部分）：用戶**已先生 3 張 Gemini 候選**（`m0/enemy.png`/`enemy2.png`/`enemy3.png`）→ 過 Task 3.1 管線 → 三張處理後 sprite 進 `game/public/darkline/sprites/`。**接線**：`MISSION.free.enemy.sprite` 由 4.7MB 原圖 `/m0/enemy.png` 改指 `/darkline/sprites/enemy3.png`（持槍兵＝最符合 burp-gun 敵）。
- [ ] Step 2: **待用戶明天本機 preview 判對味**（三張任挑，改 mission 一行路徑即換）；若要全新「PPSh/Type-50 特務」構圖再跑 Gemini 重生。然後 Commit。
  > 本 session 在無瀏覽器/Gemini 下，用既有候選把 3.2 推到「已接、可玩、待判」；新構圖生成是用戶端工作。

### Task 3.3: 玩家 M1911

**建議模型：** Opus（視覺/手感）

**Files:** Edit `darkline.js`（boot `new WeaponViewModel()` + `attachTo(camera)` + 射擊 `fire()` 後座力 + loop `update(dt)`）；M1911 剪影微調（WeaponViewModel 幾何）或 2D sprite overlay。

**做法：** 功能性首版＝重用 `WeaponViewModel`（primitive 手槍 + 後座力，已測）`attachTo` 兩段相機，射擊觸發後座力。M1911 剪影：先微調 primitive 比例朝 M1911；真 sprite 槍（2D overlay）可留 M3 升質。**最低限度＝畫面上有把會後座的槍**。

- [ ] Step 1: 手動驗證——兩段都見槍在右下、射擊有後座力、不擋 raycast。
- [ ] Step 2: Commit — `feat(m2): player M1911 view model (reuse WeaponViewModel + recoil)`
  > **本 session 暫緩**（2026-06-15）：`darkline.js` 目前完全沒掛 `WeaponViewModel`，這 task 純整合且**手感全靠 preview 目視**（槍位/後座力/不擋 raycast）——正是用戶要本機看的東西。留作 Phase 3 下一個 pickup。`WeaponViewModel` 引擎類別已測（`tests/WeaponViewModel.test.js` 綠），接線時 reuse。

### ✅ Phase 3 檢查點
- [ ] 判斷題：①首版 sprite 風格收斂、對味嗎（清晰度 vs M0）？②管線好重跑嗎（換圖容易嗎）？③**rail 維持程序人形 vs §7.3** ——確認 rail 不 sprite 化的決策？④M1911 剪影/後座力堪用嗎？

---

# Phase 4 — 情報解碼小遊戲 + 劇情演出

> 目標：把自由段「按 E 拾取線索」升成有玩法的**情報解碼**，並把簡報/結尾佔位文案換成真內容、補登場/收尾演出。**內容創作分工**：Claude 產草稿/解碼設計 → 用戶判對味。

### Task 4.1: 解碼純邏輯

**建議模型：** Sonnet（純狀態機/驗證 TDD）

**Files:** Create `game/src/darkline/intel/decode.js`；Test `game/tests/darkline/decode.test.js`。

**做法：** 選一個輕量、扣題（冷戰諜報＝密電/替換密碼）的解碼：例如「替換密碼盤」——給密文 + 一條已知對應，玩家轉盤對齊找出明文片段；或「序列選擇」對暗號。純邏輯＝`makePuzzle(seed)` / `applyGuess(state, input)` / `isSolved(state)`，**決定性、可測**。難度＝MVP 級（一兩步即解），重點是「有互動、扣題」，不是硬解謎。

- [ ] **Step 1: 寫失敗測試**（makePuzzle 決定性、正確 guess → solved、錯 guess → 不前進）。
- [ ] **Step 2–4: 紅→綠。**
- [ ] **Step 5: Commit** — `feat(m2): intel decode minigame core logic (deterministic, TDD)`

### Task 4.2: 解碼 UI + 接自由段情報點

**建議模型：** Opus（DOM/UX）

**Files:** Create `game/src/darkline/intel/DecodePanel.js`；Edit `darkline.js`（走近情報點按 E → 開 DecodePanel；解出 → 得分 + 揭露一條扣結尾的線索）。

**做法：** 把現行「按 E 即得分」換成「按 E 開解碼面板 → 解出才得分 + 記一條 intel 線索（餵結尾 1996 鉤子）」。pointerlock 暫解除進面板、關閉復原（接縫同 M1 輸入切換慣例）。

- [ ] Step 1: 手動驗證——走近按 E 開面板、解對得分 + 線索、解錯可重試、關閉復原 pointerlock。
- [ ] Step 2: Commit — `feat(m2): decode panel UI wired to free-segment intel point`

### Task 4.3: 簡報/結尾真文案 + 演出

**建議模型：** Opus（文案/演出）；用戶判對味。

**Files:** Edit `zh.json`/`en.json`（簡報/結尾真文案，承 spec §5 故事框架、全面虛構化 §13）；Edit `cards.js`/`darkline.js`（多段簡報、結尾 1996 伏筆演出潤飾）。

**做法：** 把佔位 `brief.body`/`ending.body` 換成真文案（西緣貿易閣樓受命、暗線名單、1996 鉤子），中英雙寫。演出潤飾：簡報可多頁、結尾字卡淡入＋伏筆句。**Claude 產草稿 → 用戶判對味**。

- [ ] Step 1: 文案草稿（中英）→ 用戶判 → 定稿。
- [ ] Step 2: 手動驗證——整輪簡報/結尾文案到位、中英皆可、演出順。
- [ ] Step 3: Commit — `feat(m2): real briefing/ending copy + presentation (zh/en, fictionalised)`

### ✅ Phase 4 檢查點
- [ ] 判斷題：①解碼好玩/扣題嗎（還是太煩/太空）？②簡報/結尾文案對味、虛構化到位（§13）嗎？③整條情報線（拾取→解碼→結尾鉤子）通順嗎？

---

# M2 驗收標準（對 spec §12）

整輪：**選單**（中/英、開始/繼續）→ 簡報（真文案）→ 軌道1（lock-on 圈、扣血、彈藥）→ 下車接縫 → 自由段（首版 sprite 敵、解碼情報）→ 上車接縫 → 軌道2/Boss → 結尾（1996 鉤子）→ **可存檔讀回** → **繁中/英文皆可切** → 純邏輯測試綠 → preview 端到端無 error。達成即 **MVP（M0+M1+M2）**成立 → 進 M3（美術升質＋音效＋補完整首部曲）。

# 帶進 M3 的清單（M2 刻意不做）
- sprite 美術升質：風格聖經、多角度 sheet、逐格動畫、提清晰度。
- 軌道敵（若決定要）sprite 化 / 1950s 化外觀。
- 音效/BGM（spec §8 ambient-led；G 系列 SE 提取是 VC2 資產、**不可出貨**，DARKLINE 要用免費 CC0 重配）。
- free 段可見敵彈丸 + 射落特效；自由段動線變寬/分支。
- 玩家槍真 sprite（2D M1911 overlay）取代 primitive。

---

*本 plan 基於 2026-06-15 M1 收尾後啟動，範圍鎖定見頂部「範圍鎖定」節（功能性首版，用戶拍板）。逐 task 走 superpowers:executing-plans；每 Phase 檢查點用戶以 Opus 拍板才進下一 Phase。*
