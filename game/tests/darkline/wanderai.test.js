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
  it('slowed enemy advances at half speed (leg hit)', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0, slowed: true }, { x: 10, z: 0 }, 0.5, cfg)
    expect(r.x).toBeCloseTo(0.5, 5)   // 2 u/s * 0.5s * 0.5 slowFactor = 0.5
    expect(r.fired).toBe(false)
  })
  it('slowFactor is configurable via cfg', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0, slowed: true }, { x: 10, z: 0 }, 0.5,
      { ...cfg, slowFactor: 0.25 })
    expect(r.x).toBeCloseTo(0.25, 5)  // 2 * 0.5 * 0.25 = 0.25
  })

  it('without windup config, fires instantly (backward compatible)', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0 }, { x: 2, z: 0 }, 0.1, cfg)
    expect(r.fired).toBe(true)
    expect(r.aiming).toBe(false)
  })
})

// 開火 tell（舉槍預警）：進射程不即射，先舉槍 wind-up 給玩家反應窗口（VC2 手感基因）。
describe('stepAI fire telegraph (wind-up)', () => {
  const cfg = { speed: 2, range: 3, fireCooldown: 1, windup: 0.5 }

  it('raises gun (aiming) without firing on the frame it decides to shoot', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0 }, { x: 2, z: 0 }, 0.1, cfg)
    expect(r.aiming).toBe(true)
    expect(r.fired).toBe(false)          // tell 先行，不即時開槍
    expect(r.x).toBe(0)                  // 舉槍就站定
    expect(r.windup).toBeCloseTo(0.5, 5) // 起手裝滿 wind-up 計時
  })

  it('keeps aiming across frames until the wind-up elapses', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0, windup: 0.5 }, { x: 2, z: 0 }, 0.2, cfg)
    expect(r.aiming).toBe(true)
    expect(r.fired).toBe(false)
    expect(r.windup).toBeCloseTo(0.3, 5)
  })

  it('fires when the wind-up reaches zero, then returns to idle', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0, windup: 0.1 }, { x: 2, z: 0 }, 0.1, cfg)
    expect(r.fired).toBe(true)
    expect(r.aiming).toBe(false)
    expect(r.windup).toBe(0)
    expect(r.cooldown).toBeCloseTo(1, 5)
  })

  it('completes the committed shot even if the player leaves range mid-wind-up', () => {
    const r = stepAI({ x: 0, z: 0, cooldown: 0, windup: 0.1 }, { x: 99, z: 0 }, 0.1, cfg)
    expect(r.fired).toBe(true)   // 槍已舉起＝承諾擊發，不因玩家跑遠而取消
    expect(r.x).toBe(0)          // 擊發格不追人
  })
})
