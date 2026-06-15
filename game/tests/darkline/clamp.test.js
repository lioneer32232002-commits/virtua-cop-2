// game/tests/darkline/clamp.test.js
import { describe, it, expect } from 'vitest'
import { clampToSegments } from '../../src/darkline/free/clamp.js'

// L 形巷弄：縱向長段 + 橫向轉折段（在右下角相接）
const ARM_A = { minX: -2, maxX: 2, minZ: -20, maxZ: 0 }   // 縱向主巷
const ARM_B = { minX: -2, maxX: 8, minZ: -20, maxZ: -16 }  // 轉折往 +x

describe('clampToSegments', () => {
  it('keeps an in-bounds point unchanged', () => {
    expect(clampToSegments({ x: 0, z: -5 }, [ARM_A], [], 0.3)).toEqual({ x: 0, z: -5 })
  })
  it('clamps past a wall accounting for radius', () => {
    expect(clampToSegments({ x: 9, z: -5 }, [ARM_A], [], 0.3)).toEqual({ x: 1.7, z: -5 })
  })
  it('lets the mover into the L-bend arm (union of segments)', () => {
    // x=6,z=-18 is outside ARM_A but inside ARM_B → stays
    expect(clampToSegments({ x: 6, z: -18 }, [ARM_A, ARM_B], [], 0.3)).toEqual({ x: 6, z: -18 })
  })
  it('pushes the point out of a box obstacle along the smaller overlap axis', () => {
    const obs = [{ minX: -1, maxX: 1, minZ: -6, maxZ: -4 }]
    const r = clampToSegments({ x: 0.9, z: -5 }, [ARM_A], obs, 0.3)
    expect(r.x).toBeCloseTo(1.3, 5)
    expect(r.z).toBe(-5)
  })
})
