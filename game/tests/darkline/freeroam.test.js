// game/tests/darkline/freeroam.test.js
import { describe, it, expect } from 'vitest'
import { moveDelta } from '../../src/darkline/free/FreeRoamController.js'

describe('moveDelta', () => {
  it('moves along -z when facing yaw=0 and pressing forward', () => {
    const d = moveDelta({ forward: true }, 0, 3, 0.5)
    expect(d.dx).toBeCloseTo(0, 5)
    expect(d.dz).toBeCloseTo(-1.5, 5)
  })
  it('strafes along +x when facing yaw=0 and pressing right', () => {
    const d = moveDelta({ right: true }, 0, 3, 0.5)
    expect(d.dx).toBeCloseTo(1.5, 5)
    expect(d.dz).toBeCloseTo(0, 5)
  })
  it('returns zero with no keys', () => {
    expect(moveDelta({}, 0, 3, 0.5)).toEqual({ dx: 0, dz: 0 })
  })
})
