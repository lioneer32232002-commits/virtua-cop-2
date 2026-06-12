import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeMotionPack, decodeMotionPack } from '../lib/motion-pack.mjs'
import { ROT_CHANNELS } from '../lib/motion-reader.mjs'

function makeMotion(frames, seed) {
  const root = []
  const rot = []
  for (let f = 0; f < frames; f++) {
    root.push({ x: seed + f, y: f * 0.5, z: -f })
    const ch = new Int16Array(ROT_CHANNELS)
    for (let c = 0; c < ROT_CHANNELS; c++) ch[c] = (seed * 100 + f * 10 + c) % 32768
    rot.push(ch)
  }
  return { root, rot }
}

test('encodeMotionPack writes header, directory and per-frame data', () => {
  const motions = [makeMotion(2, 1), makeMotion(3, 2)]
  const buf = encodeMotionPack(motions)
  // header: u32 motionCount, then u32 frames per motion
  assert.equal(buf.readUInt32LE(0), 2)
  assert.equal(buf.readUInt32LE(4), 2)
  assert.equal(buf.readUInt32LE(8), 3)
  // data: per motion [F×3 float32 root][F×40 int16 rot]
  const expected = 4 + 2 * 4 + (2 + 3) * (12 + ROT_CHANNELS * 2)
  assert.equal(buf.length, expected)
  // motion 0 frame 1 root.x
  assert.equal(buf.readFloatLE(12 + 12), 2)
})

test('decodeMotionPack round-trips encodeMotionPack', () => {
  const motions = [makeMotion(2, 1), makeMotion(5, 3)]
  const out = decodeMotionPack(encodeMotionPack(motions))
  assert.equal(out.length, 2)
  assert.equal(out[0].root.length, 2)
  assert.equal(out[1].root.length, 5)
  assert.deepEqual(out[1].root[4], { x: 7, y: 2, z: -4 })
  assert.deepEqual([...out[1].rot[2]], [...motions[1].rot[2]])
})
