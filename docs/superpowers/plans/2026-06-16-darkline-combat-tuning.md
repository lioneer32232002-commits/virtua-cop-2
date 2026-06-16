# DARKLINE 戰鬥調校 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans 逐 task 實作。步驟用 checkbox（`- [ ]`）追蹤。

**Goal:** 把 DARKLINE 戰鬥改成「rail 靠 lock-on 紅圈倒數、free 靠有限彈藥」的分軸壓力模型，並統一 head/body/hand/leg 部位傷害、放大 lock-on 圈。

**Architecture:** 純邏輯（部位傷害、備彈/換彈、掉落保底、billboard 部位判定）抽成可 TDD 的小模組；`darkline.js` 做整合並走 preview 驗證。rail 維持瞬間換彈、free 走「彈匣＋換彈計時＋掉彈夾/補給點」。沿用 DARKLINE 隔離原則：production 引擎類別只重用、必要時純新增（不交叉改語意）。

**Tech Stack:** three.js + Vite；vitest（game 單元測試）；preview（隱藏視窗驗證走 eval/數值，見 [[project-vc2-env-gotchas]]）。

**權威上游：** spec `docs/superpowers/specs/2026-06-16-darkline-combat-tuning-design.md`。數值預設值集中見下表，皆 in-game 可調。

## 數值常數（集中）

| 名稱 | 值 | 用於 |
|---|---|---|
| `MAG_SIZE` | 7 | M1911 彈匣容量（maxAmmo） |
| `START_RESERVE_MAGS` | 2 | free 起始備用匣 |
| `RELOAD_TIME` | 1.0s | free 換彈耗時 |
| `DROP_RATE` | 0.4 | 擊殺掉彈夾基率 |
| `PITY_THRESHOLD` | 3 | 連續無掉落保底（第 3 殺強制掉） |
| `PICKUP_RADIUS` | 1.2 | 走近自動撿彈夾半徑 |
| grunt / gunman / heavy hp | 2 / 3 / 5 | 身體發數（爆頭一律 1 發即死） |
| free 特務 hp | 2 | 同 grunt |
| `HEAD_ABOVE` / `LEG_BELOW` | +0.25 / −0.25 | billboard 部位 localY 分界 |
| `HAND_OUTSIDE` | 0.18 | billboard 中段「手」localX 外側分界 |
| lock 圈尺寸 | `40 + remaining*60` px | HUD lock ring（現為 22+rem*46） |
| `LOCK_RING_Y` | 0.9 | lock 圈投影點（軀幹中心，現為 1.4） |

---

## File Structure

| 檔案 | 責任 | 動作 |
|---|---|---|
| `game/src/gameplay/Enemy.js` | 加 `leg` zone、hand/leg 不致死、`slowed` 旗標 | Modify |
| `game/tests/Enemy.test.js` | 更新 hand 測試＋新增 leg 測試 | Modify |
| `game/src/darkline/combat/billboardZone.js` | 命中點→sprite 部位（純函式） | Create |
| `game/tests/darkline/billboardzone.test.js` | billboardZone 測試 | Create |
| `game/src/darkline/combat/ammoDrop.js` | 掉彈夾掉落＋保底（純函式） | Create |
| `game/tests/darkline/ammodrop.test.js` | rollMagDrop 測試 | Create |
| `game/src/darkline/core/PlayerState.js` | 備彈匣＋換彈計時 | Modify |
| `game/tests/darkline/playerstate.test.js` | 擴充換彈/備彈測試 | Modify |
| `game/src/gameplay/EnemyModelLoader.js` | 程序人形腿改標 `leg` | Modify |
| `game/src/darkline/mission/missions/first-island-chain.js` | 敵人 hp、free 彈藥/補給點資料 | Modify |
| `game/src/hud/HUD.js` | 備彈匣顯示＋換彈/無彈提示＋lock 圈尺寸 | Modify |
| `game/tests/HUD.test.js` | 備彈匣＋lock size 測試 | Modify |
| `game/src/darkline/darkline.js` | free 部位/彈藥/掉落/補給整合；rail 分軸＋lock 投影 | Modify |

---

# Task 1: Enemy 加 leg zone + hand/leg 不致死

**建議模型：** Sonnet（純邏輯 TDD）

**Files:**
- Modify: `game/src/gameplay/Enemy.js`
- Modify: `game/tests/Enemy.test.js`

**做法：** 現在 `hit()` 對 `hand` 是「disarm + 仍扣 damage」，連打兩次會殺死（違反「四肢解決不了」）。改成 `hand`/`leg` 提前 return、**不扣血不判死**（hand 繳械、leg 設 `slowed`）。`head`/`body` 維持。

- [ ] **Step 1: 更新既有 flee-freeze 測試（hand 將不再扣血）**

`game/tests/Enemy.test.js` line 225-240 的測試靠「gunman hp2 被 hand 扣成 1、再 body 打死」。hand 改不扣血後 gunman 仍 2，body 一發殺不死。把該敵人改成 `hp: 1`：

