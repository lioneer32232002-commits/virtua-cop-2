// motions.bin pack format consumed by the game's MotionData loader:
//   u32 motionCount
//   u32 × motionCount   frame count per motion
//   per motion: [F × Vec3 float32 root position][F × 40 int16 rotation]
// Rotations stay raw int16 (full scale = ±180°) to keep the file faithful
// to MOTCMN.BIN; the game converts with INT16_TO_RAD.
import { ROT_CHANNELS } from './motion-reader.mjs'

const FRAME_BYTES = 12 + ROT_CHANNELS * 2

/** @param {{ root: {x,y,z}[], rot: Int16Array[] }[]} motions */
export function encodeMotionPack(motions) {
  const totalFrames = motions.reduce((s, m) => s + m.root.length, 0)
  const buf = Buffer.alloc(4 + motions.length * 4 + totalFrames * FRAME_BYTES)
  buf.writeUInt32LE(motions.length, 0)
  motions.forEach((m, i) => buf.writeUInt32LE(m.root.length, 4 + i * 4))
  let off = 4 + motions.length * 4
  for (const m of motions) {
    for (const r of m.root) {
      buf.writeFloatLE(r.x, off)
      buf.writeFloatLE(r.y, off + 4)
      buf.writeFloatLE(r.z, off + 8)
      off += 12
    }
    for (const ch of m.rot) {
      for (let c = 0; c < ROT_CHANNELS; c++) {
        buf.writeInt16LE(ch[c], off)
        off += 2
      }
    }
  }
  return buf
}

/** @param {Buffer} buf @returns {{ root: {x,y,z}[], rot: Int16Array[] }[]} */
export function decodeMotionPack(buf) {
  const count = buf.readUInt32LE(0)
  const frames = []
  for (let i = 0; i < count; i++) frames.push(buf.readUInt32LE(4 + i * 4))
  let off = 4 + count * 4
  return frames.map((F) => {
    const root = []
    for (let f = 0; f < F; f++) {
      root.push({ x: buf.readFloatLE(off), y: buf.readFloatLE(off + 4), z: buf.readFloatLE(off + 8) })
      off += 12
    }
    const rot = []
    for (let f = 0; f < F; f++) {
      const ch = new Int16Array(ROT_CHANNELS)
      for (let c = 0; c < ROT_CHANNELS; c++) {
        ch[c] = buf.readInt16LE(off)
        off += 2
      }
      rot.push(ch)
    }
    return { root, rot }
  })
}
