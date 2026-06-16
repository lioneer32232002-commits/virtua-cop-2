import { describe, it, expect } from 'vitest'
import { billboardZone } from '../../src/darkline/combat/billboardZone.js'

const sprite = { x: 0, y: 0.95, z: 0 }
const opts = { worldSize: 1.9 }
// Offsets are world-space; normalised ly = offset / worldSize. The head/leg
// boundary is ±0.25 normalised, so a ±0.6 world offset (≈ ±0.316 normalised)
// clears it with margin. (A smaller ±0.4 → ±0.21 would NOT reach head/leg.)
describe('billboardZone', () => {
  it('top of the sprite is a headshot', () => {
    expect(billboardZone({ x: 0, y: 0.95 + 0.6, z: 0 }, sprite, opts)).toBe('head')
  })
  it('bottom of the sprite is a leg hit', () => {
    expect(billboardZone({ x: 0, y: 0.95 - 0.6, z: 0 }, sprite, opts)).toBe('leg')
  })
  it('mid-height outer edge is a hand (weapon) hit', () => {
    expect(billboardZone({ x: 0.5, y: 0.95, z: 0 }, sprite, opts)).toBe('hand')
  })
  it('mid-height centre is a body hit', () => {
    expect(billboardZone({ x: 0.05, y: 0.95, z: 0 }, sprite, opts)).toBe('body')
  })
})