```js
  it('freezes the flee timer once killed, so it dies normally (not flee-despawned mid death blink)', () => {
    const e = new Enemy({ type: 'gunman', hp: 1, emergeTime: 0.1, attackInterval: 5 })
    e.state = 'visible'
    e.hit(1, 'hand')                 // justice shot → disarmed (no hp loss)
    e.update(4.9)                    // disarmed 4.9s — just shy of the 5s flee despawn
    expect(e.shouldRemove()).toBe(false)
    e.hit(1, 'body')                 // killed → DYING (resets its state timer)
    expect(e.state).toBe('dying')
    e.update(0.2)
    expect(e.gone).toBe(false)
    expect(e.state).toBe('dying')
    e.update(Enemy.DYING_DURATION)
    expect(e.state).toBe('dead')
  })
```

- [ ] **Step 2: 新增 leg + hand-不致死 測試**

在 `game/tests/Enemy.test.js` 的 `describe('Enemy hit zones', ...)` 內加：

```js
  it('hand shots never kill — a disarmed enemy keeps at least 1 hp', () => {
    const e = new Enemy({ type: 'gunman', hp: 2, emergeTime: 0.1, attackInterval: 5 })
    e.state = 'visible'
    e.hit(1, 'hand')
    e.hit(1, 'hand')
    e.hit(1, 'hand')
    expect(e.hp).toBe(2)            // hand deals no damage
    expect(e.disarmed).toBe(true)
    expect(e.state).toBe('visible') // never killed by limb hits
  })

  it('leg shots do no damage but mark the enemy slowed', () => {
    const e = new Enemy({ type: 'gunman', hp: 2, emergeTime: 0.1, attackInterval: 5 })
    e.state = 'visible'
    e.hit(1, 'leg')
    expect(e.hp).toBe(2)
    expect(e.slowed).toBe(true)
    expect(e.state).toBe('visible')
  })
```

- [ ] **Step 3: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/Enemy.test.js`
Expected: FAIL（`slowed` undefined；hand 仍扣血使 hp≠2）

- [ ] **Step 4: 實作**

`game/src/gameplay/Enemy.js` constructor 內（接在 `this.fleeing = false` 後）加：

```js
    /** @type {boolean} True once a leg hit lands (low-value: slows, never kills). */
    this.slowed = false
```

改 `hit()`（取代現有 line 107-126 的整個方法）：

```js
  /**
   * @param {number} damage
   * @param {'head'|'body'|'hand'|'leg'} [zone] hit location: head = instant kill
   *   (bosses excepted), hand = justice shot (disarm, no damage), leg = low-value
   *   (slow, no damage), body/omitted = normal damage.
   */
  hit(damage, zone) {
    if (this.state === EnemyState.DEAD || this.state === EnemyState.DYING) return
    // Limb hits never kill — they neutralise (hand) or hamper (leg) without
    // dealing damage, so the player must follow up on the head or body.
    if (zone === 'hand') {
      this.disarmed = true
      this.justiceShot = true
      return
    }
    if (zone === 'leg') {
      this.slowed = true
      return
    }
    this.hp -= damage
    if (zone === 'head' && this.type !== 'boss') this.hp = 0
    if (this.hp <= 0) {
      const phase = this.state === EnemyState.EMERGING ? 'green' : this.lockPhase
      this.killMultiplier = phase === 'green' ? 3 : phase === 'yellow' ? 2 : 1
      this.hp = 0
      this.state = EnemyState.DYING
      this._timer = 0
    }
  }
```

- [ ] **Step 5: 跑測試確認通過**

Run: `cd game && npx vitest run tests/Enemy.test.js`
Expected: PASS（全綠）

- [ ] **Step 6: Commit**

```bash
git add game/src/gameplay/Enemy.js game/tests/Enemy.test.js
git commit -m "feat(combat): leg zone + hand/leg non-lethal (limbs can't kill)"
```

---

# Task 2: billboardZone 純函式（free 段部位判定）

**建議模型：** Sonnet（純邏輯 TDD）

**Files:**
- Create: `game/src/darkline/combat/billboardZone.js`
- Create: `game/tests/darkline/billboardzone.test.js`

**做法：** free 敵人是單張 billboard sprite，無 mesh zone。用 raycast 命中點相對 sprite 中心的 local 座標分區：上＝head、下＝leg、中段外側＝hand、其餘中段＝body。

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/billboardzone.test.js
import { describe, it, expect } from 'vitest'
import { billboardZone } from '../../src/darkline/combat/billboardZone.js'

const sprite = { x: 0, y: 0.95, z: 0 }
const opts = { worldSize: 1.9 }

describe('billboardZone', () => {
  it('top of the sprite is a headshot', () => {
    expect(billboardZone({ x: 0, y: 0.95 + 0.4, z: 0 }, sprite, opts)).toBe('head')
  })
  it('bottom of the sprite is a leg hit', () => {
    expect(billboardZone({ x: 0, y: 0.95 - 0.4, z: 0 }, sprite, opts)).toBe('leg')
  })
  it('mid-height outer edge is a hand (weapon) hit', () => {
    expect(billboardZone({ x: 0.5, y: 0.95, z: 0 }, sprite, opts)).toBe('hand')
  })
  it('mid-height centre is a body hit', () => {
    expect(billboardZone({ x: 0.05, y: 0.95, z: 0 }, sprite, opts)).toBe('body')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/billboardzone.test.js`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/combat/billboardZone.js
