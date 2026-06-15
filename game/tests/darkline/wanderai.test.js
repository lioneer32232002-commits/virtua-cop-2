// game/tests/darkline/wanderai.test.js
import { describe, it, expect } from 'vitest'
import { stepAI } from '../../src/darkline/free/WanderAI.js'

describe('stepAI', () => {
  const cfg = { speed: 2, range: 3, fireCooldown: 1 }
  it('advances toward the player when out of range', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0 }, { x: 10, z: 0 }, 0.5, cfg)
    expect(r.x).toBeCloseTo(1, 5)   // 2 u/s * 0.5s toward +x
    expect(r.fired).toBe(false)
  })
  it('stops and fires when within range and off cooldown', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0 }, { x: 2, z: 0 }, 0.5, cfg)
    expect(r.x).toBe(0)             // in range → no move
    expect(r.fired).toBe(true)
    expect(r.cooldown).toBeCloseTo(1, 5)
  })
  it('counts down cooldown without firing', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0.8 }, { x: 2, z: 0 }, 0.5, cfg)
    expect(r.fired).toBe(false)
    expect(r.cooldown).toBeCloseTo(0.3, 5)
  })
})
