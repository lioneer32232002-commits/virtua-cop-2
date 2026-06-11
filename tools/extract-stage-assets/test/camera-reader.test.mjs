import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { readCammovBin } from '../lib/camera-reader.mjs'

describe('readCammovBin', () => {
  test('decodes a single frame with coordinate transform', () => {
    const buf = Buffer.alloc(16)
    buf.writeFloatLE(1.0, 0)    // cammov_x → threejs_x = -1
    buf.writeFloatLE(2.0, 4)    // y unchanged
    buf.writeFloatLE(3.0, 8)    // z unchanged
    buf.writeInt16LE(8192, 12)  // 8192/32768*180 = 45° → threejs_yaw = 180°-45° = 3π/4
    buf.writeInt16LE(0, 14)
    const frames = readCammovBin(buf)
    assert.strictEqual(frames.length, 1)
    assert.ok(Math.abs(frames[0].x - (-1.0)) < 1e-5, `x=${frames[0].x}`)
    assert.ok(Math.abs(frames[0].y - 2.0)    < 1e-5, `y=${frames[0].y}`)
    assert.ok(Math.abs(frames[0].z - 3.0)    < 1e-5, `z=${frames[0].z}`)
    assert.ok(Math.abs(frames[0].yaw_rad   - (3 * Math.PI / 4)) < 1e-5, `yaw_rad=${frames[0].yaw_rad}`)
    assert.ok(Math.abs(frames[0].pitch_rad - 0) < 1e-5, `pitch_rad=${frames[0].pitch_rad}`)
  })

  test('decodes multiple frames', () => {
    const buf = Buffer.alloc(32)
    buf.writeFloatLE(10.0, 0);  buf.writeFloatLE(0.0, 4);  buf.writeFloatLE(20.0, 8)
    buf.writeInt16LE(0, 12);    buf.writeInt16LE(0, 14)
    buf.writeFloatLE(15.0, 16); buf.writeFloatLE(5.0, 20); buf.writeFloatLE(25.0, 24)
    buf.writeInt16LE(16384, 28) // 90° → threejs_yaw = 180°-90° = π/2
    buf.writeInt16LE(0, 30)
    const frames = readCammovBin(buf)
    assert.strictEqual(frames.length, 2)
    assert.ok(Math.abs(frames[1].x - (-15.0)) < 1e-5)
    assert.ok(Math.abs(frames[1].yaw_rad - (Math.PI / 2)) < 1e-5)
  })

  test('pitch converts without negation', () => {
    const buf = Buffer.alloc(16)
    buf.writeFloatLE(0, 0); buf.writeFloatLE(0, 4); buf.writeFloatLE(0, 8)
    buf.writeInt16LE(0, 12)
    buf.writeInt16LE(8192, 14) // 45° pitch, no negation
    const frames = readCammovBin(buf)
    assert.ok(Math.abs(frames[0].pitch_rad - (Math.PI / 4)) < 1e-5)
  })
})
