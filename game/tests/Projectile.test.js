import {
  Projectile, flightTimeFor, rollHit, aimPoint,
  HIT_RATE_BY_DIFFICULTY, PROJECTILE_SPEED, MISS_OFFSET,
} from '../src/gameplay/Projectile.js'

describe('flightTimeFor', () => {
  it('scales linearly with distance at the projectile speed', () => {
    expect(flightTimeFor(PROJECTILE_SPEED)).toBeCloseTo(1)   // 25u at 25u/s = 1s
  })
  it('clamps a near shot to the 0.4s floor', () => {
    expect(flightTimeFor(1)).toBe(0.4)
  })
  it('clamps a far shot to the 1s ceiling', () => {
    expect(flightTimeFor(1000)).toBe(1)
  })
})

describe('rollHit', () => {
  it('hits when the roll falls under the hit rate', () => {
    expect(rollHit(0.7, () => 0.5)).toBe(true)
  })
  it('misses when the roll is at or above the hit rate', () => {
    expect(rollHit(0.7, () => 0.7)).toBe(false)
    expect(rollHit(0.7, () => 0.95)).toBe(false)
  })
  it('exposes the placeholder per-difficulty rates (exact original unknown)', () => {
    expect(HIT_RATE_BY_DIFFICULTY).toEqual({ easy: 0.5, normal: 0.7, hard: 0.9 })
  })
})

describe('Projectile', () => {
  const shot = (willHit) => new Projectile({
    origin: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 10 }, willHit, // dist 10 → 0.4s
  })

  it('derives its flight time from the origin→target distance', () => {
    const p = new Projectile({ origin: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 25 }, willHit: true })
    expect(p.flightTime).toBeCloseTo(1)
  })

  it('arrives only once the flight time has elapsed', () => {
    const p = shot(true)
    p.update(0.3)
    expect(p.arrived).toBe(false)
    p.update(0.2)               // 0.5 > 0.4
    expect(p.arrived).toBe(true)
  })

  it('carries the hit/miss verdict decided at fire time (deterministic)', () => {
    expect(shot(true).willHit).toBe(true)
    expect(shot(false).willHit).toBe(false)
  })

  it('a cancelled projectile never arrives and is done', () => {
    const p = shot(true)
    p.cancel()
    p.update(1)
    expect(p.arrived).toBe(false)
    expect(p.isDone()).toBe(true)
  })

  it('progress runs 0→1 (clamped) and position lerps origin→target', () => {
    const p = shot(true)        // 0.4s flight
    p.update(0.2)               // halfway
    expect(p.progress).toBeCloseTo(0.5)
    expect(p.position.z).toBeCloseTo(5)
    p.update(1)                 // well past arrival
    expect(p.progress).toBe(1)
    expect(p.position.z).toBeCloseTo(10)
  })

  it('a shot-down projectile is done and never arrives (the player blew it up)', () => {
    const p = shot(true)        // would have hit
    p.shootDown()
    p.update(1)
    expect(p.arrived).toBe(false)
    expect(p.shotDown).toBe(true)
    expect(p.isDone()).toBe(true)
  })
})

describe('aimPoint', () => {
  it('a hit aims dead at the camera', () => {
    expect(aimPoint({ x: 1, y: 2, z: 3 }, { x: 1, z: 0 }, true)).toEqual({ x: 1, y: 2, z: 3 })
  })
  it('a miss is offset sideways along the camera-right (passes beside, not through)', () => {
    const t = aimPoint({ x: 0, y: 2, z: 0 }, { x: 1, z: 0 }, false)
    expect(t.x).toBeCloseTo(MISS_OFFSET)   // pushed to the side
    expect(t.z).toBeCloseTo(0)
    expect(t.y).toBe(2)                    // same height — just to the side
  })
})
