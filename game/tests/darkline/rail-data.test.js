import { describe, it, expect } from 'vitest'
import { MISSION } from '../../src/darkline/mission/missions/first-island-chain.js'

describe('rail segment data', () => {
  for (const key of ['rail1', 'rail2boss']) {
    it(`${key} has a multi-point path, a duration, and waves`, () => {
      const r = MISSION[key]
      expect(r.path.length).toBeGreaterThanOrEqual(2)
      expect(r.duration).toBeGreaterThan(0)
      expect(r.waves.length).toBeGreaterThanOrEqual(1)
      for (const w of r.waves) {
        expect(w).toHaveProperty('time')
        expect(Array.isArray(w.enemies)).toBe(true)
      }
    })
  }
  it('rail2boss declares a boss', () => {
    expect(MISSION.rail2boss.boss).toMatchObject({ hp: expect.any(Number) })
  })
})
