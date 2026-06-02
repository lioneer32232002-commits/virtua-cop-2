import { decayRecoil } from '../src/render/WeaponViewModel.js'

describe('decayRecoil', () => {
  it('decays linearly over the given duration', () => {
    // half the duration elapsed → half the recoil gone
    expect(decayRecoil(1, 0.1, 0.2)).toBeCloseTo(0.5)
  })

  it('never goes below zero', () => {
    expect(decayRecoil(0.1, 1, 0.2)).toBe(0)
  })

  it('stays at zero when already spent', () => {
    expect(decayRecoil(0, 0.016, 0.2)).toBe(0)
  })
})
