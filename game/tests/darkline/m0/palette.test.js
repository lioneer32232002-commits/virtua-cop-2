import { describe, it, expect } from 'vitest'
import { nearestColor, quantize } from '../../../src/darkline/m0/palette.js'

const PAL = [ [0,0,0], [255,255,255], [200,30,30] ] // 黑/白/紅

describe('nearestColor', () => {
  it('maps a near-black pixel to black', () => {
    expect(nearestColor([10, 8, 5], PAL)).toEqual([0, 0, 0])
  })
  it('maps a near-red pixel to the red entry', () => {
    expect(nearestColor([180, 40, 35], PAL)).toEqual([200, 30, 30])
  })
})

describe('quantize', () => {
  it('rewrites every pixel to a palette entry, preserving alpha', () => {
    // 1 white-ish + 1 red-ish pixel, both fully opaque
    const img = { width: 2, height: 1, data: new Uint8ClampedArray([
      250,250,250,255,  190,35,30,255,
    ]) }
    const out = quantize(img, PAL)
    expect([...out.data]).toEqual([255,255,255,255,  200,30,30,255])
  })
  it('leaves fully transparent pixels untouched', () => {
    const img = { width: 1, height: 1, data: new Uint8ClampedArray([123,45,67,0]) }
    const out = quantize(img, PAL)
    expect(out.data[3]).toBe(0)
  })
})
