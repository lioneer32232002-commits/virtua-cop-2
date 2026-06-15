import { describe, it, expect } from 'vitest'
import { stepAI } from '../../../src/darkline/m0/WanderAI.js'

describe('stepAI', () => {
  const cfg = { speed: 2, range: 3, fireCooldown: 1 }
  it('advances toward the player when out of range', () => {
    const s = { x: 0, z: 0, cooldown: 0 }
    const r = stepAI(s, { x: 10, z: 0 }, 0.5, cfg)
    expect(r.x).toBeCloseTo(1, 5)   // 2 u/s * 0.5s toward +x
    expect(r.fired).toBe(false)
  })
  it('stops and fires when within range and off cooldown', () => {
    const s = { x: 0, z: 0, cooldown: 0 }
    const r = stepAI(s, { x: 2, z: 0 }, 0.5, cfg)
    expect(r.x).toBe(0)             // already in range → no move
    expect(r.fired).toBe(true)
    expect(r.cooldown).toBeCloseTo(1, 5)
  })
  it('counts down cooldown without firing', () => {
    const s = { x: 0, z: 0, cooldown: 0.8 }
    const r = stepAI(s, { x: 2, z: 0 }, 0.5, cfg)
    expect(r.fired).toBe(false)
    expect(r.cooldown).toBeCloseTo(0.3, 5)
  })
  it('walks toward the player instead of firing when line of sight is blocked', () => {
    // in range (dist 2 <= 3) but no LOS → close in to find an angle, don't fire
    const s = { x: 0, z: 0, cooldown: 0 }
    const r = stepAI(s, { x: 2, z: 0 }, 0.5, cfg, false)
    expect(r.x).toBeCloseTo(1, 5)   // moved +x toward the player
    expect(r.fired).toBe(false)
  })
  it('fires in range when line of sight is clear', () => {
    const s = { x: 0, z: 0, cooldown: 0 }
    const r = stepAI(s, { x: 2, z: 0 }, 0.5, cfg, true)
    expect(r.fired).toBe(true)
    expect(r.x).toBe(0)
  })
})
