import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { shadedBox, flatStrip, streetlight, pushWindows, WINDOW_LIT, LAMP_COLOR } from '../../src/scene/streetKit.js'

describe('streetKit.shadedBox', () => {
  it('returns a box mesh with 6 per-face materials (fake key light)', () => {
    const m = shadedBox(2, 3, 4, 0x445566)
    expect(m).toBeInstanceOf(THREE.Mesh)
    expect(Array.isArray(m.material)).toBe(true)
    expect(m.material).toHaveLength(6)
    // +y (top, index 2) is the brightest face, -y (index 3) the darkest
    expect(m.material[2].color.getHSL({}).l).toBeGreaterThan(m.material[3].color.getHSL({}).l)
  })
})

describe('streetKit.streetlight', () => {
  it('returns a group with a pole + a lamp', () => {
    const g = streetlight(1, -5, 1)
    expect(g).toBeInstanceOf(THREE.Group)
    expect(g.children).toHaveLength(2)
  })
})

describe('streetKit.pushWindows', () => {
  it('accumulates window quad positions + colours into the acc buffers', () => {
    const acc = { pos: [], col: [] }
    let n = 0; const rng = () => (n++ % 7) / 7
    pushWindows(acc, 3, -10, 10, 12, rng)
    expect(acc.pos.length).toBeGreaterThan(0)
    expect(acc.pos.length).toBe(acc.col.length) // 1 colour triple per position triple
    expect(acc.pos.length % 9).toBe(0)           // 6 verts × 3 coords per quad = 18, a multiple of 9
  })
})

describe('streetKit palette', () => {
  it('exports the lit-window + lamp colours', () => {
    expect(Array.isArray(WINDOW_LIT)).toBe(true)
    expect(typeof LAMP_COLOR).toBe('number')
  })
})

describe('streetKit.flatStrip', () => {
  it('lies flat in the x–z plane at the given (x, y, z)', () => {
    const m = flatStrip(4, 6, 0x222222, 0.05, 1, -3)
    expect(m.rotation.x).toBe(-Math.PI / 2)
    expect(m.position.x).toBe(1)
    expect(m.position.y).toBe(0.05)
    expect(m.position.z).toBe(-3)
  })
  it('decorative strips drop out of raycasts; default strips keep theirs', () => {
    const deco = flatStrip(4, 6, 0x222222, 0.05, 0, 0, { decorative: true })
    const hits = []
    deco.raycast(new THREE.Raycaster(), hits)   // overridden no-op contributes nothing
    expect(hits).toHaveLength(0)
    expect(Object.hasOwn(deco, 'raycast')).toBe(true)                                 // decorative overrides raycast
    expect(Object.hasOwn(flatStrip(4, 6, 0x222222, 0, 0, 0), 'raycast')).toBe(false)  // default keeps the inherited one
  })
})
