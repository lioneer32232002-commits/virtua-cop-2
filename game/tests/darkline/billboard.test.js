// game/tests/darkline/billboard.test.js
import { describe, it, expect } from 'vitest'
import { frameUV, angleToColumn } from '../../src/darkline/combat/BillboardSprite.js'

describe('frameUV', () => {
  it('returns offset/repeat for a 4-col x 2-row sheet, cell (col=1,row=0)', () => {
    expect(frameUV(1, 0, 4, 2)).toEqual({ ox: 0.25, oy: 0.5, rx: 0.25, ry: 0.5 })
  })
})

describe('angleToColumn', () => {
  it('maps relative angle 0 (facing camera) to column 0', () => {
    expect(angleToColumn(0, 8)).toBe(0)
  })
  it('wraps negative angles into range', () => {
    expect(angleToColumn(-Math.PI / 4 + 0.001, 8)).toBe(7)
  })
})