// free 段敵人是單張 billboard：用 raycast 命中點相對 sprite 中心的 local 座標
// （除以 worldSize 正規化）判定部位。上=head、下=leg、中段外側=hand、其餘=body。
const HEAD_ABOVE = 0.25
const LEG_BELOW = -0.25
const HAND_OUTSIDE = 0.18

/**
 * @param {{x:number,y:number,z:number}} hitPoint world-space ray hit
 * @param {{x:number,y:number,z:number}} spritePos sprite world centre
 * @param {{worldSize:number}} opts
 * @returns {'head'|'body'|'hand'|'leg'}
 */
export function billboardZone(hitPoint, spritePos, { worldSize }) {
  const ly = (hitPoint.y - spritePos.y) / worldSize
  const lx = (hitPoint.x - spritePos.x) / worldSize
  if (ly > HEAD_ABOVE) return 'head'
  if (ly < LEG_BELOW) return 'leg'
  if (Math.abs(lx) > HAND_OUTSIDE) return 'hand'
  return 'body'
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/billboardzone.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/combat/billboardZone.js game/tests/darkline/billboardzone.test.js
git commit -m "feat(combat): billboardZone — hit-point to body part for sprite enemies"
```

---

# Task 3: rollMagDrop 純函式（掉彈夾掉落＋保底）

**建議模型：** Sonnet（純邏輯 TDD）

**Files:**
- Create: `game/src/darkline/combat/ammoDrop.js`
- Create: `game/tests/darkline/ammodrop.test.js`

**做法：** 決定性掉落（rng 注入，不在 update 用 Math.random）。基率 `dropRate`，但連續 `pityThreshold` 次無掉落則強制掉（保底，對齊「緊但不卡關」）。

- [ ] **Step 1: 寫失敗測試**

```js
// game/tests/darkline/ammodrop.test.js
import { describe, it, expect } from 'vitest'
import { rollMagDrop } from '../../src/darkline/combat/ammoDrop.js'

describe('rollMagDrop', () => {
  it('drops when the rng roll is under dropRate', () => {
    const r = rollMagDrop({ killsSinceDrop: 0, dropRate: 0.4, pityThreshold: 3 }, () => 0.1)
    expect(r.drop).toBe(true)
  })
  it('does not drop when the rng roll is above dropRate (pity not reached)', () => {
    const r = rollMagDrop({ killsSinceDrop: 0, dropRate: 0.4, pityThreshold: 3 }, () => 0.9)
    expect(r.drop).toBe(false)
  })
  it('force-drops at the pity threshold regardless of the roll', () => {
    // 2 dry kills already → this (the 3rd) is guaranteed even on a high roll
    const r = rollMagDrop({ killsSinceDrop: 2, dropRate: 0.4, pityThreshold: 3 }, () => 0.99)
    expect(r.drop).toBe(true)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/ammodrop.test.js`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作**

```js
// game/src/darkline/combat/ammoDrop.js
// free 段擊殺掉彈夾：基率 dropRate；連續 pityThreshold 次無掉落則強制掉（保底）。
// rng 注入（() => [0,1)）以保決定性，不在 game loop 用 Math.random。
/**
 * @param {{killsSinceDrop:number, dropRate:number, pityThreshold:number}} s
 * @param {() => number} rng
 * @returns {{drop:boolean}}
 */
export function rollMagDrop({ killsSinceDrop, dropRate, pityThreshold }, rng) {
  if (killsSinceDrop + 1 >= pityThreshold) return { drop: true }
  return { drop: rng() < dropRate }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/ammodrop.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/combat/ammoDrop.js game/tests/darkline/ammodrop.test.js
git commit -m "feat(combat): rollMagDrop — deterministic mag drop with pity floor"
```

---

# Task 4: PlayerState 備彈匣 + 換彈計時

**建議模型：** Sonnet（純邏輯 TDD）

**Files:**
- Modify: `game/src/darkline/core/PlayerState.js`
- Modify: `game/tests/darkline/playerstate.test.js`

**做法：** 加 `reserveMags` + 換彈狀態機。`reload()`（rail 用）維持瞬間補滿；free 用 `startReload()`/`updateReload(dt)`（耗 1 備彈匣 + `reloadTime` 秒）。`addMag()` 撿彈夾用。

- [ ] **Step 1: 寫失敗測試**

在 `game/tests/darkline/playerstate.test.js` 末尾加：

```js
describe('PlayerState 備彈匣 + 換彈計時（free 段）', () => {
  it('starts with the given reserve mags', () => {
    const p = new PlayerState({ maxAmmo: 7, reserveMags: 2 })
    expect(p.reserveMags).toBe(2)
  })

  it('startReload begins a timed reload that consumes one reserve mag on completion', () => {
    const p = new PlayerState({ maxAmmo: 7, reserveMags: 2, reloadTime: 1 })
    p.consumeAmmo(); p.consumeAmmo()        // ammo 5
    expect(p.startReload()).toBe(true)
    expect(p.reloading).toBe(true)
    p.updateReload(0.5)
    expect(p.ammo).toBe(5)                  // not done yet
    p.updateReload(0.6)                     // total 1.1 > reloadTime
    expect(p.ammo).toBe(7)                  // refilled
    expect(p.reserveMags).toBe(1)           // one mag spent
    expect(p.reloading).toBe(false)
  })

  it('cannot start a reload with no reserve mags', () => {
    const p = new PlayerState({ maxAmmo: 7, reserveMags: 0 })
    p.consumeAmmo()
    expect(p.startReload()).toBe(false)
    expect(p.reloading).toBe(false)
  })

  it('cannot start a reload when the mag is already full', () => {
    const p = new PlayerState({ maxAmmo: 7, reserveMags: 2 })
    expect(p.startReload()).toBe(false)
  })

  it('addMag tops up the reserve', () => {
    const p = new PlayerState({ maxAmmo: 7, reserveMags: 1 })
    p.addMag()
    expect(p.reserveMags).toBe(2)
  })

  it('rail reload() still refills instantly without touching reserves', () => {
    const p = new PlayerState({ maxAmmo: 7, reserveMags: 2 })
    p.consumeAmmo()
    p.reload()
    expect(p.ammo).toBe(7)
    expect(p.reserveMags).toBe(2)           // rail reload is free
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/darkline/playerstate.test.js`
Expected: FAIL（`reserveMags`/`startReload` 未定義）

- [ ] **Step 3: 實作**

取代 `game/src/darkline/core/PlayerState.js` 的 constructor 與其後內容（保留既有 getters/takeDamage/consumeAmmo/reload，新增以下）。完整檔：

```js
// game/src/darkline/core/PlayerState.js
// darkline 玩家戰鬥狀態：薄包裝 production GameManager（health/ammo/takeDamage/
// consumeAmmo/reload），加 darkline 要的可注入 maxHealth/maxAmmo（M1911 = 7 發）。
// free 段另加「備彈匣 + 換彈計時」：rail 用瞬間 reload()，free 用 startReload()/
// updateReload()（耗 1 備彈匣 + reloadTime 秒）。
import { GameManager, GameState } from '../../GameManager.js'

export { GameState }

export class PlayerState {
  constructor({ maxHealth = 5, maxAmmo = 7, reserveMags = 0, reloadTime = 1.0 } = {}) {
    this.gm = new GameManager()
    this.gm.maxHealth = maxHealth
    this.gm.health = maxHealth
    this.gm.maxAmmo = maxAmmo
    this.gm.ammo = maxAmmo
    this.reserveMags = reserveMags
    this.reloadTime = reloadTime
    this.reloading = false
    this.reloadTimer = 0
  }

  get health() { return this.gm.health }
  get maxHealth() { return this.gm.maxHealth }
  get ammo() { return this.gm.ammo }
  get maxAmmo() { return this.gm.maxAmmo }
  get state() { return this.gm.state }
  get isDead() { return this.gm.state === GameState.DEAD }

  /** @param {number} amount @returns {boolean} true if this damage killed the player */
  takeDamage(amount) {
    const dead = this.gm.takeDamage(amount)
    if (dead) this.gm.onPlayerDead()
    return dead
  }

  /** @returns {boolean} true if a round was available and consumed */
  consumeAmmo() { return this.gm.consumeAmmo() }

  /** rail 段：瞬間補滿，不耗備彈匣（街機光槍手感）。 */
  reload() { this.gm.reload() }

  /** free 段：開始一次計時換彈。回 true＝成功啟動（有備彈、未滿、未在換彈中）。 */
  startReload() {
    if (this.reloading) return false
    if (this.ammo >= this.maxAmmo) return false
    if (this.reserveMags <= 0) return false
    this.reloading = true
    this.reloadTimer = this.reloadTime
    return true
  }

  /** free 段：推進換彈計時；到時補滿當前匣並耗掉一個備彈匣。 */
  updateReload(dt) {
    if (!this.reloading) return
    this.reloadTimer -= dt
    if (this.reloadTimer <= 0) {
      this.gm.reload()
      this.reserveMags -= 1
      this.reloading = false
      this.reloadTimer = 0
    }
  }

  /** 撿彈夾：增加備彈匣。 */
  addMag(n = 1) { this.reserveMags += n }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/darkline/playerstate.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add game/src/darkline/core/PlayerState.js game/tests/darkline/playerstate.test.js
git commit -m "feat(combat): PlayerState reserve mags + timed reload (free segment)"
```

---

# Task 5: EnemyModelLoader 腿標 leg + 敵人血量資料

**建議模型：** Sonnet（小改＋資料）

**Files:**
- Modify: `game/src/gameplay/EnemyModelLoader.js`
- Modify: `game/src/darkline/mission/missions/first-island-chain.js`

**做法：** rail 程序人形的腿目前標 `'body'`，改標 `'leg'`（與統一部位模型一致）。敵人血量按數值表調。free 特務 hp 已是 2（不變，但本 task 順手確認）。

- [ ] **Step 1: 腿改標 leg**

`game/src/gameplay/EnemyModelLoader.js`（現 line 47-49 的雙腿，標 `'body'`），把那兩行的 zone 由 `'body'` 改為 `'leg'`：

```js
  // Legs — leg hits are low-value (slow, never kill)
  group.add(zoned(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.48, 6), limbColor, -0.10, 0.24, 0), 'leg'))
  group.add(zoned(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.48, 6), limbColor,  0.10, 0.24, 0), 'leg'))
```

- [ ] **Step 2: rail 敵人血量**

`game/src/darkline/mission/missions/first-island-chain.js`：把 `rail1`/`rail2boss` waves 內所有敵人 hp 改為——grunt `2`、gunman `3`、heavy `5`。逐筆對照：

rail1.waves：
```js
    waves: [
      { time: 3,  clearPoint: true, enemies: [
        { type: 'grunt', position: [-2, 0, -10], hp: 2 },
        { type: 'grunt', position: [2, 0, -12], hp: 2 },
        { type: 'gunman', position: [0, 0, -14], hp: 3 } ] },
      { time: 16, clearPoint: true, enemies: [
        { type: 'grunt', position: [-3, 0, -11], hp: 2 },
        { type: 'heavy', position: [2, 0, -13], hp: 5 } ] },
    ],
```
rail2boss.waves：
```js
    waves: [
      { time: 3, clearPoint: true, enemies: [
        { type: 'grunt', position: [-2, 0, -12], hp: 2 },
        { type: 'gunman', position: [2, 0, -13], hp: 3 } ] },
    ],
```

- [ ] **Step 3: free 特務 hp + 彈藥/補給資料（為 Task 7/8 預備）**

同檔 `MISSION.free`：確認 `enemy.hp` 為 `2`，並新增彈藥與補給點欄位（Task 7/8 會讀）：

```js
  free: {
    alleySeed: 1953,
    enemy: { hp: 2, ai: { speed: 1.6, range: 4.5, fireCooldown: 1.6 }, sprite: '/darkline/sprites/enemy3.png', worldSize: 1.9 },
    assist: { radius: 0.30, strength: 0.5 },
    intelScore: 300,
    // 有限彈藥（spec 2026-06-16）
    ammo: { magSize: 7, startReserveMags: 2, reloadTime: 1.0, dropRate: 0.4, pityThreshold: 3, pickupRadius: 1.2 },
    // 固定補給點（各補 1 匣）；座標為巷弄 segment 上的世界 x/z
    supplyPoints: [ { x: 0, z: -14 }, { x: 2, z: -30 } ],
  },
```

- [ ] **Step 4: 跑全測試確認無回歸**

Run: `cd game && npm test`
Expected: PASS（`mission-config` / `rail-data` 等若校驗 hp 範圍應仍綠；EnemyModelLoader 若有 zone 測試需同步——見下）

- [ ] **Step 5: （若有）更新 EnemyModelLoader zone 測試**

若 `npm test` 出現 EnemyModelLoader/CharacterFactory 對「腿 zone = body」的斷言失敗，把該斷言改為 `'leg'`。若無此測試，跳過。

- [ ] **Step 6: Commit**

```bash
git add game/src/gameplay/EnemyModelLoader.js game/src/darkline/mission/missions/first-island-chain.js
git commit -m "feat(combat): leg zone on humanoid legs + enemy hp tuning + free ammo data"
```

---

# Task 6: HUD 備彈匣顯示 + lock 圈尺寸放大

**建議模型：** Sonnet（DOM TDD）

**Files:**
- Modify: `game/src/hud/HUD.js`
- Modify: `game/tests/HUD.test.js`

**做法：** 加 `setReserve(n)`（free 顯示備彈匣數）＋ `setReloading(bool)`（換彈/無彈提示）；lock 圈尺寸公式由 `22+rem*46` 改 `40+rem*60`。rail 不呼叫 setReserve（維持隱藏）。

- [ ] **Step 1: 寫失敗測試**

在 `game/tests/HUD.test.js` 加（沿用該檔既有 jsdom 容器建立慣例；下方 `makeHud` 依該檔現有 helper，若無則 `new HUD(document.createElement('div'), { maxHealth:5, maxAmmo:7 })`）：

```js
  it('setReserve shows the reserve mag count', () => {
    const hud = new HUD(document.createElement('div'), { maxHealth: 5, maxAmmo: 7 })
    hud.setReserve(2)
    expect(hud._container.querySelector('#reserve-mags').textContent).toContain('2')
  })

  it('lock ring grows with remaining time (40px empty → 100px full)', () => {
    const hud = new HUD(document.createElement('div'), { maxHealth: 5, maxAmmo: 7 })
    hud.updateLockOns([{ x: 10, y: 10, phase: 'green', remaining: 1 }])
    const ring = hud._container.querySelector('.lock-ring')
    expect(ring.style.width).toBe('100px')
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd game && npx vitest run tests/HUD.test.js`
Expected: FAIL（`setReserve` 未定義；lock width 仍 68px）

- [ ] **Step 3: 實作**

(a) `HUD.js` 的 `_build` HTML（`#ammo-bar` 那塊附近，現 line 36）後面加備彈匣顯示元素。在 `<div id="ammo-bar"></div>` 之後加：

```html
      <div id="reserve-mags"></div>
```

(b) `_build` CSS 區塊內加（接在 `.ammo-slot.empty` 規則後）：

```css
    #reserve-mags { color: #ffe000; font: 12px monospace; margin-top: 4px; text-align: right; }
    #reserve-mags.reloading { color: #ff8c00; }
```

(c) 加方法（接在 `setAmmo` 後）：

```js
  /** free 段：顯示備彈匣數（rail 不呼叫 → 維持空白）。 */
  setReserve(n) {
    const el = this._container.querySelector('#reserve-mags')
    if (el) el.textContent = '◖ ×' + Math.max(0, n)
  }

  /** free 段：換彈中/無彈提示。 */
  setReloading(on) {
    const el = this._container.querySelector('#reserve-mags')
    if (el) el.classList.toggle('reloading', !!on)
  }
```

(d) 改 `updateLockOns` 內 size 公式（現 line 199）：

```js
      const size = 40 + Math.max(0, Math.min(1, l.remaining)) * 60
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd game && npx vitest run tests/HUD.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add game/src/hud/HUD.js game/tests/HUD.test.js
git commit -m "feat(combat): HUD reserve-mag display + larger lock-on rings"
```

---

# Task 7: darkline free 段 — 部位判定 + 有限彈藥 + 換彈計時

**建議模型：** Opus（整合＋preview 手感）

**Files:**
- Modify: `game/src/darkline/darkline.js`

**做法：** free 射擊改走 `billboardZone`→`enemy.hit(1, zone)`（取代固定扣 1）；彈藥改有限（`consumeAmmo`，空了 `startReload`，loop 推進 `updateReload`）；右鍵 free 段走計時換彈；HUD 顯示備彈匣。rail 不動（Task 9 再處理 rail 分軸）。

**接線細節：**
- import 頂部加：`import { billboardZone } from './combat/billboardZone.js'`。
- PlayerState 建構（現 line 41）改帶 free 彈藥參數：
  ```js
  const A = MISSION.free.ammo
  const player = new PlayerState({ maxHealth: 5, maxAmmo: A.magSize, reserveMags: A.startReserveMags, reloadTime: A.reloadTime })
  ```
- `tryFire()`（現 line 94-100）拆成兩段語意。改為：
  ```js
  // rail：空彈瞬間補（街機）。回 true=可射（已耗 1）。
  function tryFireRail() {
    if (gameOver) return false
    if (player.ammo <= 0) { player.reload(); hud.setAmmo(player.ammo); return false }
    player.consumeAmmo(); hud.setAmmo(player.ammo); return true
  }
  // free：空彈啟動計時換彈（耗備彈匣）。回 true=可射（已耗 1）。
  function tryFireFree() {
    if (gameOver) return false
    if (player.reloading) return false
    if (player.ammo <= 0) { player.startReload(); hud.setReloading(player.reloading); return false }
    player.consumeAmmo(); hud.setAmmo(player.ammo); return true
  }
  ```
- free 射擊 handler（現 line 240-260）：把 `if (!tryFire()) return` 改 `if (!tryFireFree()) return`，並把擊殺改走 zone：
  ```js
    const hits = shooter.getHits(aim, [...live.map(en => en.bb.sprite), ...free.bullets.meshes()])
    if (!hits.length) return
    const proj = resolveProjectile(hits[0].object)
    if (proj) { proj.shootDown(); hud.addScore(SHOOTDOWN_SCORE); return }
    const en = free.enemies.find(en => en.bb.sprite === hits[0].object)
    if (en && en.alive) {
      const zone = billboardZone(hits[0].point, en.bb.sprite.position, { worldSize: MISSION.free.enemy.worldSize })
      en.ref.hit(1, zone)
      if (en.ref.justiceShot && !en._dlJustice) { en._dlJustice = true; hud.addScore(JUSTICE_BONUS) }
      if (en.ref.hp <= 0 && en.alive) { en.alive = false; en.bb.sprite.visible = false; hud.addScore(BASE_KILL) }
    }
  ```
  > 註：free 敵人需有一個 `Enemy` 實例承載 zone 傷害狀態。現行 free 敵人是 plain object（`{ bb, x, z, cooldown, hp, alive }`，現 line 113-119）。在 `enterFree` 建立時改為附一個 `Enemy`：見下。
- `enterFree`（現 line 113-119）建敵人改成附 `Enemy` 實例承載部位/繳械狀態：
  ```js
  import { Enemy } from '../gameplay/Enemy.js'   // 加到頂部 import
  ...
  const enemies = layout.enemySpawns.map(sp => {
    const bb = new BillboardSprite(new THREE.CanvasTexture(processToCanvas(img)),
      { worldSize: MISSION.free.enemy.worldSize })
    bb.sprite.position.set(sp.x, 0.95, sp.z)
    renderer.scene.add(bb.sprite)
    const ref = new Enemy({ type: 'gunman', hp: MISSION.free.enemy.hp, emergeTime: 0, attackInterval: 999 })
    ref.state = 'visible'
    return { bb, ref, x: sp.x, z: sp.z, cooldown: 1, alive: true }
  })
  ```
  > free 敵 `attackInterval: 999`＝不靠 lock 計時開火（free 開火由 WanderAI `r.fired` 驅動，見現 line 334）。`ref.hp` 取代原 `en.hp`。loop 內凡讀 `en.hp` 改讀 `en.ref.hp`（現 line 326-335 的 AI 步進不讀 hp，僅 alive，無須改）。
- loop free 分支（現 line 323-339）末尾加換彈推進：
  ```js
    player.updateReload(dt)
    if (!player.reloading) hud.setReloading(false)
    hud.setAmmo(player.ammo)
  ```
- `enterFree` 末尾加初始 HUD 備彈：`hud.setReserve(player.reserveMags)`。
- 右鍵 `contextmenu`（現 line 295-299）改成分段：
  ```js
  window.addEventListener('contextmenu', e => {
    e.preventDefault()
    if (gameOver) return
    if (seq.current === 'free') { player.startReload(); hud.setReloading(player.reloading) }
    else { player.reload(); hud.setAmmo(player.ammo) }
  })
  ```

- [ ] **Step 1: 套用上述 darkline.js 改動**（import Enemy/billboardZone、PlayerState 帶 ammo、tryFireFree、free 敵附 Enemy、free 射擊走 zone、loop updateReload、HUD setReserve、右鍵分段）。

- [ ] **Step 2: 跑全單元測試確認無回歸**

Run: `cd game && npm test`
Expected: PASS（darkline.js 無單元測試，確認沒動到的模組仍綠）

- [ ] **Step 3: preview 驗證（隱藏視窗坑：sprite 需 patch decode，見 [[project-vc2-env-gotchas]]）**

啟動 dev server，導 `darkline.html`，eval：
```js
HTMLImageElement.prototype.decode = () => Promise.resolve()
__dl.seq.jumpTo('briefing'); __dl.seq.jumpTo('free')
```
逐項用 eval 數值確認：
- 爆頭：對 sprite 上緣 raycast → `en.ref.hp` 即 0、`alive=false`（一發即死）。
- 身體：對中段 raycast → 第 1 發 hp 2→1（不死）、第 2 發 →0 死。
- 手：對中段外側 raycast → `disarmed=true`、hp 不變、score += JUSTICE_BONUS。
- 腿：對下緣 raycast → `slowed=true`、hp 不變。
- 彈藥：連開 7 槍 → ammo 0；第 8 下 → `reloading=true`；`__dl.player.updateReload(1.1)` 後 ammo=7、`reserveMags` −1。
- HUD：`#reserve-mags` 顯示備彈匣數。

- [ ] **Step 4: Commit**

```bash
git add game/src/darkline/darkline.js
git commit -m "feat(m2): free segment — body-part damage + finite ammo + timed reload"
```

---

# Task 8: darkline free 段 — 掉彈夾掉落/撿取 + 固定補給點

**建議模型：** Opus（整合＋preview）

**Files:**
- Modify: `game/src/darkline/darkline.js`

**做法：** free 擊殺時 `rollMagDrop` 決定掉不掉彈夾（保底計數），掉則 spawn 一個彈夾 mesh；走近 `pickupRadius` 自動撿（`addMag` + 移除 mesh + HUD）。地圖固定補給點 spawn 同類 mesh，撿法相同。

**接線細節：**
- import 頂部加：`import { rollMagDrop } from './combat/ammoDrop.js'`。
- `enterFree` 內加彈夾容器與保底計數，並 spawn 固定補給點：
  ```js
  free = { controller, group, layout, enemies, intelMesh, bullets, exitTrigger: layout.exitTrigger, intelTaken: false,
           mags: [], killsSinceDrop: 0 }
  // 固定補給點
  for (const sp of (MISSION.free.supplyPoints ?? [])) spawnMag(sp.x, sp.z)
  ```
- 加彈夾 spawn 助手（mesh＝小金色方塊；自轉留給 loop 或省略）：
  ```js
  function spawnMag(x, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xffe000 }))
    m.position.set(x, 0.4, z)
    renderer.scene.add(m)
    free.mags.push(m)
  }
  ```
- free 射擊擊殺處（Task 7 的擊殺分支內，`hud.addScore(BASE_KILL)` 後）加掉落：
  ```js
      const A = MISSION.free.ammo
      const { drop } = rollMagDrop({ killsSinceDrop: free.killsSinceDrop, dropRate: A.dropRate, pityThreshold: A.pityThreshold }, Math.random)
      if (drop) { spawnMag(en.x, en.z); free.killsSinceDrop = 0 } else { free.killsSinceDrop += 1 }
  ```
- loop free 分支加撿取（接在換彈推進後）：
  ```js
    const A = MISSION.free.ammo
    for (let i = free.mags.length - 1; i >= 0; i--) {
      const m = free.mags[i]
      const d = Math.hypot(cam.x - m.position.x, cam.z - m.position.z)
      if (d < A.pickupRadius) {
        player.addMag(1); hud.setReserve(player.reserveMags)
        renderer.scene.remove(m); free.mags.splice(i, 1)
      }
    }
  ```
- `exitFree`（現 line 136-144）加清理：`free.mags.forEach(m => renderer.scene.remove(m))`。

- [ ] **Step 1: 套用上述 darkline.js 改動**（spawnMag、enterFree 補給點+容器、擊殺掉落、loop 撿取、exitFree 清理）。

- [ ] **Step 2: 跑全單元測試確認無回歸**

Run: `cd game && npm test`
Expected: PASS

- [ ] **Step 3: preview 驗證**（同 Task 7 啟動方式）
- 擊殺敵人（注入 `Math.random` 暫時回傳 0 強制掉，或連殺觸發保底）→ `__dl.free.mags.length` +1。
- 走相機到彈夾 `pickupRadius` 內（設 `cam.position`）→ 下一幀 `reserveMags` +1、`mags.length` −1、`#reserve-mags` 更新。
- 固定補給點：進 free 時 `__dl.free.mags.length` ≥ supplyPoints 數。
- 保底：連續 3 殺（高 roll）→ 第 3 殺仍掉（`killsSinceDrop` 歸 0）。

- [ ] **Step 4: Commit**

```bash
git add game/src/darkline/darkline.js
git commit -m "feat(m2): free segment — mag drops (pity) + pickups + supply points"
```

---

# Task 9: darkline rail 段 — 分軸瞬間換彈 + lock 圈軀幹中心投影

**建議模型：** Opus（整合＋preview）

**Files:**
- Modify: `game/src/darkline/darkline.js`

**做法：** rail 射擊用 `tryFireRail`（Task 7 已加）＝瞬間補滿、不耗備彈、不顯備彈匣（rail 不呼叫 setReserve）。lock 圈投影點由頭/上半身（`LOCK_RING_Y=1.4`）下移到軀幹中心（`0.9`）＝視覺包全身（圈尺寸已於 Task 6 放大）。

**接線細節：**
- rail 射擊 handler（現 line 269-292）：把 `if (!tryFire()) return` 改 `if (!tryFireRail()) return`。
- `LOCK_RING_Y`（現 line 303）：`const LOCK_RING_Y = 0.9`。
- 進 rail 段時隱藏 free 的備彈匣顯示（避免殘留）：`applySegment` 內 `enterRail` 後加 `hud.setReserve('')` 使其空白（或 `hud.setReloading(false)`）。具體在 `applySegment`（現 line 176-187）的 rail 分支後加：
  ```js
  if (seg === 'rail1' || seg === 'rail2boss') { hud.setReloading(false); const el = document.querySelector('#reserve-mags'); if (el) el.textContent = '' }
  ```

- [ ] **Step 1: 套用上述 darkline.js 改動**（rail 用 tryFireRail、LOCK_RING_Y=0.9、rail 段清空備彈顯示）。

- [ ] **Step 2: 跑全單元測試確認無回歸**

Run: `cd game && npm test`
Expected: PASS

- [ ] **Step 3: preview 驗證**（導 `darkline.html`，jumpTo `rail1`）
- rail 連開 7 槍 → 第 8 下瞬間補滿（ammo 回 7），`reserveMags` 不變（rail 不耗備彈）。
- rail 敵冒頭 → lock 圈出現、套在敵人身體中段（非頭頂）、尺寸 40→100px 隨倒數收縮、綠→黃→紅變色。
- rail 段 `#reserve-mags` 空白（不顯示備彈）。
- 小兵：身體 2 發死、爆頭 1 發即死。

- [ ] **Step 4: Commit**

```bash
git add game/src/darkline/darkline.js
git commit -m "feat(m2): rail split-axis — instant reload + lock rings centred on torso"
```

---

# 驗收（對 spec §驗收標準）

- free：彈藥有限、爆頭最省、緊但不卡關（掉落保底＋補給點撐得過）、HUD 備彈正確、換彈空檔有張力。
- rail：瞬間換彈＋紅圈倒數壓力；小兵身體 2 發、爆頭 1 發。
- 部位模型 rail／free 一致；手＝繳械不致死、腿＝低傷不致死。
- lock 圈放大且包全身。
- `cd game && npm test` 全綠 ＋ preview 端到端無 error。

# 帶進後續（本次不做）

- 多武器／武器庫（Duke3D 武器升級）。
- rail 段彈藥拾取/補給（分軸：rail 維持無限瞬間換彈）。
- 近戰系統。
- leg 減速的實際移動效果（首版只設 `slowed` 旗標；移動減速可在 WanderAI 後續接）。
- free 可見敵彈丸已有（`BulletField`）沿用。

---

*本 plan 基於 2026-06-16 spec；逐 task 走 subagent-driven-development 或 executing-plans，每 task 一 commit，照用戶 commit-then-review 節奏。*
