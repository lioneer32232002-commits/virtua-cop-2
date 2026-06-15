import { describe, it, expect } from 'vitest'
import { clampToRoom } from '../../../src/darkline/m0/clamp.js'

const ROOM = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }

describe('clampToRoom', () => {
  it('keeps an in-bounds point unchanged', () => {
    expect(clampToRoom({ x: 1, z: -2 }, ROOM, [], 0.3)).toEqual({ x: 1, z: -2 })
  })
  it('clamps past a wall, accounting for radius', () => {
    expect(clampToRoom({ x: 9, z: 0 }, ROOM, [], 0.3)).toEqual({ x: 4.7, z: 0 })
  })
  it('pushes the point out of a box obstacle along the smaller overlap axis', () => {
    const obs = [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }]
    // entering from the right, small x-overlap → pushed to +x face + radius
    const r = clampToRoom({ x: 0.9, z: 0 }, ROOM, obs, 0.3)
    expect(r.x).toBeCloseTo(1.3, 5)
    expect(r.z).toBe(0)
  })
})
