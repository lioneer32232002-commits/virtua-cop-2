import { describe, it, expect } from 'vitest'
import { parseMotionPack, INT16_TO_RAD, ROT_CHANNELS } from '../src/character/MotionData.js'

// Build a motions.bin payload: u32 count, u32 frames per motion,
// then per motion [F × Vec3 float32 root][F × 40 int16 rot].
function buildPack(frameCounts) {
  const total = frameCounts.reduce((s, f) => s + f, 0)
  const buf = new ArrayBuffer(4 + frameCounts.length * 4 + total * (12 + ROT_CHANNELS * 2))
  const dv = new DataView(buf)
  dv.setUint32(0, frameCounts.length, true)
  frameCounts.forEach((f, i) => dv.setUint32(4 + i * 4, f, true))
  let off = 4 + frameCounts.length * 4
  frameCounts.forEach((F, m) => {
    for (let f = 0; f < F; f++) {
      dv.setFloat32(off, m + f, true)        // x
      dv.setFloat32(off + 4, 0.5 * f, true)  // y
      dv.setFloat32(off + 8, -f, true)       // z
      off += 12
    }
    for (let f = 0; f < F; f++) {
      for (let c = 0; c < ROT_CHANNELS; c++) {
        dv.setInt16(off, m * 1000 + f * 10 + c, true)
        off += 2
      }
    }
  })
  return buf
}

describe('parseMotionPack', () => {
  it('parses motion count, frame counts and per-frame data', () => {
    const motions = parseMotionPack(buildPack([2, 3]))
    expect(motions).toHaveLength(2)
    expect(motions[0].frames).toBe(2)
    expect(motions[1].frames).toBe(3)
    // motion 1, frame 2: root = (1+2, 1.0, -2)
    expect(motions[1].root[2 * 3 + 0]).toBe(3)
    expect(motions[1].root[2 * 3 + 1]).toBe(1)
    expect(motions[1].root[2 * 3 + 2]).toBe(-2)
    // motion 1, frame 2, channel 5 = 1000 + 20 + 5
    expect(motions[1].rot[2 * ROT_CHANNELS + 5]).toBe(1025)
  })

  it('exposes the int16→radians conversion used by the original engine', () => {
    expect(32768 * INT16_TO_RAD).toBeCloseTo(Math.PI)
  })
})
