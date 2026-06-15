// game/tests/darkline/aimassist.test.js
import { describe, it, expect } from 'vitest'
import { assistAim } from '../../src/darkline/combat/aimAssist.js'

describe('assistAim', () => {
  const opts = { radius: 0.2, strength: 0.5 }
  it('returns the crosshair unchanged when no target is in range', () => {
    expect(assistAim({ x: 0, y: 0 }, [{ x: 0.9, y: 0 }], opts)).toEqual({ x: 0, y: 0 })
  })
  it('nudges toward a target within radius by strength', () => {
    const r = assistAim({ x: 0, y: 0 }, [{ x: 0.1, y: 0 }], opts)
    expect(r.x).toBeCloseTo(0.05, 5)   // halfway (strength 0.5)
    expect(r.y).toBeCloseTo(0, 5)
  })
  it('picks the nearest of several candidates', () => {
    const r = assistAim({ x: 0, y: 0 }, [{ x: 0.18, y: 0 }, { x: 0.06, y: 0 }], opts)
    expect(r.x).toBeCloseTo(0.03, 5)   // nudges toward the 0.06 one
  })
  it('strength 0 disables assist', () => {
    const r = assistAim({ x: 0, y: 0 }, [{ x: 0.1, y: 0 }], { radius: 0.2, strength: 0 })
    expect(r).toEqual({ x: 0, y: 0 })
  })
})
