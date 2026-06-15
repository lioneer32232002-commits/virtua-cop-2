// game/tests/darkline/alley.test.js
import { describe, it, expect } from 'vitest'
import { buildAlleyLayout } from '../../src/darkline/free/AlleyScene.js'

describe('buildAlleyLayout', () => {
  it('returns L-shaped room segments, obstacles, and the key points', () => {
    const lay = buildAlleyLayout(42)
    expect(lay.segments.length).toBeGreaterThanOrEqual(2)   // L = 2+ arms
    expect(Array.isArray(lay.obstacles)).toBe(true)
    expect(lay.entry).toHaveProperty('x'); expect(lay.entry).toHaveProperty('z')
    expect(lay.exitTrigger).toMatchObject({ minX: expect.any(Number), maxZ: expect.any(Number) })
    expect(lay.enemySpawns.length).toBeGreaterThanOrEqual(2)
    expect(lay.intel).toHaveProperty('x')
    expect(lay.innocent).toHaveProperty('x')
  })
  it('is deterministic for a given seed', () => {
    expect(buildAlleyLayout(7)).toEqual(buildAlleyLayout(7))
  })
})
