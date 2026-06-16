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
