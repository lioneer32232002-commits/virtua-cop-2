import { describe, it, expect } from 'vitest'
import { segmentClearsBoxes } from '../../../src/darkline/m0/los.js'

const BOX = [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }] // 2x2 box at origin

describe('segmentClearsBoxes', () => {
  it('is clear when the segment misses every box', () => {
    // horizontal line at z=3, well above the box (maxZ=1)
    expect(segmentClearsBoxes(-3, 3, 3, 3, BOX)).toBe(true)
  })
  it('is blocked when the segment passes straight through a box', () => {
    // horizontal line at z=0 through the box centre
    expect(segmentClearsBoxes(-3, 0, 3, 0, BOX)).toBe(false)
  })
  it('is blocked when an endpoint sits inside a box', () => {
    expect(segmentClearsBoxes(0, 0, 3, 0, BOX)).toBe(false)
  })
  it('is clear when a vertical segment passes beside the box', () => {
    // x=2 is outside the box's x-range [-1,1]
    expect(segmentClearsBoxes(2, -3, 2, 3, BOX)).toBe(true)
  })
  it('is clear when there are no boxes', () => {
    expect(segmentClearsBoxes(-3, 0, 3, 0, [])).toBe(true)
  })
})
