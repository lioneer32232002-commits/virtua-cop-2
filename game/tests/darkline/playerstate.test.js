import { describe, it, expect } from 'vitest'
import { PlayerState } from '../../src/darkline/core/PlayerState.js'

describe('PlayerState (darkline 玩家狀態)', () => {
  it('starts at full hp/ammo for the M1911 loadout', () => {
    const p = new PlayerState({ maxHealth: 5, maxAmmo: 7 })
    expect(p.health).toBe(5)
    expect(p.ammo).toBe(7)
    expect(p.isDead).toBe(false)
  })

  it('defaults to 5 hp / 7 ammo with no config', () => {
    const p = new PlayerState()
    expect(p.maxHealth).toBe(5)
    expect(p.maxAmmo).toBe(7)
  })

  it('takeDamage reduces hp and reports death at 0', () => {
    const p = new PlayerState({ maxHealth: 2, maxAmmo: 7 })
    expect(p.takeDamage(1)).toBe(false)
    expect(p.health).toBe(1)
    expect(p.takeDamage(1)).toBe(true)   // dead
    expect(p.health).toBe(0)
    expect(p.isDead).toBe(true)          // state machine flipped to DEAD
  })

  it('consumeAmmo fails when empty; reload refills', () => {
    const p = new PlayerState({ maxHealth: 5, maxAmmo: 1 })
    expect(p.consumeAmmo()).toBe(true)
    expect(p.consumeAmmo()).toBe(false)
    p.reload()
    expect(p.ammo).toBe(1)
  })
})
