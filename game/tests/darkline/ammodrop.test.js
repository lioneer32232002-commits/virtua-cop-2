import { describe, it, expect } from 'vitest'
import { rollMagDrop } from '../../src/darkline/combat/ammoDrop.js'

describe('rollMagDrop', () => {
  it('drops when the rng roll is under dropRate', () => {
    const r = rollMagDrop({ killsSinceDrop: 0, dropRate: 0.4, pityThreshold: 3 }, () => 0.1)
    expect(r.drop).toBe(true)
  })
  it('does not drop when the rng roll is above dropRate (pity not reached)', () => {
    const r = rollMagDrop({ killsSinceDrop: 0, dropRate: 0.4, pityThreshold: 3 }, () => 0.9)
    expect(r.drop).toBe(false)
  })
  it('force-drops at the pity threshold regardless of the roll', () => {
    // 2 dry kills already → this (the 3rd) is guaranteed even on a high roll
    const r = rollMagDrop({ killsSinceDrop: 2, dropRate: 0.4, pityThreshold: 3 }, () => 0.99)
    expect(r.drop).toBe(true)
  })
})
