import { describe, it, expect } from 'vitest'
import { moveDelta } from '../../../src/darkline/m0/FreeRoamController.js'

describe('moveDelta', () => {
  it('moves along -z when facing yaw=0 and pressing forward', () => {
    const d = moveDelta({ forward: true }, 0, 3, 0.5)  // yaw 0, speed 3, dt .5
    expect(d.dx).toBeCloseTo(0, 5)
    expect(d.dz).toBeCloseTo(-1.5, 5)
  })
  it('strafes along +x when facing yaw=0 and pressing right', () => {
    const d = moveDelta({ right: true }, 0, 3, 0.5)
    expect(d.dx).toBeCloseTo(1.5, 5)
    expect(d.dz).toBeCloseTo(0, 5)
  })
})
