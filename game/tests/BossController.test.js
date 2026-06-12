import { BossController } from '../src/gameplay/BossController.js'

describe('BossController', () => {
  it('starts in phase 1 at full health', () => {
    const b = new BossController({ hp: 12 }, { phases: 3 })
    expect(b.phase).toBe(1)
    expect(b.update()).toBe(1)
  })

  it('advances phase as health crosses thresholds, firing onPhase once each', () => {
    const seen = []
    const boss = { hp: 12 }
    const b = new BossController(boss, { phases: 3, onPhase: p => seen.push(p) })
    b.update()                 // 100% → phase 1
    boss.hp = 7; b.update()    // 58% → phase 2
    boss.hp = 7; b.update()    // still 58% → no new transition
    boss.hp = 3; b.update()    // 25% → phase 3
    boss.hp = 0; b.update()    // 0% → still phase 3 (capped)
    expect(seen).toEqual([2, 3])
    expect(b.phase).toBe(3)
  })

  it('exposes the hp fraction for the health bar', () => {
    const boss = { hp: 12 }
    const b = new BossController(boss, { phases: 3 })
    expect(b.hpFraction).toBe(1)
    boss.hp = 6
    expect(b.hpFraction).toBeCloseTo(0.5)
    boss.hp = -3                // never negative
    expect(b.hpFraction).toBe(0)
  })
})
