const FRAME_SIZE = 16
const DEG_TO_RAD = Math.PI / 180

/**
 * @param {Buffer} buf  raw bytes of a CAMMOV*.BIN file
 * @returns {{ x, y, z, yaw_rad, pitch_rad }[]}
 */
export function readCammovBin(buf) {
  const frameCount = Math.floor(buf.length / FRAME_SIZE)
  const frames = []
  for (let i = 0; i < frameCount; i++) {
    const off = i * FRAME_SIZE
    const x        = buf.readFloatLE(off)
    const y        = buf.readFloatLE(off + 4)
    const z        = buf.readFloatLE(off + 8)
    const yawInt   = buf.readInt16LE(off + 12)
    const pitchInt = buf.readInt16LE(off + 14)
    const yaw_deg   = yawInt   / 32768 * 180
    const pitch_deg = pitchInt / 32768 * 180
    // Mirroring X (to match the model extractor) maps yaw θ → 180° − θ.
    // Verified empirically: with this conversion the camera faces its
    // direction of travel along the whole stage-1 path (avg dot ≈ +0.8).
    frames.push({
      x:         -x,
      y,
      z,
      yaw_rad:   Math.PI - yaw_deg * DEG_TO_RAD,
      pitch_rad: pitch_deg * DEG_TO_RAD,
    })
  }
  return frames
}
