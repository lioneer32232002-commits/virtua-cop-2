import { describe, it, expect } from 'vitest'
import { buildOriginalEnvironment, TAIPEI1950S_PRESET, HARBOR_PRESET } from '../../src/scene/OriginalEnvironment.js'

describe('darkline rail presets', () => {
  it('exposes taipei1950s + harbor preset configs with street dims', () => {
    for (const p of [TAIPEI1950S_PRESET, HARBOR_PRESET]) {
      expect(p).toHaveProperty('seed')
      expect(p).toHaveProperty('zStart'); expect(p).toHaveProperty('zEnd')
      expect(p.zStart).toBeGreaterThan(p.zEnd)
    }
  })
  it('builds a deterministic group from a preset (a named ground mesh present)', () => {
    const g = buildOriginalEnvironment(TAIPEI1950S_PRESET)
    expect(g.getObjectByName('ground')).toBeTruthy()
    // determinism: same seed → same child count
    expect(buildOriginalEnvironment(TAIPEI1950S_PRESET).children.length).toBe(g.children.length)
  })
})
