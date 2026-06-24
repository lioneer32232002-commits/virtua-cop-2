// game/tests/darkline/alley.test.js
import { describe, it, expect } from 'vitest'
import { buildAlleyLayout, buildAlleyGroup } from '../../src/darkline/free/AlleyScene.js'

describe('buildAlleyLayout', () => {
  it('returns L-shaped room segments, obstacles, and the key points', () => {
    const lay = buildAlleyLayout(42)
    expect(lay.segments.length).toBeGreaterThanOrEqual(2)   // L = 2+ arms
    expect(Array.isArray(lay.obstacles)).toBe(true)
    expect(lay.entry).toHaveProperty('x'); expect(lay.entry).toHaveProperty('z')
    expect(lay.exitTrigger).toMatchObject({ minX: expect.any(Number), maxZ: expect.any(Number) })
    expect(lay.enemySpawns.length).toBeGreaterThanOrEqual(2)
    expect(lay.intel).toHaveProperty('x')
    expect(lay.scrap).toHaveProperty('x'); expect(lay.scrap).toHaveProperty('z')
    expect(lay.innocent).toHaveProperty('x')
  })
  it('is deterministic for a given seed', () => {
    expect(buildAlleyLayout(7)).toEqual(buildAlleyLayout(7))
  })
  it('places the scrap (key) nearer the entry than the intel point', () => {
    const lay = buildAlleyLayout(1953)
    // 玩家從 entry(z≈-1) 往 -z 走 → z 較大（較不負）者較早遇到；紙片應比密件早。
    expect(lay.scrap.z).toBeGreaterThan(lay.intel.z)
  })
})

describe('alley keeper-vocab upgrade', () => {
  it('walls are shaded boxes (multi-material), not flat single-material', () => {
    const g = buildAlleyGroup(buildAlleyLayout(1))
    const shaded = g.children.filter(c => c.isMesh && Array.isArray(c.material) && c.material.length === 6)
    expect(shaded.length).toBeGreaterThanOrEqual(2) // at least the two side walls
  })
  it('has a lit-window mesh and at least one streetlight group', () => {
    const g = buildAlleyGroup(buildAlleyLayout(1))
    const hasWindows = g.children.some(c => c.isMesh && c.geometry?.getAttribute?.('color'))
    const hasLamp = g.children.some(c => c.isGroup && c.children.length === 2)
    expect(hasWindows).toBe(true)
    expect(hasLamp).toBe(true)
  })
  it('windows are actually lit (deterministic () => 0.3 keeps the alley aglow)', () => {
    const g = buildAlleyGroup(buildAlleyLayout(1))
    const windows = g.children.find(c => c.name === 'alley_windows')
    expect(windows).toBeTruthy()
    // rng () => 0.3: 0.3 < 0.45 → every pane lit; hue index (0.3*3)|0 = 0 → WINDOW_LIT[0] = 0xffe6a8 (r=1.0).
    // A regression to a dim/real rng would drop the first vertex's red toward WINDOW_DARK's ~0.11.
    expect(windows.geometry.getAttribute('color').getX(0)).toBeCloseTo(1.0, 2)
  })
  it('keeps the floor at y=0 and closes the alley tail with a backdrop', () => {
    const g = buildAlleyGroup(buildAlleyLayout(1))
    const floor = g.children.find(c => c.isMesh && c.geometry?.type === 'PlaneGeometry' && Math.abs(c.position.y) < 1e-6)
    expect(floor).toBeTruthy()                                    // grounding plane still at street level
    const shaded = g.children.filter(c => c.isMesh && Array.isArray(c.material) && c.material.length === 6)
    expect(shaded.length).toBeGreaterThanOrEqual(3)               // 2 walls + tail backdrop (+ stalls)
  })
})
