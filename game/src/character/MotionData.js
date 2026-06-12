// Loader for the extracted MOTCMN.BIN motion pack (assets/common/motions.bin)
// and the EXE character→parts table (assets/common/characters.json).
// Pack layout (see tools/extract-stage-assets/lib/motion-pack.mjs):
//   u32 motionCount
//   u32 × motionCount   frame count per motion
//   per motion: [F × Vec3 float32 root position][F × 40 int16 rotation]

export const ROT_CHANNELS = 40
// Original engine angle convention: int16 full scale = ±180°.
export const INT16_TO_RAD = Math.PI / 32768

/**
 * @param {ArrayBuffer} buf
 * @returns {{ frames: number, root: Float32Array, rot: Int16Array }[]}
 *   root is F×3 floats, rot is F×40 raw int16 (× INT16_TO_RAD for radians).
 */
export function parseMotionPack(buf) {
  const dv = new DataView(buf)
  const count = dv.getUint32(0, true)
  const frameCounts = []
  for (let i = 0; i < count; i++) frameCounts.push(dv.getUint32(4 + i * 4, true))
  let off = 4 + count * 4
  return frameCounts.map((frames) => {
    const root = new Float32Array(frames * 3)
    for (let i = 0; i < root.length; i++) {
      root[i] = dv.getFloat32(off, true)
      off += 4
    }
    const rot = new Int16Array(frames * ROT_CHANNELS)
    for (let i = 0; i < rot.length; i++) {
      rot[i] = dv.getInt16(off, true)
      off += 2
    }
    return { frames, root, rot }
  })
}

/**
 * Fetch and parse both motion assets. Returns null when the extracted files
 * are missing (assets are gitignored) so callers can fall back gracefully.
 * @returns {Promise<{ motions: ReturnType<typeof parseMotionPack>,
 *   characters: { index: number, parts: { model: number, stage: boolean }[] }[] }|null>}
 */
export async function loadMotionData() {
  const [binResp, charResp] = await Promise.all([
    fetch('/assets/common/motions.bin'),
    fetch('/assets/common/characters.json'),
  ])
  if (!binResp.ok || !charResp.ok) return null
  const [buf, json] = await Promise.all([binResp.arrayBuffer(), charResp.json()])
  return { motions: parseMotionPack(buf), characters: json.characters }
}
